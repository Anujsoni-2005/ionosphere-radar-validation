import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Goose Bay Phased-Array Radar API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model and Data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ionosphere_svm_pipeline.pkl")
DATA_URL = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/ionosphere.csv"

pulse_cols = [f"a{i:02d}" for i in range(1, 35)]
cols = pulse_cols + ["target"]

LOCAL_CSV = os.path.join(BASE_DIR, "ionosphere.csv")

print("[API] Ingesting UCI Ionosphere dataset...")
if os.path.exists(LOCAL_CSV):
    print(f"[API] Loading dataset from local file '{LOCAL_CSV}'...")
    df_raw = pd.read_csv(LOCAL_CSV, header=None, names=cols)
else:
    try:
        df_raw = pd.read_csv(DATA_URL, header=None, names=cols)
    except Exception:
        from sklearn.datasets import fetch_openml
        data = fetch_openml(name="ionosphere", version=1, as_frame=True)
        df_raw = data.frame.copy()
        df_raw.columns = cols

y_all = df_raw["target"].astype(str).str.lower().map({"g": 1, "b": 0, "1": 1, "0": 0}).astype(int)

# Load trained model or train fallback
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print(f"[API] Loaded tuned SVM model from {MODEL_PATH}")
else:
    print("[API] Model pkl not found. Training RBF-SVM...")
    from train_and_evaluate import preprocess_and_engineer, tune_best_svm
    from sklearn.model_selection import train_test_split
    X_feat, y_labels, _ = preprocess_and_engineer(df_raw)
    X_tr, X_te, y_tr, y_te = train_test_split(X_feat, y_labels, test_size=0.2, stratify=y_labels, random_state=42)
    model = tune_best_svm(X_tr, X_te, y_tr, y_te)
    joblib.dump(model, MODEL_PATH)

def compute_physics(features_dict: dict) -> pd.DataFrame:
    df_sample = pd.DataFrame([features_dict])
    real_cols = [f"a{i:02d}" for i in range(1, 35, 2)]
    imag_cols = [f"a{i:02d}" for i in range(2, 35, 2)]

    R = df_sample[real_cols].values.astype(float)
    I = df_sample[imag_cols].values.astype(float)

    amplitudes = np.sqrt(R**2 + I**2)
    df_sample["mean_pulse_amplitude"] = np.mean(amplitudes, axis=1)
    df_sample["std_pulse_amplitude"] = np.std(amplitudes, axis=1)
    df_sample["lag_smoothness"] = np.mean(np.abs(np.diff(R, axis=1)), axis=1)

    if "a02" in df_sample.columns:
        df_sample.drop(columns=["a02"], inplace=True)
    return df_sample

class ValidateRequest(BaseModel):
    features: List[float] # 34 pulse features
    noise_sigma: Optional[float] = 0.0
    attenuation_pct: Optional[float] = 0.0
    threshold: Optional[float] = 0.50

@app.get("/api/signals/count")
def get_signal_count():
    return {"total": len(df_raw)}

@app.get("/api/signals/{signal_id}")
def get_signal(signal_id: int):
    if signal_id < 0 or signal_id >= len(df_raw):
        raise HTTPException(status_code=404, detail="Signal ID out of bounds")

    row = df_raw.iloc[signal_id]
    pulses = {f"a{i:02d}": float(row[f"a{i:02d}"]) for i in range(1, 35)}
    
    real_vals = [pulses[f"a{i:02d}"] for i in range(1, 35, 2)]
    imag_vals = [pulses[f"a{i:02d}"] for i in range(2, 35, 2)]

    # Compute envelope
    R = np.array(real_vals)
    I = np.array(imag_vals)
    envelope = np.sqrt(R**2 + I**2).tolist()

    label = int(y_all.iloc[signal_id])

    return {
        "signal_id": signal_id,
        "ground_truth": "GOOD_TARGET" if label == 1 else "GHOST_NOISE",
        "ground_truth_int": label,
        "real": real_vals,
        "imaginary": imag_vals,
        "envelope": envelope,
        "mean_pulse_amplitude": float(np.mean(envelope)),
        "lag_smoothness": float(np.mean(np.abs(np.diff(R)))),
        "raw_features": [pulses[f"a{i:02d}"] for i in range(1, 35)]
    }

@app.post("/api/validate")
def validate_signal(req: ValidateRequest):
    if len(req.features) != 34:
        raise HTTPException(status_code=400, detail="Must provide exactly 34 radar features (a01 - a34)")

    arr = np.array(req.features, dtype=float)
    scale = 1.0 - (req.attenuation_pct / 100.0)

    if req.noise_sigma > 0:
        rng = np.random.default_rng(seed=42)
        arr = np.clip(arr * scale + rng.normal(0, req.noise_sigma, 34), -1.0, 1.0)
    else:
        arr = arr * scale

    # Physics invariant: a02 is Lag 0 Imaginary = mathematically 0.0
    arr[1] = 0.0

    feat_dict = {f"a{i:02d}": arr[i - 1] for i in range(1, 35)}
    X_in = compute_physics(feat_dict)

    prob = float(model.predict_proba(X_in)[0][1])
    is_target = prob >= req.threshold
    confidence = prob if is_target else (1.0 - prob)

    return {
        "prediction": "GOOD_TARGET" if is_target else "GHOST_NOISE",
        "target_probability": prob,
        "confidence": confidence * 100,
        "threshold": req.threshold,
        "mean_pulse_amplitude": float(X_in["mean_pulse_amplitude"].values[0]),
        "lag_smoothness": float(X_in["lag_smoothness"].values[0]),
        "real": [float(feat_dict[f"a{i:02d}"]) for i in range(1, 35, 2)],
        "imaginary": [float(feat_dict[f"a{i:02d}"]) for i in range(2, 35, 2)],
        "envelope": [float(x) for x in np.sqrt(np.array([feat_dict[f"a{i:02d}"] for i in range(1, 35, 2)])**2 + np.array([feat_dict[f"a{i:02d}"] for i in range(2, 35, 2)])**2)]
    }

from fastapi.responses import Response

@app.get("/api/dataset/pruned-csv")
def download_pruned_csv():
    df_pruned = df_raw.drop(columns=["a02"]) if "a02" in df_raw.columns else df_raw
    csv_str = df_pruned.to_csv(index=False)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ionosphere_pruned_351x33.csv"}
    )

@app.get("/api/dataset/raw-csv")
def download_raw_csv():
    csv_str = df_raw.to_csv(index=False)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ionosphere_raw_351x34.csv"}
    )

@app.get("/api/dataset/rows")
def get_dataset_rows(page: int = 1, page_size: int = 6, q: Optional[str] = "", target: Optional[str] = "all"):
    filtered = df_raw.copy()
    if target == "good":
        filtered = filtered[filtered["target"].astype(str).str.lower().isin(["g", "1"])]
    elif target == "bad":
        filtered = filtered[filtered["target"].astype(str).str.lower().isin(["b", "0"])]

    if q:
        q_lower = q.lower()
        # Filter by index sweep or values
        matched_indices = []
        for idx, row in filtered.iterrows():
            sweep_id = f"sweep_{idx+1:03d}".lower()
            if q_lower in sweep_id or any(q_lower in str(v).lower() for v in row.values):
                matched_indices.append(idx)
        filtered = filtered.loc[matched_indices]

    total_count = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = filtered.iloc[start:end]

    rows = []
    for idx, row in sliced.iterrows():
        tgt = str(row["target"]).lower()
        is_good = tgt in ["g", "1"]
        rows.append({
            "sweep_id": f"SWEEP_{idx+1:03d}",
            "a01": float(row["a01"]),
            "a02": float(row["a02"]),
            "a03": float(row["a03"]),
            "a04": float(row["a04"]),
            "a05": float(row["a05"]),
            "a06": float(row["a06"]),
            "a07": float(row["a07"]),
            "a08": float(row["a08"]),
            "a09": float(row["a09"]),
            "target": "Good (g)" if is_good else "Bad (b)",
            "is_good": is_good
        })

    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total_count + page_size - 1) // page_size),
        "rows": rows
    }

# Mount static frontend
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
