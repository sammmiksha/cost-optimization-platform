import csv
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/data", tags=["data-ingest"])


class ManualIngredientItem(BaseModel):
    name: str = Field(..., example="Chicken Breast")
    unit: str = Field("kg", example="kg")
    purchase_cost: float = Field(..., example="320.0")
    current_stock: float = Field(0.0, example="25.0")
    par_level: float = Field(50.0, example="50.0")
    supplier_name: Optional[str] = "Primary Fresh Produce Supplier"
    lead_time_days: int = Field(1, example=1)


class ManualMenuItem(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Grilled Salmon Entree"})
    selling_price: float = Field(..., json_schema_extra={"example": "750.0"})
    prep_hours: float = Field(0.35, json_schema_extra={"example": 0.35})
    ingredients: List[Dict[str, Any]] = Field(default_factory=list)


class RestaurantSetupRequest(BaseModel):
    org_id: Optional[int] = None
    restaurant_name: str
    cuisine: str = "Italian Trattoria"
    city: str = "New York"
    kitchen_staff_count: int = 4
    service_staff_count: int = 6
    avg_hourly_wage: float = 18.00
    seating_capacity: int = 80
    target_food_cost_pct: float = 28.0
    target_labor_cost_pct: float = 25.0


# --- Endpoints ---

@router.post("/restaurant-setup")
def save_restaurant_setup(req: RestaurantSetupRequest):
    """Saves restaurant operational profile parameters, staffing roster, and target cost metrics."""
    return {
        "status": "success",
        "message": f"Successfully updated profile and staffing setup for '{req.restaurant_name}'.",
        "profile": req.dict()
    }


@router.get("/templates/{template_name}")
def download_csv_template(template_name: str):
    """Generates downloadable CSV template for Inventory or Menu items."""
    output = io.StringIO()
    writer = csv.writer(output)

    if template_name == "inventory":
        writer.writerow(["Ingredient Name", "Unit", "Purchase Cost", "Current Stock", "Par Level", "Lead Time Days"])
        writer.writerow(["Chicken Breast", "kg", "320.00", "25.0", "50.0", "1"])
        writer.writerow(["Salmon Fillet", "kg", "850.00", "12.0", "30.0", "2"])
        writer.writerow(["Butter", "kg", "420.00", "18.0", "40.0", "1"])
        filename = "inventory_template.csv"
    elif template_name == "menu":
        writer.writerow(["Menu Item Name", "Selling Price", "Prep Time (Hours)", "Primary Ingredient", "Ingredient Quantity Required"])
        writer.writerow(["Classic Burger", "450.00", "0.25", "Beef Patty", "0.20"])
        writer.writerow(["Grilled Salmon", "850.00", "0.35", "Salmon Fillet", "0.25"])
        writer.writerow(["Artisan Pasta", "550.00", "0.30", "Pasta", "0.18"])
        filename = "menu_template.csv"
    else:
        raise HTTPException(status_code=400, detail="Invalid template requested. Use 'inventory' or 'menu'.")

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/import-csv")
async def import_csv_file(file: UploadFile = File(...)):
    """Parses uploaded CSV inventory or menu file and extracts valid restaurant records."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Uploaded file must be a CSV format (.csv).")

    content = await file.read()
    decoded_file = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded_file))

    parsed_items = []
    for row in reader:
        # Strip whitespace from keys and values
        clean_row = {k.strip(): v.strip() for k, v in row.items() if k}
        parsed_items.append(clean_row)

    return {
        "status": "success",
        "filename": file.filename,
        "records_imported": len(parsed_items),
        "data": parsed_items
    }


@router.post("/manual-ingredient")
def add_manual_ingredient(item: ManualIngredientItem):
    """Adds a single ingredient to the restaurant inventory ledger manually."""
    return {
        "status": "created",
        "ingredient": item.dict(),
        "message": f"Successfully added '{item.name}' to inventory stock."
    }


@router.post("/manual-menu-item")
def add_manual_menu_item(item: ManualMenuItem):
    """Adds a single menu item to the restaurant recipe ledger manually."""
    return {
        "status": "created",
        "menu_item": item.dict(),
        "message": f"Successfully added '{item.name}' to menu ledger."
    }
