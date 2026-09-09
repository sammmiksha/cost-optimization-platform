from backend.app.optimization.engine import BusinessOptimizationEngine
from backend.app.forecasting.engine import DemandForecaster


def test_demand_forecaster():
    forecaster = DemandForecaster()
    products = [{"name": "Burger"}, {"name": "Pizza"}]
    sales = [
        {"date": "2026-09-01", "product_name": "Burger", "quantity_sold": 50},
        {"date": "2026-09-02", "product_name": "Burger", "quantity_sold": 55},
        {"date": "2026-09-03", "product_name": "Burger", "quantity_sold": 60},
        {"date": "2026-09-04", "product_name": "Burger", "quantity_sold": 52},
        {"date": "2026-09-05", "product_name": "Burger", "quantity_sold": 58},
    ]
    forecasts = forecaster.forecast_demand(sales, products, days_ahead=3)
    assert "Burger" in forecasts
    assert len(forecasts["Burger"]) == 3
    assert all(val > 0 for val in forecasts["Burger"])


def test_business_optimization_engine():
    products = [
        {"name": "Burger", "selling_price": 12.0, "prep_time_minutes": 10.0, "ingredient_requirements": {"Beef": 0.2}},
        {"name": "Pizza", "selling_price": 18.0, "prep_time_minutes": 15.0, "ingredient_requirements": {"Cheese": 0.3}}
    ]
    ingredients = [
        {"name": "Beef", "purchase_cost": 5.0, "current_stock": 50.0},
        {"name": "Cheese", "purchase_cost": 4.0, "current_stock": 40.0}
    ]
    employees = [
        {"name": "Chef Mario", "hourly_cost": 20.0, "available_hours": 40.0}
    ]
    forecast = {
        "Burger": [50.0],
        "Pizza": [30.0]
    }

    engine = BusinessOptimizationEngine(objective="maximize_profit")
    result = engine.solve(products, ingredients, employees, forecast, days=1)

    assert result["status"] in ["optimal", "feasible"]
    assert "financials" in result
    assert result["financials"]["expected_profit"] > 0
    assert "decisions" in result
    assert "production_plan" in result["decisions"]
