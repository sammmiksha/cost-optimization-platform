from backend.app.data_ingestion.validator import DataValidator


def test_validate_products():
    raw_products = [
        {"Selling Price": "12.50", "Preparation Time": 15, "name": "Burger"},
        {"selling_price": -5.0, "name": "Burger"},  # Duplicate + negative price
        {"selling_price": 20.0, "name": "Pizza"}
    ]
    cleaned, issues = DataValidator.validate_products(raw_products)
    assert len(cleaned) == 2
    assert cleaned[0]["name"] == "Burger"
    assert cleaned[0]["selling_price"] == 12.50
    assert len(issues) > 0


def test_validate_ingredients():
    raw_ingredients = [
        {"Ingredient": "Cheese", "Unit": "grams", "Purchase Cost": 5.0, "Current Stock": 500},
        {"name": "Beef Patty", "unit": "kg", "purchase_cost": -2.0, "current_stock": -10}
    ]
    cleaned, issues = DataValidator.validate_ingredients(raw_ingredients)
    assert len(cleaned) == 2
    assert cleaned[0]["unit"] == "kg"
    assert cleaned[0]["current_stock"] == 0.5  # 500 grams converted to 0.5 kg
    assert cleaned[1]["current_stock"] == 0.0


def test_validate_employees():
    raw_employees = [
        {"name": "Alice", "role": "Cook", "hourly_cost": 20.0},
        {"name": "Bob", "role": "Cashier"}  # Missing wage
    ]
    cleaned, issues = DataValidator.validate_employees(raw_employees)
    assert len(cleaned) == 2
    assert cleaned[1]["hourly_cost"] == 15.0  # Defaulted
    assert len(issues) == 1
