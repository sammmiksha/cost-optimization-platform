import pandas as pd
from typing import Dict, List, Any, Tuple


class DataValidator:
    """
    Data validation and cleaning pipeline for business data (Sales, Products, Inventory, Employees, Suppliers).
    Ensures input data quality prior to forecasting and optimization.
    """

    @staticmethod
    def validate_products(products_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        cleaned = []
        issues = []
        seen_names = set()

        for idx, row in enumerate(products_data):
            name = row.get("name") or row.get("Product Name") or f"Product_{idx+1}"
            name = str(name).strip()

            if name in seen_names:
                issues.append(f"Row {idx+1}: Duplicate product '{name}' ignored.")
                continue
            seen_names.add(name)

            price = row.get("selling_price") if "selling_price" in row else row.get("Selling Price", 0.0)
            try:
                price = float(price)
            except (ValueError, TypeError):
                price = 0.0
                issues.append(f"Product '{name}': Invalid price converted to 0.0.")

            if price < 0:
                issues.append(f"Product '{name}': Negative price ({price}) reset to 0.0.")
                price = 0.0

            prep_time = row.get("prep_time_minutes") if "prep_time_minutes" in row else row.get("Preparation Time", 10.0)
            try:
                prep_time = float(prep_time)
            except (ValueError, TypeError):
                prep_time = 10.0

            reqs = row.get("ingredient_requirements") or row.get("Ingredient Requirements") or {}
            if not isinstance(reqs, dict):
                reqs = {}

            cleaned.append({
                "name": name,
                "selling_price": price,
                "prep_time_minutes": max(1.0, prep_time),
                "category": row.get("category") or "General",
                "ingredient_requirements": reqs
            })

        return cleaned, issues

    @staticmethod
    def validate_ingredients(ingredients_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        cleaned = []
        issues = []
        seen_names = set()

        for idx, row in enumerate(ingredients_data):
            name = row.get("name") or row.get("Ingredient") or f"Ingredient_{idx+1}"
            name = str(name).strip()

            if name in seen_names:
                issues.append(f"Row {idx+1}: Duplicate ingredient '{name}' skipped.")
                continue
            seen_names.add(name)

            unit = str(row.get("unit") or row.get("Unit", "kg")).strip().lower()
            unit_multiplier = 1.0
            if unit in ["g", "gram", "grams"]:
                unit = "kg"
                unit_multiplier = 0.001
                issues.append(f"Ingredient '{name}': Unit '{row.get('unit')}' standardized to 'kg'.")

            cost = row.get("purchase_cost") if "purchase_cost" in row else row.get("Purchase Cost", 0.0)
            try:
                cost = float(cost) / unit_multiplier
            except (ValueError, TypeError):
                cost = 1.0
                issues.append(f"Ingredient '{name}': Missing cost default to 1.0.")

            stock = row.get("current_stock") if "current_stock" in row else row.get("Current Stock", 0.0)
            try:
                stock = float(stock) * unit_multiplier
            except (ValueError, TypeError):
                stock = 0.0

            if stock < 0:
                issues.append(f"Ingredient '{name}': Negative stock ({stock}) corrected to 0.0.")
                stock = 0.0

            shelf_life = row.get("shelf_life_days") if "shelf_life_days" in row else row.get("Shelf Life", 7)
            try:
                shelf_life = int(shelf_life)
            except (ValueError, TypeError):
                shelf_life = 7

            cleaned.append({
                "name": name,
                "unit": unit,
                "purchase_cost": max(0.01, cost),
                "supplier": str(row.get("supplier") or row.get("Supplier", "Default Supplier")),
                "shelf_life_days": max(1, shelf_life),
                "current_stock": stock,
                "min_stock": max(0.0, float(row.get("min_stock", 0.0))),
                "max_stock": max(100.0, float(row.get("max_stock", 1000.0)))
            })

        return cleaned, issues

    @staticmethod
    def validate_employees(employees_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        cleaned = []
        issues = []

        for idx, row in enumerate(employees_data):
            name = str(row.get("name") or row.get("Employee Name") or f"Employee_{idx+1}").strip()
            role = str(row.get("role") or row.get("Role") or "Staff").strip()

            wage = row.get("hourly_cost") if "hourly_cost" in row else row.get("Hourly Cost")
            if wage is None or wage == "":
                wage = 15.0  # Default benchmark wage if missing
                issues.append(f"Employee '{name}': Hourly wage missing. Defaulted to $15.00/hr.")
            else:
                try:
                    wage = float(wage)
                except (ValueError, TypeError):
                    wage = 15.0
                    issues.append(f"Employee '{name}': Invalid hourly wage. Defaulted to $15.00/hr.")

            if wage <= 0:
                wage = 15.0
                issues.append(f"Employee '{name}': Non-positive wage reset to $15.00/hr.")

            hours = row.get("available_hours") if "available_hours" in row else row.get("Available Hours", 40.0)
            try:
                hours = float(hours)
            except (ValueError, TypeError):
                hours = 40.0

            cleaned.append({
                "name": name,
                "role": role,
                "hourly_cost": wage,
                "available_hours": max(0.0, min(80.0, hours)),
                "skills": row.get("skills") or [role]
            })

        return cleaned, issues
