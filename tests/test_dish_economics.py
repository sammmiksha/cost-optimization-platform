from backend.app.optimization.economics.dish_economics import calculate_dish_economics


def test_margherita_pizza_economics():
    menu_items = [
        {"id": "M001", "name": "Margherita Pizza", "selling_price": 450.0}
    ]
    ingredients = [
        {"name": "Flour", "purchase_cost": 55.0},         # 0.18kg -> 9.90
        {"name": "Mozzarella", "purchase_cost": 320.0},     # 0.18kg -> 57.60
        {"name": "Tomato Sauce", "purchase_cost": 112.0},   # 0.05kg -> 5.60
        {"name": "Basil", "purchase_cost": 175.0},          # 0.01kg -> 1.75
        {"name": "Olive Oil", "purchase_cost": 325.0}       # 0.02kg -> 6.50
    ]
    recipes = [
        {"menu_item": "Margherita Pizza", "ingredient": "Flour", "quantity": 0.18},
        {"menu_item": "Margherita Pizza", "ingredient": "Mozzarella", "quantity": 0.18},
        {"menu_item": "Margherita Pizza", "ingredient": "Tomato Sauce", "quantity": 0.05},
        {"menu_item": "Margherita Pizza", "ingredient": "Basil", "quantity": 0.01},
        {"menu_item": "Margherita Pizza", "ingredient": "Olive Oil", "quantity": 0.02}
    ]
    sales_data = [
        {"menu_item": "Margherita Pizza", "units_sold": 100}
    ]

    results = calculate_dish_economics(menu_items, recipes, ingredients, sales_data)
    assert len(results) == 1

    pizza = results[0]
    assert pizza["name"] == "Margherita Pizza"
    assert pizza["selling_price"] == 450.0
    # Expected cost ~ 9.90 + 57.60 + 5.60 + 1.75 + 6.50 = 81.35
    assert pizza["ingredient_cost"] == 81.35
    assert pizza["contribution"] == 368.65
    assert pizza["total_contribution"] == 36865.0
    assert pizza["is_negative_contribution"] is False


def test_ranking_by_total_contribution_over_margin_pct():
    menu_items = [
        {"id": "M001", "name": "Truffle Pasta (Dish A)", "selling_price": 500.0, "food_cost": 100.0}, # Margin 80%, sold 2
        {"id": "M002", "name": "Classic Burger (Dish B)", "selling_price": 400.0, "food_cost": 120.0}  # Margin 70%, sold 200
    ]
    sales_data = {
        "Truffle Pasta (Dish A)": 2,
        "Classic Burger (Dish B)": 200
    }

    results = calculate_dish_economics(menu_items, sales_data=sales_data)

    # Dish B total contribution = 200 * 280 = 56,000
    # Dish A total contribution = 2 * 400 = 800
    assert results[0]["name"] == "Classic Burger (Dish B)"
    assert results[0]["total_contribution"] == 56000.0
    assert results[1]["name"] == "Truffle Pasta (Dish A)"
    assert results[1]["total_contribution"] == 800.0


def test_negative_contribution_flag():
    menu_items = [
        {"id": "M003", "name": "Overpriced Premium Steak", "selling_price": 300.0, "food_cost": 340.0}
    ]

    results = calculate_dish_economics(menu_items)
    steak = results[0]

    assert steak["is_negative_contribution"] is True
    assert steak["warning"] == "Negative contribution — Review recipe cost or menu price"
    assert steak["contribution"] == -40.0
