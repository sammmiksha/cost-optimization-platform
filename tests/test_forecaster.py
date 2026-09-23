from backend.app.optimization.forecasting.demand_forecaster import forecast_dish_demand, calculate_ingredient_requirements
from backend.app.optimization.forecasting.confidence import calculate_forecast_reliability


def test_forecast_dish_demand_trend_factor():
    sales_history = [
        {
            "name": "Margherita Pizza",
            "recent_avg": 80.0,
            "same_weekday_avg": 75.0,
            "recent_period_demand": 330.0,
            "previous_period_demand": 300.0
        }
    ]

    # Trend factor = 330 / 300 = 1.10
    # Base forecast = 0.5(80) + 0.3(75) = 62.5
    # Expected demand = 62.5 * 1.10 = 68.75
    forecasts = forecast_dish_demand(sales_history, history_weeks=12)
    assert "Margherita Pizza" in forecasts

    pizza_fc = forecasts["Margherita Pizza"]
    assert pizza_fc["trend_factor"] == 1.10
    assert pizza_fc["expected_demand"] == 68.75
    assert pizza_fc["reliability"] == "MEDIUM"


def test_forecast_divide_by_zero_and_extreme_clamping():
    sales_history = [
        {
            "name": "Zero Prev Dish",
            "recent_avg": 50.0,
            "same_weekday_avg": 50.0,
            "recent_period_demand": 100.0,
            "previous_period_demand": 0.0  # Prev demand 0 -> Trend 1.0
        },
        {
            "name": "Surging Dish",
            "recent_avg": 50.0,
            "same_weekday_avg": 50.0,
            "recent_period_demand": 500.0,
            "previous_period_demand": 100.0 # Trend 5.0 -> Clamped to 1.25
        }
    ]

    forecasts = forecast_dish_demand(sales_history, history_weeks=2)
    
    zero_dish = forecasts["Zero Prev Dish"]
    assert zero_dish["trend_factor"] == 1.0
    assert zero_dish["reliability"] == "LOW"

    surging_dish = forecasts["Surging Dish"]
    assert surging_dish["trend_factor"] == 1.25
    assert surging_dish["expected_demand"] == 62.5 # 50 * 1.25


def test_calculate_ingredient_requirements():
    dish_forecasts = {
        "Margherita Pizza": {"expected_demand": 100.0},
        "Chicken Alfredo": {"expected_demand": 70.0}
    }
    recipes = [
        {"menu_item": "Margherita Pizza", "ingredient": "Flour", "quantity": 0.18},
        {"menu_item": "Margherita Pizza", "ingredient": "Mozzarella", "quantity": 0.18},
        {"menu_item": "Chicken Alfredo", "ingredient": "Flour", "quantity": 0.05},
        {"menu_item": "Chicken Alfredo", "ingredient": "Chicken", "quantity": 0.25}
    ]

    # Flour = (100 * 0.18) + (70 * 0.05) = 18 + 3.5 = 21.5 kg
    # Mozzarella = (100 * 0.18) = 18.0 kg
    # Chicken = (70 * 0.25) = 17.5 kg
    reqs = calculate_ingredient_requirements(dish_forecasts, recipes)
    assert reqs["Flour"] == 21.5
    assert reqs["Mozzarella"] == 18.0
    assert reqs["Chicken"] == 17.5
