"""Ionosphere radar-return classifier: data, features, training and evaluation.

Everything the frontend shows is computed here from backend/data/ionosphere.csv.
"""
from __future__ import annotations

import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "ionosphere.csv"
ARTIFACT_PATH = BASE_DIR / "artifacts" / "bundle.joblib"

RANDOM_STATE = 42
TEST_SIZE = 0.20

RAW_COLS = [f"a{i:02d}" for i in range(1, 35)]
REAL_COLS = RAW_COLS[0::2]  # a01, a03, ... a33
IMAG_COLS = RAW_COLS[1::2]  # a02, a04, ... a34
ENGINEERED = ["mean_pulse_amplitude", "std_pulse_amplitude", "lag_smoothness"]
# a02 (imaginary part of lag 0) is constant 0 in the data, so it is dropped.
FEATURE_COLS = [c for c in RAW_COLS if c != "a02"] + ENGINEERED

MODEL_NAMES = {
    "logistic_regression": "Logistic Regression",
    "knn": "k-Nearest Neighbors (k=3)",
    "random_forest": "Random Forest",
    "svm": "SVM (RBF kernel)",
    "neural_network": "Neural Network (MLP)",
}


def load_raw() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, header=None, names=RAW_COLS + ["target"])
    df["label"] = df["target"].astype(str).str.lower().map({"g": 1, "b": 0}).astype(int)
    return df


def engineer(raw: pd.DataFrame) -> pd.DataFrame:
    """Build the model input matrix from the 34 raw pulse columns."""
    real = raw[REAL_COLS].to_numpy(dtype=float)
    imag = raw[IMAG_COLS].to_numpy(dtype=float)
    envelope = np.sqrt(real**2 + imag**2)
    feats = raw[[c for c in RAW_COLS if c != "a02"]].astype(float).copy()
    feats["mean_pulse_amplitude"] = envelope.mean(axis=1)
    feats["std_pulse_amplitude"] = envelope.std(axis=1)
    feats["lag_smoothness"] = np.abs(np.diff(real, axis=1)).mean(axis=1)
    return feats[FEATURE_COLS]


def _build_models() -> dict[str, Pipeline]:
    def pipe(clf):
        return Pipeline([("scaler", StandardScaler()), ("clf", clf)])

    return {
        "logistic_regression": pipe(LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)),
        "knn": pipe(KNeighborsClassifier(n_neighbors=3)),
        "random_forest": pipe(RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)),
        "svm": pipe(SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE)),
        "neural_network": pipe(
            MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=RANDOM_STATE)
        ),
    }


def train() -> dict:
    raw = load_raw()
    X = engineer(raw)
    y = raw["label"]

    idx_train, idx_test = train_test_split(
        np.arange(len(raw)), test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    X_train, X_test = X.iloc[idx_train], X.iloc[idx_test]
    y_train, y_test = y.iloc[idx_train], y.iloc[idx_test]

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    models, benchmarks = {}, []

    for key, pipeline in _build_models().items():
        cv_acc = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="accuracy").mean()
        pipeline.fit(X_train, y_train)
        pred = pipeline.predict(X_test)
        prob = pipeline.predict_proba(X_test)[:, 1]
        tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
        fpr, tpr, _ = roc_curve(y_test, prob)
        benchmarks.append(
            {
                "key": key,
                "name": MODEL_NAMES[key],
                "cv_accuracy": float(cv_acc),
                "accuracy": float(accuracy_score(y_test, pred)),
                "precision": float(precision_score(y_test, pred)),
                "recall": float(recall_score(y_test, pred)),
                "f1": float(f1_score(y_test, pred)),
                "roc_auc": float(roc_auc_score(y_test, prob)),
                "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
                "roc": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
            }
        )
        models[key] = pipeline

    scaled = StandardScaler().fit_transform(X)
    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    coords = pca.fit_transform(scaled)

    split = np.full(len(raw), "train", dtype=object)
    split[idx_test] = "test"

    return {
        "models": models,
        "benchmarks": benchmarks,
        "pca": {
            "x": coords[:, 0].tolist(),
            "y": coords[:, 1].tolist(),
            "explained": pca.explained_variance_ratio_.tolist(),
        },
        "split": split.tolist(),
        "n_train": int(len(idx_train)),
        "n_test": int(len(idx_test)),
        "a02_variance": float(raw["a02"].var()),
    }


def load_or_train() -> dict:
    if ARTIFACT_PATH.exists():
        try:
            return joblib.load(ARTIFACT_PATH)
        except Exception:
            ARTIFACT_PATH.unlink(missing_ok=True)
    bundle = train()
    ARTIFACT_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(bundle, ARTIFACT_PATH)
    return bundle


if __name__ == "__main__":
    ARTIFACT_PATH.unlink(missing_ok=True)
    result = load_or_train()
    for b in result["benchmarks"]:
        print(f"{b['name']:<28} acc={b['accuracy']:.4f} auc={b['roc_auc']:.4f} cm={b['confusion_matrix']}")
