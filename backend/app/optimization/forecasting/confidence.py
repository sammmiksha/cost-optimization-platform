from typing import List, Dict, Any


def calculate_forecast_reliability(
    history_weeks: int,
    data_completeness_pct: float = 100.0,
    coefficient_of_variation: float = 0.2
) -> str:
    """
    Heuristic Forecast Reliability Calculator based on historical observation length,
    data completeness percentage, and coefficient of variation (std dev / mean).

    Returns:
        One of 'LOW', 'LOW/MEDIUM', 'MEDIUM', 'HIGH'
    """
    if history_weeks < 4:
        base_rating = "LOW"
    elif 4 <= history_weeks < 8:
        base_rating = "LOW/MEDIUM"
    elif 8 <= history_weeks < 16:
        base_rating = "MEDIUM"
    else:
        base_rating = "HIGH"

    # Downgrade if data completeness is under 80% or variance is extremely high (>0.5)
    ratings = ["LOW", "LOW/MEDIUM", "MEDIUM", "HIGH"]
    current_index = ratings.index(base_rating)

    if (data_completeness_pct < 80.0 or coefficient_of_variation > 0.5) and current_index > 0:
        current_index -= 1

    return ratings[current_index]
