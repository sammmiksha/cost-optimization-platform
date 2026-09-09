from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()


def test_api_auth_register_login():
    import uuid
    unique_email = f"testuser_{uuid.uuid4().hex[:6]}@example.com"
    reg_payload = {
        "org_name": "Test Enterprise",
        "industry": "restaurant",
        "full_name": "Test User",
        "email": unique_email,
        "password": "securepassword123"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code == 200
    assert "access_token" in res_reg.json()

    login_payload = {
        "email": unique_email,
        "password": "securepassword123"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()


def test_api_data_readiness():
    payload = {
        "products": [{"name": "Burger", "selling_price": 10.0}],
        "ingredients": [{"name": "Beef", "current_stock": 20.0}],
        "employees": [{"name": "Cook", "hourly_cost": 15.0}]
    }
    response = client.post("/api/v1/datasets/readiness", json=payload)
    assert response.status_code == 200
    assert response.json()["readiness_status"] == "READY"


def test_api_optimization_run():
    payload = {
        "products": [{"name": "Burger", "selling_price": 12.0, "prep_time_minutes": 10.0}],
        "ingredients": [{"name": "Beef", "purchase_cost": 3.0, "current_stock": 20.0}],
        "suppliers": [{"name": "Supplier A"}, {"name": "Supplier B"}],
        "employees": [{"name": "Chef Mario", "hourly_cost": 20.0, "available_hours": 40.0}],
        "demand_forecast": {"Burger": [50.0]},
        "objective": "maximize_profit"
    }
    response = client.post("/api/v1/optimization/runs", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "financials" in response.json()
    assert "ai_explanation" in response.json()
    assert "sensitivity_analysis" in response.json()
