from typing import List, Dict, Any, Optional
import math
from backend.app.optimization.forecasting.confidence import calculate_forecast_reliability


def forecast_dish_demand(
    sales_history: List[Dict[str, Any]],
    history_weeks: int = 8
) -> Dict[str, Dict[str, Any]]:
    """
    Computes a mathematically scaled, guarded demand forecast per dish:
    TrendFactor = RecentPeriodDemand / PreviousPeriodDemand (clamped [0.75, 1.25])
    Forecast = (0.5 * RecentAvg + 0.3 * SameWeekdayAvg) * TrendFactor

    Args:
        sales_history: List of sales records containing 'menu_item'/'name', 'recent_avg',
                       'same_weekday_avg', 'recent_period_demand', 'previous_period_demand'.
        history_weeks: Total weeks of historical data available.

    Returns:
        Dict mapping dish_name -> {
            "expected_demand": float,
            "reliability": str,
            "recent_avg": float,
            "trend_factor": float
        }
    """
    results = {}

    for record in sales_history:
        dish_name = record.get("name") or record.get("menu_item") or record.get("dish_name", "Unknown Dish")
        recent_avg = float(record.get("recent_avg") or record.get("average_demand") or 0.0)
        same_weekday_avg = float(record.get("same_weekday_avg") or recent_avg)

        recent_period = float(record.get("recent_period_demand") or 0.0)
        previous_period = float(record.get("previous_period_demand") or 0.0)

        # Guard against divide by zero & extreme trends
        if previous_period <= 0.0 or recent_period <= 0.0:
            trend_factor = 1.0
        else:
            raw_trend = recent_period / previous_period
            trend_factor = max(0.75, min(1.25, raw_trend))

        base_forecast = (0.5 * recent_avg) + (0.3 * same_weekday_avg)
        # If weekday avg is same as recent, adjust base weight sum
        if same_weekday_avg == recent_avg:
            base_forecast = recent_avg

        forecasted_demand = base_forecast * trend_factor
        expected_demand = max(0.0, round(forecasted_demand, 2))

        reliability = calculate_forecast_reliability(
            history_weeks=history_weeks,
            data_completeness_pct=record.get("completeness_pct", 100.0),
            coefficient_of_variation=record.get("cv", 0.15)
        )

        results[dish_name] = {
            "expected_demand": expected_demand,
            "reliability": reliability,
            "recent_avg": round(recent_avg, 2),
            "trend_factor": round(trend_factor, 3),
            "history_weeks": history_weeks
        }

    return results


def calculate_ingredient_requirements(
    dish_forecasts: Dict[str, Dict[str, Any]],
    recipes: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Converts dish demand forecasts into total required raw material ingredient quantities:
    RequiredIngredient_i = SUM_j (Forecast_j * RecipeQuantity_{j,i})

    Args:
        dish_forecasts: Dict of dish_name -> forecast dict (containing 'expected_demand')
        recipes: List of recipe link dicts mapping dish name to ingredient name and quantity.

    Returns:
        Dict mapping ingredient_name -> total_required_quantity
    """
    requirements = {}

    for r in recipes:
        dish_name = r.get("menu_item") or r.get("menu_item_name")
        ing_name = r.get("ingredient") or r.get("ingredient_name")
        qty_per_dish = float(r.get("quantity") or r.get("quantity_per_dish") or 0.0)

        if dish_name and ing_name and dish_name in dish_forecasts:
            expected_demand = dish_forecasts[dish_name]["expected_demand"]
            req_qty = expected_demand * qty_per_dish
            requirements[ing_name] = round(requirements.get(ing_name, 0.0) + req_qty, 3)

    return requirements
