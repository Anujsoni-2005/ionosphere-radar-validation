"""FastAPI backend for the ionosphere radar-return classifier."""
from __future__ import annotations

import io

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import ml

app = FastAPI(title="Ionosphere Radar API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

raw_df = ml.load_raw()
features_df = ml.engineer(raw_df)
bundle = ml.load_or_train()
models = bundle["models"]
split = bundle["split"]
LABEL_NAME = {1: "good", 0: "bad"}
MAX_CSV_ROWS = 5000


def _check_model(key: str) -> str:
    if key not in models:
        raise HTTPException(404, f"Unknown model '{key}'. Options: {list(models)}")
    return key


def _predict_all(raw: pd.DataFrame) -> dict[str, dict[str, np.ndarray]]:
    """Run every model on rows of the 34 raw pulse columns."""
    X = ml.engineer(raw)
    out = {}
    for key, model in models.items():
        out[key] = {"label": model.predict(X), "prob_good": model.predict_proba(X)[:, 1]}
    return out


def _predictions_for_row(preds: dict, i: int) -> dict:
    return {
        key: {"label": LABEL_NAME[int(p["label"][i])], "prob_good": float(p["prob_good"][i])}
        for key, p in preds.items()
    }


def _signal_payload(values: list[float], extra: dict) -> dict:
    raw = pd.DataFrame([values], columns=ml.RAW_COLS)
    real = raw[ml.REAL_COLS].to_numpy(dtype=float)[0]
    imag = raw[ml.IMAG_COLS].to_numpy(dtype=float)[0]
    preds = _predict_all(raw)
    return {
        **extra,
        "values": values,
        "real": real.tolist(),
        "imaginary": imag.tolist(),
        "envelope": np.sqrt(real**2 + imag**2).tolist(),
        "predictions": _predictions_for_row(preds, 0),
    }


def _dataset_signal(signal_id: int) -> dict:
    row = raw_df.iloc[signal_id]
    values = [float(row[c]) for c in ml.RAW_COLS]
    return _signal_payload(
        values,
        {"id": signal_id, "split": split[signal_id], "truth": LABEL_NAME[int(row["label"])]},
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "samples": len(raw_df), "models": list(models)}


@app.get("/api/dataset/summary")
def dataset_summary():
    good = int(raw_df["label"].sum())
    return {
        "samples": len(raw_df),
        "raw_features": len(ml.RAW_COLS),
        "model_features": len(ml.FEATURE_COLS),
        "good": good,
        "bad": len(raw_df) - good,
        "train": bundle["n_train"],
        "test": bundle["n_test"],
        "engineered": ml.ENGINEERED,
        "dropped": [{"column": "a02", "variance": bundle["a02_variance"]}],
    }


@app.get("/api/dataset/pca")
def dataset_pca():
    pca = bundle["pca"]
    points = [
        {
            "id": i,
            "x": pca["x"][i],
            "y": pca["y"][i],
            "truth": LABEL_NAME[int(raw_df["label"].iloc[i])],
            "split": split[i],
        }
        for i in range(len(raw_df))
    ]
    return {"explained": pca["explained"], "points": points}


@app.get("/api/benchmarks")
def benchmarks():
    return {"test_size": bundle["n_test"], "models": bundle["benchmarks"]}


@app.get("/api/radar")
def radar(model: str = Query("svm")):
    """Held-out test signals with their PCA position and the chosen model's prediction."""
    key = _check_model(model)
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
                "truth": LABEL_NAME[int(raw_df["label"].iloc[sid])],
                "predicted": LABEL_NAME[int(labels[n])],
                "prob_good": float(probs[n]),
            }
            for n, sid in enumerate(test_ids)
        ],
    }


@app.get("/api/signals/random")
def random_signal(split_name: str = Query("test", alias="split")):
    pool = [i for i, s in enumerate(split) if split_name == "any" or s == split_name]
    if not pool:
        raise HTTPException(400, "split must be 'test', 'train' or 'any'")
    return _dataset_signal(int(np.random.choice(pool)))


@app.get("/api/signals/{signal_id}")
def get_signal(signal_id: int):
    if not 0 <= signal_id < len(raw_df):
        raise HTTPException(404, f"Signal id must be between 0 and {len(raw_df) - 1}")
    return _dataset_signal(signal_id)


class CustomSignal(BaseModel):
    values: list[float]


@app.post("/api/predict")
def predict_custom(req: CustomSignal):
    if len(req.values) != len(ml.RAW_COLS):
        raise HTTPException(400, f"Provide exactly {len(ml.RAW_COLS)} values (a01 to a34).")
    if not np.all(np.isfinite(req.values)):
        raise HTTPException(400, "Values must be finite numbers.")
    return _signal_payload(req.values, {"id": None, "split": None, "truth": None})


def _parse_csv(content: bytes) -> tuple[pd.DataFrame, pd.Series | None]:
    try:
        df = pd.read_csv(io.BytesIO(content), header=None)
    except Exception as exc:
        raise HTTPException(400, f"Could not read CSV: {exc}") from exc

    first = pd.to_numeric(df.iloc[0, : len(ml.RAW_COLS)], errors="coerce")
    if first.isna().any():  # first row is a header
        df = df.iloc[1:].reset_index(drop=True)

    if df.shape[1] not in (len(ml.RAW_COLS), len(ml.RAW_COLS) + 1):
        raise HTTPException(
            400, f"Expected 34 columns (or 35 with a g/b label), found {df.shape[1]}."
        )
    if len(df) == 0:
        raise HTTPException(400, "CSV has no data rows.")
    if len(df) > MAX_CSV_ROWS:
        raise HTTPException(400, f"Limit is {MAX_CSV_ROWS} rows per upload.")

    values = df.iloc[:, : len(ml.RAW_COLS)].apply(pd.to_numeric, errors="coerce")
    if values.isna().any().any() or not np.isfinite(values.to_numpy(dtype=float)).all():
        raise HTTPException(400, "All 34 signal columns must be numeric.")
    values.columns = ml.RAW_COLS

    truth = None
    if df.shape[1] == len(ml.RAW_COLS) + 1:
        mapped = df.iloc[:, -1].astype(str).str.strip().str.lower().map(
            {"g": 1, "b": 0, "1": 1, "0": 0}
        )
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
        rows.append(
            {
                "row": i + 1,
                "truth": LABEL_NAME[int(truth.iloc[i])] if truth is not None else None,
                "predictions": _predictions_for_row(preds, i),
            }
        )

    accuracy = None
    if truth is not None:
        accuracy = {
            key: float((p["label"] == truth.to_numpy()).mean()) for key, p in preds.items()
        }
    return {"count": len(rows), "has_labels": truth is not None, "accuracy": accuracy, "rows": rows}


@app.get("/api/dataset/sample-csv")
def sample_csv(n: int = Query(20, ge=1, le=200)):
    """A ready-to-upload CSV built from held-out test signals (34 values + g/b label)."""
    test_ids = [i for i, s in enumerate(split) if s == "test"][:n]
    out = raw_df.iloc[test_ids][ml.RAW_COLS + ["target"]]
    return Response(
        out.to_csv(index=False, header=False),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="radar_test_signals.csv"'},
    )
