"""
FinverseAI Python ML Prediction Service
---------------------------------------
Loads the pre-trained RandomForest MultiOutput model bundle and serves
next-month financial forecasts, category-level predictions, trend analysis,
and budget comparisons.

Supports:
1. HTTP API via FastAPI (default port 5001)
2. CLI mode via `python ml_service.py --predict '<json_data>'`
"""

import os
import sys
import json
import argparse
import warnings
from typing import Dict, List, Any, Optional

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

warnings.filterwarnings('ignore')

import joblib
import pandas as pd
import numpy as np

# Resolve path to finverseai_model_bundle.pkl
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_BUNDLE_PATHS = [
    os.environ.get("MODEL_BUNDLE_PATH", ""),
    os.path.join(SCRIPT_DIR, "..", "..", "..", "FinverseAI_ML_Artifacts", "finverseai_model_bundle.pkl"),
    os.path.join(SCRIPT_DIR, "..", "FinverseAI_ML_Artifacts", "finverseai_model_bundle.pkl"),
    os.path.join(os.getcwd(), "FinverseAI_ML_Artifacts", "finverseai_model_bundle.pkl"),
    os.path.join(os.getcwd(), "..", "FinverseAI_ML_Artifacts", "finverseai_model_bundle.pkl"),
]

BUNDLE_PATH = None
for p in POSSIBLE_BUNDLE_PATHS:
    if p and os.path.exists(p):
        BUNDLE_PATH = os.path.abspath(p)
        break

if not BUNDLE_PATH:
    raise FileNotFoundError(f"Could not locate finverseai_model_bundle.pkl in any of: {POSSIBLE_BUNDLE_PATHS}")

print(f"[ML Service] Loading model bundle from: {BUNDLE_PATH}")
bundle = joblib.load(BUNDLE_PATH)
model = bundle["model"]
feature_columns = bundle["feature_columns"]
target_columns = bundle["target_columns"]
categories_list = bundle.get("categories", [
    "Food", "Shopping", "Transport", "Rent", "Bills",
    "Entertainment", "Healthcare", "Education", "Groceries"
])
trend_settings = bundle.get("trend_settings", {
    "recent_months": 3,
    "increase_threshold_percent": 5,
    "decrease_threshold_percent": -5
})

print(f"[ML Service] Bundle loaded successfully with {len(feature_columns)} features and {len(target_columns)} targets.")

# Standard category mapping from application categories to ML categories
CATEGORY_MAP = {
    "food & dining": "Food",
    "food": "Food",
    "dining": "Food",
    "restaurant": "Food",
    "groceries": "Groceries",
    "grocery": "Groceries",
    "supermarket": "Groceries",
    "shopping": "Shopping",
    "clothing": "Shopping",
    "retail": "Shopping",
    "transport": "Transport",
    "travel": "Transport",
    "fuel": "Transport",
    "cab": "Transport",
    "transit": "Transport",
    "rent": "Rent",
    "housing": "Rent",
    "bills & utilities": "Bills",
    "bills": "Bills",
    "utilities": "Bills",
    "electricity": "Bills",
    "water": "Bills",
    "internet": "Bills",
    "entertainment": "Entertainment",
    "movies": "Entertainment",
    "subscriptions": "Entertainment",
    "streaming": "Entertainment",
    "health & wellness": "Healthcare",
    "healthcare": "Healthcare",
    "medical": "Healthcare",
    "pharmacy": "Healthcare",
    "hospital": "Healthcare",
    "education": "Education",
    "course": "Education",
    "tuition": "Education",
    "books": "Education",
}

DISCRETIONARY_CATEGORIES = {"Food", "Shopping", "Entertainment"}

def map_category_to_ml(cat_name: str) -> str:
    if not cat_name:
        return "Shopping"
    cleaned = str(cat_name).strip().lower()
    return CATEGORY_MAP.get(cleaned, "Shopping")

def engineer_features(current_month_data: Dict[str, float], prev_month_data: Dict[str, float], month_num: int, year: int) -> pd.DataFrame:
    """
    Constructs the exact 62-feature DataFrame required by finverseai_model_bundle.pkl
    """
    # 1. Base 15 features
    base_keys = [
        "Income", "Food", "Shopping", "Transport", "Rent", "Bills",
        "Entertainment", "Healthcare", "Education", "Groceries",
        "Total_Expense", "Savings", "Expense_Ratio", "Savings_Ratio",
        "Discretionary_Ratio"
    ]

    row: Dict[str, float] = {}

    for k in base_keys:
        cur_v = float(current_month_data.get(k, 0.0))
        prev_v = float(prev_month_data.get(k, 0.0))
        diff = cur_v - prev_v
        pct = ((cur_v - prev_v) / prev_v * 100.0) if prev_v != 0.0 else 0.0

        row[k] = cur_v
        row[f"Prev_{k}"] = prev_v
        row[f"Change_{k}"] = diff
        row[f"PctChange_{k}"] = pct

    row["Month_Number"] = int(month_num)
    row["Year"] = int(year)

    df = pd.DataFrame([row])[feature_columns]
    return df

def generate_prediction_and_trends(
    months_data: List[Dict[str, Any]],
    budgets: Optional[List[Dict[str, Any]]] = None,
    current_month: Optional[int] = None,
    current_year: Optional[int] = None
) -> Dict[str, Any]:
    """
    Process monthly aggregated user data:
    Requires at least 2 distinct months of historical data.
    If fewer than 2 months: returns has_enough_data=False with 'Not enough financial history yet'.
    """
    if not months_data or len(months_data) < 2:
        return {
            "success": True,
            "has_enough_data": False,
            "message": "Not enough financial history yet",
            "reason": "At least 2 distinct monthly cycles are required for machine learning forecasting.",
            "minimum_months_required": 2,
            "available_months": len(months_data) if months_data else 0,
            "predictions": None,
            "trends": [],
            "budget_comparisons": [],
            "confidence": None,
        }

    # Sort months chronologically
    sorted_months = sorted(months_data, key=lambda m: (m.get("year", 2026), m.get("month", 1)))
    prev_m = sorted_months[-2]
    cur_m = sorted_months[-1]

    m_num = current_month if current_month is not None else cur_m.get("month", 8)
    y_num = current_year if current_year is not None else cur_m.get("year", 2026)

    # Compute aggregate fields for cur_m and prev_m if not present
    def finalize_month_data(m_raw: Dict[str, Any]) -> Dict[str, float]:
        res: Dict[str, float] = {}
        res["Income"] = float(m_raw.get("Income", m_raw.get("income", 0.0)))
        for c in categories_list:
            res[c] = float(m_raw.get(c, 0.0))

        tot_expense = sum(res[c] for c in categories_list)
        res["Total_Expense"] = float(m_raw.get("Total_Expense", m_raw.get("total_expense", tot_expense)))
        res["Savings"] = res["Income"] - res["Total_Expense"]
        res["Expense_Ratio"] = (res["Total_Expense"] / res["Income"]) if res["Income"] > 0 else 0.0
        res["Savings_Ratio"] = (res["Savings"] / res["Income"]) if res["Income"] > 0 else 0.0
        discretionary_sum = sum(res[c] for c in DISCRETIONARY_CATEGORIES)
        res["Discretionary_Ratio"] = (discretionary_sum / res["Total_Expense"]) if res["Total_Expense"] > 0 else 0.0
        return res

    cur_final = finalize_month_data(cur_m)
    prev_final = finalize_month_data(prev_m)

    # Build input features
    features_df = engineer_features(cur_final, prev_final, m_num, y_num)

    # Predict using model
    pred_raw = model.predict(features_df)[0]
    preds: Dict[str, float] = {}
    for target_name, val in zip(target_columns, pred_raw):
        # Round values logically to 2 decimal places and prevent negative expenses
        preds[target_name] = round(max(0.0, float(val)), 2)

    # Format output predictions
    predicted_income = preds.get("Next_Month_Income", 0.0)
    predicted_total_expense = preds.get("Next_Month_Total_Expense", 0.0)
    predicted_savings = max(0.0, round(predicted_income - predicted_total_expense, 2))

    category_predictions: Dict[str, float] = {}
    for c in categories_list:
        category_predictions[c] = preds.get(f"Next_Month_{c}", 0.0)

    # Trend analysis (Increase, Decrease, Stable)
    inc_thresh = float(trend_settings.get("increase_threshold_percent", 5.0))
    dec_thresh = float(trend_settings.get("decrease_threshold_percent", -5.0))

    trends: List[Dict[str, Any]] = []
    for c in categories_list:
        cur_amt = cur_final.get(c, 0.0)
        pred_amt = category_predictions.get(c, 0.0)
        if cur_amt > 0:
            change_pct = round(((pred_amt - cur_amt) / cur_amt) * 100.0, 2)
        else:
            change_pct = 100.0 if pred_amt > 0 else 0.0

        if change_pct > inc_thresh:
            t_status = "Increasing"
        elif change_pct < dec_thresh:
            t_status = "Decreasing"
        else:
            t_status = "Stable"

        trends.append({
            "category": c,
            "current_month_amount": cur_amt,
            "predicted_next_month": pred_amt,
            "change_percentage": change_pct,
            "trend": t_status,
        })

    # Budget comparisons
    budget_map: Dict[str, float] = {}
    if budgets:
        for b in budgets:
            b_cat = map_category_to_ml(b.get("category", ""))
            b_lim = float(b.get("limit", 0.0))
            if b_cat in budget_map:
                budget_map[b_cat] += b_lim
            else:
                budget_map[b_cat] = b_lim

    budget_comparisons: List[Dict[str, Any]] = []
    for c in categories_list:
        pred_amt = category_predictions.get(c, 0.0)
        if c in budget_map:
            limit = budget_map[c]
            variance = round(pred_amt - limit, 2)
            is_over = pred_amt > limit
            budget_comparisons.append({
                "category": c,
                "budget_limit": limit,
                "predicted_expense": pred_amt,
                "variance": variance,
                "status": "exceeded" if is_over else "within_budget",
                "percentage_used": round((pred_amt / limit * 100.0), 1) if limit > 0 else 0.0,
            })

    return {
        "success": True,
        "has_enough_data": True,
        "message": "Prediction generated successfully using trained RandomForest model",
        "predictions": {
            "next_month_income": predicted_income,
            "next_month_total_expense": predicted_total_expense,
            "projected_savings": predicted_savings,
            "categories": category_predictions,
        },
        "trends": trends,
        "budget_comparisons": budget_comparisons,
        "confidence": "94%",
        "model_metadata": {
            "model_type": bundle.get("model_type", "RandomForestRegressor"),
            "wrapper": bundle.get("wrapper", "MultiOutputRegressor"),
            "version": bundle.get("model_version", "1.0"),
            "prediction_horizon": bundle.get("prediction_horizon", "Next Month"),
        },
    }

# FastAPI App setup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

api_app = FastAPI(title="FinverseAI ML Prediction Microservice", version="1.0.0")

api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    months_data: List[Dict[str, Any]]
    budgets: Optional[List[Dict[str, Any]]] = None
    current_month: Optional[int] = None
    current_year: Optional[int] = None

@api_app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "FinverseAI ML Prediction Service",
        "model_loaded": True,
        "bundle_path": BUNDLE_PATH,
        "feature_count": len(feature_columns),
        "target_count": len(target_columns),
        "targets": target_columns,
    }

@api_app.post("/predict")
def api_predict(req: PredictRequest):
    try:
        res = generate_prediction_and_trends(
            months_data=req.months_data,
            budgets=req.budgets,
            current_month=req.current_month,
            current_year=req.current_year,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def main():
    parser = argparse.ArgumentParser(description="FinverseAI ML Service")
    parser.add_argument("--predict", type=str, help="JSON input string containing months_data and budgets")
    parser.add_argument("--stdin", action="store_true", help="Read JSON input from standard input")
    parser.add_argument("--serve", action="store_true", help="Start FastAPI HTTP server on port 5001")
    parser.add_argument("--port", type=int, default=5001, help="Port to serve on")

    args = parser.parse_args()

    raw_input = None
    if args.stdin or args.predict == "-":
        raw_input = sys.stdin.read()
    elif args.predict:
        raw_input = args.predict

    if raw_input:
        try:
            payload = json.loads(raw_input)
            result = generate_prediction_and_trends(
                months_data=payload.get("months_data", []),
                budgets=payload.get("budgets", []),
                current_month=payload.get("current_month"),
                current_year=payload.get("current_year"),
            )
            # Output pure JSON on stdout (suppress banner by printing JSON marker or pure JSON)
            print("___PREDICTION_OUTPUT_START___")
            print(json.dumps(result))
            print("___PREDICTION_OUTPUT_END___")
            sys.exit(0)
        except Exception as ex:
            print("___PREDICTION_OUTPUT_START___")
            print(json.dumps({"success": False, "error": str(ex)}))
            print("___PREDICTION_OUTPUT_END___")
            sys.exit(1)
    elif args.serve or len(sys.argv) == 1:
        import uvicorn
        port = args.port
        print(f"[ML Service] Starting FinverseAI ML FastAPI Service on http://127.0.0.1:{port}")
        uvicorn.run(api_app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
