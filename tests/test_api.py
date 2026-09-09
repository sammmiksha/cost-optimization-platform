from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "Multi-Industry Business Optimization Platform API"


def test_api_data_validate():
    payload = {
        "products": [{"name": "Burger", "selling_price": 10.0}],
        "ingredients": [{"name": "Beef", "purchase_cost": 2.0}],
        "employees": [{"name": "John", "role": "Cook", "hourly_cost": 15.0}]
    }
    response = client.post("/api/v1/data/validate", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "valid"


def test_api_forecasting():
    payload = {
        "historical_sales": [],
        "products": [{"name": "Burger"}],
        "days_ahead": 3
    }
    response = client.post("/api/v1/forecasting/predict", json=payload)
    assert response.status_code == 200
    assert "Burger" in response.json()["forecasts"]


def test_api_optimization_run():
    payload = {
        "products": [{"name": "Burger", "selling_price": 12.0, "prep_time_minutes": 10.0}],
        "ingredients": [{"name": "Beef", "purchase_cost": 3.0, "current_stock": 20.0}],
        "employees": [{"name": "Chef Mario", "hourly_cost": 20.0, "available_hours": 40.0}],
        "demand_forecast": {"Burger": [50.0]},
        "objective": "maximize_profit"
    }
    response = client.post("/api/v1/optimization/run", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "financials" in response.json()["optimization_result"]
    assert "ai_explanation" in response.json()
