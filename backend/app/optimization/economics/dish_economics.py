from typing import List, Dict, Any, Union, Optional


def calculate_dish_economics(
    menu_items: List[Dict[str, Any]],
    recipes: Optional[List[Dict[str, Any]]] = None,
    ingredients: Optional[List[Dict[str, Any]]] = None,
    sales_data: Optional[Union[List[Dict[str, Any]], Dict[str, float]]] = None
) -> List[Dict[str, Any]]:
    """
    Calculates the unit economics, margin percentages, total monetary contribution,
    and negative contribution warnings for all menu items.

    Args:
        menu_items: List of menu item dicts or objects with 'name'/'id', 'selling_price'.
        recipes: Optional list of recipe link dicts specifying ingredient quantities per dish.
        ingredients: Optional list of ingredient dicts with 'name'/'id' and 'purchase_cost'.
        sales_data: Optional list or dict of sales numbers per dish in the period.

    Returns:
        List of dish economics dictionaries sorted by total_contribution descending.
    """
    recipes = recipes or []
    ingredients = ingredients or []
    sales_map = {}

    # Standardize sales_data into a dict: dish_identifier -> units_sold
    if sales_data:
        if isinstance(sales_data, dict):
            sales_map = sales_data
        elif isinstance(sales_data, list):
            for s in sales_data:
                key = s.get("name") or s.get("menu_item") or s.get("menu_item_id")
                units = float(s.get("units_sold") or s.get("quantity") or s.get("sales", 0.0))
                if key:
                    sales_map[key] = units

    # Map ingredients by name/id -> purchase_cost
    ing_cost_map = {}
    for ing in ingredients:
        ing_id = ing.get("id")
        ing_name = ing.get("name")
        cost = float(ing.get("purchase_cost") or ing.get("cost") or 0.0)
        if ing_id is not None:
            ing_cost_map[ing_id] = cost
            ing_cost_map[str(ing_id)] = cost
        if ing_name:
            ing_cost_map[ing_name] = cost

    # Map recipes by dish name/id -> list of (ingredient_key, qty)
    recipe_map = {}
    for r in recipes:
        dish_key = r.get("menu_item") or r.get("menu_item_name") or r.get("menu_item_id")
        ing_key = r.get("ingredient") or r.get("ingredient_name") or r.get("ingredient_id")
        qty = float(r.get("quantity") or r.get("quantity_per_dish") or 0.0)

        if dish_key and ing_key:
            recipe_map.setdefault(dish_key, []).append((ing_key, qty))

    results = []

    for item in menu_items:
        item_id = item.get("id")
        item_name = item.get("name", "Unknown Dish")
        price = float(item.get("selling_price") or item.get("price") or 0.0)

        # Determine ingredient cost
        calc_ing_cost = 0.0
        has_recipe = False

        # Look up recipe by item_name or item_id
        dish_recipes = recipe_map.get(item_name) or (recipe_map.get(item_id) if item_id else None)
        
        # Check embedded recipe items on item dict if present
        if not dish_recipes and "recipe_items" in item and isinstance(item["recipe_items"], list):
            dish_recipes = []
            for ri in item["recipe_items"]:
                ing_k = ri.get("ingredient_name") or ri.get("ingredient_id") or ri.get("ingredient")
                q = float(ri.get("quantity_per_dish") or ri.get("quantity") or 0.0)
                if ing_k:
                    dish_recipes.append((ing_k, q))

        if dish_recipes:
            has_recipe = True
            for ing_k, qty in dish_recipes:
                unit_c = ing_cost_map.get(ing_k, 0.0)
                calc_ing_cost += (qty * unit_c)

        # Fallback to direct food_cost attribute if recipe lookup returned 0 or wasn't provided
        if not has_recipe or calc_ing_cost == 0.0:
            calc_ing_cost = float(item.get("food_cost") or item.get("ingredient_cost") or calc_ing_cost)

        contribution = price - calc_ing_cost
        margin_pct = (contribution / price * 100.0) if price > 0 else 0.0

        # Look up units sold
        units_sold = float(
            sales_map.get(item_name) or 
            (sales_map.get(item_id) if item_id else 0.0) or 
            item.get("units_sold") or 
            0.0
        )

        total_contribution = units_sold * contribution
        is_negative_contribution = contribution < 0.0

        results.append({
            "menu_item_id": item_id,
            "name": item_name,
            "selling_price": round(price, 2),
            "ingredient_cost": round(calc_ing_cost, 2),
            "contribution": round(contribution, 2),
            "contribution_margin_pct": round(margin_pct, 2),
            "units_sold": int(units_sold),
            "total_contribution": round(total_contribution, 2),
            "is_negative_contribution": is_negative_contribution,
            "warning": "Negative contribution — Review recipe cost or menu price" if is_negative_contribution else None
        })

    # Sort dishes by total monetary contribution descending, then by unit contribution descending
    results.sort(key=lambda d: (d["total_contribution"], d["contribution"]), reverse=True)
    return results
