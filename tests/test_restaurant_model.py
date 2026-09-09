from backend.app.industries.restaurant.plugin import RestaurantPlugin


def test_restaurant_plugin_multi_supplier_optimization():
    products = [
        {"name": "Classic Burger", "selling_price": 15.0, "prep_time_minutes": 10.0, "ingredient_requirements": {"Beef": 0.2}},
        {"name": "Deluxe Pizza", "selling_price": 22.0, "prep_time_minutes": 15.0, "ingredient_requirements": {"Cheese": 0.3}}
    ]
    ingredients = [
        {"name": "Beef", "purchase_cost": 4.50, "current_stock": 50.0, "min_stock": 10.0},
        {"name": "Cheese", "purchase_cost": 3.80, "current_stock": 40.0, "min_stock": 5.0}
    ]
    suppliers = [
        {"name": "Prime Meats Co", "rating": 4.9},
        {"name": "Fresh Bakery & Dairy", "rating": 4.8}
    ]
    employees = [
        {"name": "Head Chef Mario", "role": "Cook", "hourly_cost": 25.0, "available_hours": 40.0, "skills": ["Cook"]},
        {"name": "Cashier Sarah", "role": "Cashier", "hourly_cost": 15.0, "available_hours": 30.0, "skills": ["Cashier"]}
    ]
    demand_forecast = {
        "Classic Burger": [60.0],
        "Deluxe Pizza": [35.0]
    }

    plugin = RestaurantPlugin()
    res = plugin.solve_restaurant_model(
        products=products,
        ingredients=ingredients,
        suppliers=suppliers,
        employees=employees,
        demand_forecast=demand_forecast,
        objective_type="maximize_profit",
        days=1
    )

    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert "financials" in res
    assert res["financials"]["expected_profit"] > 0
    assert "supplier_allocation" in res["decisions"]
    assert "Prime Meats Co" in res["decisions"]["supplier_allocation"]["Beef"]
