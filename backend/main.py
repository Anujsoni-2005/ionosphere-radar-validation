import os
import io
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
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

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ionosphere_svm_pipeline.pkl")
LOCAL_CSV = os.path.join(BASE_DIR, "ionosphere.csv")
BUNDLE_PATH = os.path.join(BASE_DIR, "backend", "bundle.joblib")
if not os.path.exists(BUNDLE_PATH):
    BUNDLE_PATH = os.path.join(BASE_DIR, "ML project from v0", "backend", "artifacts", "bundle.joblib")

pulse_cols = [f"a{i:02d}" for i in range(1, 35)]
cols = pulse_cols + ["target"]

if os.path.exists(LOCAL_CSV):
    df_raw = pd.read_csv(LOCAL_CSV, header=None, names=cols)
else:
    df_raw = pd.read_csv("https://raw.githubusercontent.com/jbrownlee/Datasets/master/ionosphere.csv", header=None, names=cols)

df_raw["label"] = df_raw["target"].astype(str).str.lower().map({"g": 1, "b": 0, "1": 1, "0": 0}).astype(int)
y_all = df_raw["label"]

# Load Tuned SVM
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = None

# Load multi-model bundle
bundle = joblib.load(BUNDLE_PATH) if os.path.exists(BUNDLE_PATH) else None
models = bundle["models"] if bundle else {}
split = bundle["split"] if bundle else ["train"] * len(df_raw)
pca_data = bundle["pca"] if bundle else {}
LABEL_NAME = {1: "good", 0: "bad"}
MAX_CSV_ROWS = 5000

REAL_COLS = pulse_cols[0::2]
IMAG_COLS = pulse_cols[1::2]
ENGINEERED = ["mean_pulse_amplitude", "std_pulse_amplitude", "lag_smoothness"]
FEATURE_COLS = [c for c in pulse_cols if c != "a02"] + ENGINEERED

def engineer_v0(raw: pd.DataFrame) -> pd.DataFrame:
    real = raw[REAL_COLS].to_numpy(dtype=float)
    imag = raw[IMAG_COLS].to_numpy(dtype=float)
    envelope = np.sqrt(real**2 + imag**2)
    feats = raw[[c for c in pulse_cols if c != "a02"]].astype(float).copy()
    feats["mean_pulse_amplitude"] = envelope.mean(axis=1)
    feats["std_pulse_amplitude"] = envelope.std(axis=1)
    feats["lag_smoothness"] = np.abs(np.diff(real, axis=1)).mean(axis=1)
    return feats[FEATURE_COLS]

features_df = engineer_v0(df_raw[pulse_cols])

def _check_model(key: str) -> str:
    if key not in models:
        raise HTTPException(404, f"Unknown model '{key}'. Options: {list(models.keys())}")
    return key

def _predict_all(raw: pd.DataFrame) -> dict:
    X = engineer_v0(raw)
    out = {}
    for key, m in models.items():
        out[key] = {"label": m.predict(X), "prob_good": m.predict_proba(X)[:, 1]}
    return out

def _predictions_for_row(preds: dict, i: int) -> dict:
    return {
        key: {"label": LABEL_NAME[int(p["label"][i])], "prob_good": float(p["prob_good"][i])}
        for key, p in preds.items()
    }

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

class CustomSignal(BaseModel):
    values: list[float]

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "Goose Bay Radar Inference API",
        "model_loaded": model is not None,
        "dataset_samples": len(df_raw),
        "models": list(models.keys()) if models else ["svm"]
    }

@app.get("/api/signals/count")
def get_signal_count():
    return {"total": len(df_raw)}

@app.get("/api/dataset/summary")
def dataset_summary():
    good = int(df_raw["label"].sum())
    return {
        "samples": len(df_raw),
        "raw_features": len(pulse_cols),
        "model_features": len(FEATURE_COLS),
        "good": good,
        "bad": len(df_raw) - good,
        "train": bundle.get("n_train", 280) if bundle else 280,
        "test": bundle.get("n_test", 71) if bundle else 71,
        "engineered": ENGINEERED,
        "dropped": [{"column": "a02", "variance": bundle.get("a02_variance", 0.0) if bundle else 0.0}],
    }

@app.get("/api/dataset/pca")
def dataset_pca():
    if not bundle or "pca" not in bundle:
        raise HTTPException(500, "PCA data not compiled in bundle")
    pca = bundle["pca"]
    points = [
        {
            "id": i,
            "x": pca["x"][i],
            "y": pca["y"][i],
            "truth": LABEL_NAME[int(df_raw["label"].iloc[i])],
            "split": split[i] if i < len(split) else "train",
        }
        for i in range(len(df_raw))
    ]
    return {"explained": pca["explained"], "points": points}

@app.get("/api/benchmarks")
def benchmarks():
    if not bundle or "benchmarks" not in bundle:
        raise HTTPException(500, "Benchmarks not compiled in bundle")
    return {"test_size": bundle.get("n_test", 71), "models": bundle["benchmarks"]}

@app.get("/api/radar")
def radar(model_name: str = Query("svm", alias="model")):
    key = _check_model(model_name)
    test_ids = [i for i, s in enumerate(split) if s == "test"]
    X = features_df.iloc[test_ids]
    labels = models[key].predict(X)
    probs = models[key].predict_proba(X)[:, 1]
    pca = bundle["pca"]
    return {
        "model": key,
        "signals": [
            {
                "id": sid,
                "x": pca["x"][sid],
                "y": pca["y"][sid],
                "truth": LABEL_NAME[int(df_raw["label"].iloc[sid])],
                "predicted": LABEL_NAME[int(labels[n])],
                "prob_good": float(probs[n]),
            }
            for n, sid in enumerate(test_ids)
        ],
    }

def _signal_payload(values: list[float], extra: dict) -> dict:
    raw = pd.DataFrame([values], columns=pulse_cols)
    real = raw[REAL_COLS].to_numpy(dtype=float)[0]
    imag = raw[IMAG_COLS].to_numpy(dtype=float)[0]
    preds = _predict_all(raw) if models else {}
    envelope = np.sqrt(real**2 + imag**2).tolist()
    return {
        **extra,
        "values": values,
        "raw_features": values,
        "real": real.tolist(),
        "imaginary": imag.tolist(),
        "envelope": envelope,
        "mean_pulse_amplitude": float(np.mean(envelope)),
        "lag_smoothness": float(np.mean(np.abs(np.diff(real)))),
        "predictions": _predictions_for_row(preds, 0) if preds else {},
    }

@app.get("/api/signals/random")
def random_signal(split_name: str = Query("test", alias="split")):
    pool = [i for i, s in enumerate(split) if split_name == "any" or s == split_name]
    if not pool:
        pool = list(range(len(df_raw)))
    chosen_id = int(np.random.choice(pool))
    return get_signal(chosen_id)

@app.get("/api/signals/{signal_id}")
def get_signal(signal_id: int):
    if signal_id < 0 or signal_id >= len(df_raw):
        raise HTTPException(status_code=404, detail="Signal ID out of bounds")

    row = df_raw.iloc[signal_id]
    values = [float(row[c]) for c in pulse_cols]
    label = int(y_all.iloc[signal_id])
    extra = {
        "id": signal_id,
        "signal_id": signal_id,
        "split": split[signal_id] if signal_id < len(split) else "test",
        "truth": LABEL_NAME[label],
        "ground_truth": "GOOD_TARGET" if label == 1 else "GHOST_NOISE",
        "ground_truth_int": label
    }
    return _signal_payload(values, extra)

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

    arr[1] = 0.0

    feat_dict = {f"a{i:02d}": arr[i - 1] for i in range(1, 35)}
    X_in = compute_physics(feat_dict)

    clf = model if model is not None else models.get("svm")
    prob = float(clf.predict_proba(X_in)[0][1])
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

@app.post("/api/predict")
def predict_custom(req: CustomSignal):
    if len(req.values) != 34:
        raise HTTPException(400, "Provide exactly 34 values (a01 to a34).")
    if not np.all(np.isfinite(req.values)):
        raise HTTPException(400, "Values must be finite numbers.")
    return _signal_payload(req.values, {"id": None, "split": None, "truth": None})

def _parse_csv(content: bytes):
    try:
        df = pd.read_csv(io.BytesIO(content), header=None)
    except Exception as exc:
        raise HTTPException(400, f"Could not read CSV: {exc}")

    first = pd.to_numeric(df.iloc[0, :34], errors="coerce")
    if first.isna().any():
        df = df.iloc[1:].reset_index(drop=True)

    if df.shape[1] not in (34, 35):
        raise HTTPException(400, f"Expected 34 columns (or 35 with label), found {df.shape[1]}.")
    if len(df) == 0:
        raise HTTPException(400, "CSV has no data rows.")
    if len(df) > MAX_CSV_ROWS:
        raise HTTPException(400, f"Limit is {MAX_CSV_ROWS} rows per upload.")

    values = df.iloc[:, :34].apply(pd.to_numeric, errors="coerce")
    if values.isna().any().any() or not np.isfinite(values.to_numpy(dtype=float)).all():
        raise HTTPException(400, "All 34 signal columns must be numeric.")
    values.columns = pulse_cols

    truth = None
    if df.shape[1] == 35:
        mapped = df.iloc[:, -1].astype(str).str.strip().str.lower().map({"g": 1, "b": 0, "1": 1, "0": 0})
        if mapped.isna().any():
            raise HTTPException(400, "Label column must contain only g/b (or 1/0).")
        truth = mapped.astype(int)
    return values, truth

@app.post("/api/predict/csv")
async def predict_csv(file: UploadFile = File(...)):
    values, truth = _parse_csv(await file.read())
    preds = _predict_all(values)

    rows = []
    for i in range(len(values)):
        rows.append({
            "row": i + 1,
            "truth": LABEL_NAME[int(truth.iloc[i])] if truth is not None else None,
            "predictions": _predictions_for_row(preds, i),
        })

    accuracy = None
    if truth is not None:
        accuracy = {key: float((p["label"] == truth.to_numpy()).mean()) for key, p in preds.items()}
    return {"count": len(rows), "has_labels": truth is not None, "accuracy": accuracy, "rows": rows}

@app.get("/api/dataset/sample-csv")
def sample_csv(n: int = Query(20, ge=1, le=200)):
    test_ids = [i for i, s in enumerate(split) if s == "test"][:n]
    out = df_raw.iloc[test_ids][pulse_cols + ["target"]]
    return Response(
        out.to_csv(index=False, header=False),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="radar_test_signals.csv"'},
    )

@app.get("/api/dataset/pruned-csv")
def download_pruned_csv():
    df_pruned = df_raw.drop(columns=["a02"]) if "a02" in df_raw.columns else df_raw
    return Response(
        content=df_pruned.to_csv(index=False),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ionosphere_pruned_351x33.csv"}
    )

@app.get("/api/dataset/raw-csv")
def download_raw_csv():
    return Response(
        content=df_raw.to_csv(index=False),
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
