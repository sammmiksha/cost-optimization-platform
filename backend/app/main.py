from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from backend.app.db.database import Base, engine
from backend.app.data_ingestion.validator import DataValidator
from backend.app.forecasting.engine import DemandForecaster
from backend.app.optimization.engine import BusinessOptimizationEngine
from backend.app.optimization.infeasibility import InfeasibilityAnalyzer
from backend.app.scenarios.simulator import ScenarioSimulator
from backend.app.recommendations.explainer import RecommendationExplainer
from backend.app.optimization.network import MultiBranchNetworkOptimizer

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Multi-Industry Business Optimization Platform API",
    description="Enterprise optimization platform powered by ML Forecasting, MILP Solver, and AI Explanation Layer.",
    version="1.0.0"
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Schemas ---
class OrganizationCreate(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "ABC Foods Pvt Ltd"})
    industry: str = Field(default="restaurant", json_schema_extra={"example": "restaurant"})
    locations_count: int = Field(default=1, json_schema_extra={"example": 5})
    employees_count: int = Field(default=50, json_schema_extra={"example": 50})
    currency: str = Field(default="USD", json_schema_extra={"example": "USD"})
    default_objective: str = Field(default="maximize_profit", json_schema_extra={"example": "maximize_profit"})


class DataValidationRequest(BaseModel):
    products: List[Dict[str, Any]] = []
    ingredients: List[Dict[str, Any]] = []
    employees: List[Dict[str, Any]] = []


class ForecastRequest(BaseModel):
    historical_sales: List[Dict[str, Any]] = []
    products: List[Dict[str, Any]] = []
    days_ahead: int = 7


class OptimizationRequest(BaseModel):
    products: List[Dict[str, Any]]
    ingredients: List[Dict[str, Any]]
    employees: List[Dict[str, Any]]
    demand_forecast: Dict[str, List[float]]
    objective: str = "maximize_profit"
    days: int = 1
    constraints_config: Optional[Dict[str, Any]] = None


class ScenarioRequest(BaseModel):
    products: List[Dict[str, Any]]
    ingredients: List[Dict[str, Any]]
    employees: List[Dict[str, Any]]
    demand_forecast: Dict[str, List[float]]
    scenario_params: Dict[str, float]  # e.g., {"demand_multiplier": 1.2, "supplier_cost_multiplier": 1.15}
    objective: str = "maximize_profit"
    days: int = 1
    constraints_config: Optional[Dict[str, Any]] = None


class NetworkRequest(BaseModel):
    branches: List[Dict[str, Any]]
    transfer_cost_matrix: Dict[str, Dict[str, float]]
    unit_procurement_cost: float = 10.0


# --- Endpoints ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Multi-Industry Business Optimization Platform API",
        "version": "1.0.0"
    }


@app.post("/api/v1/organizations")
def create_organization(org: OrganizationCreate):
    return {
        "status": "created",
        "organization_id": 1,
        "details": org.model_dump()
    }


@app.post("/api/v1/data/validate")
def validate_data(req: DataValidationRequest):
    clean_products, p_issues = DataValidator.validate_products(req.products)
    clean_ingredients, i_issues = DataValidator.validate_ingredients(req.ingredients)
    clean_employees, e_issues = DataValidator.validate_employees(req.employees)

    all_issues = p_issues + i_issues + e_issues
    return {
        "status": "valid" if not all_issues else "valid_with_warnings",
        "cleaned_data": {
            "products": clean_products,
            "ingredients": clean_ingredients,
            "employees": clean_employees
        },
        "issues_found": all_issues
    }


@app.post("/api/v1/forecasting/predict")
def predict_demand(req: ForecastRequest):
    forecaster = DemandForecaster()
    forecasts = forecaster.forecast_demand(
        historical_sales=req.historical_sales,
        products=req.products,
        days_ahead=req.days_ahead
    )
    return {
        "status": "success",
        "days_ahead": req.days_ahead,
        "forecasts": forecasts
    }


@app.post("/api/v1/optimization/run")
def run_optimization(req: OptimizationRequest):
    engine = BusinessOptimizationEngine(objective=req.objective)
    result = engine.solve(
        products=req.products,
        ingredients=req.ingredients,
        employees=req.employees,
        demand_forecast=req.demand_forecast,
        days=req.days,
        constraints_config=req.constraints_config
    )

    if result.get("status") == "infeasible":
        diagnosis = InfeasibilityAnalyzer.diagnose(
            products=req.products,
            ingredients=req.ingredients,
            employees=req.employees,
            demand_forecast=req.demand_forecast,
            days=req.days,
            constraints_config=req.constraints_config
        )
        return {
            "status": "infeasible",
            "optimization_result": result,
            "infeasibility_diagnosis": diagnosis
        }

    explanation = RecommendationExplainer.generate_explanation(
        optimization_result=result,
        products=req.products,
        ingredients=req.ingredients,
        employees=req.employees,
        demand_forecast=req.demand_forecast
    )

    return {
        "status": "success",
        "optimization_result": result,
        "ai_explanation": explanation
    }


@app.post("/api/v1/scenarios/simulate")
def simulate_scenario(req: ScenarioRequest):
    engine = BusinessOptimizationEngine(objective=req.objective)
    simulator = ScenarioSimulator(optimizer=engine)
    res = simulator.run_scenario(
        products=req.products,
        ingredients=req.ingredients,
        employees=req.employees,
        demand_forecast=req.demand_forecast,
        scenario_params=req.scenario_params,
        days=req.days,
        constraints_config=req.constraints_config
    )
    return res


@app.post("/api/v1/network/optimize")
def optimize_network(req: NetworkRequest):
    net_optimizer = MultiBranchNetworkOptimizer()
    res = net_optimizer.solve_network_transfers(
        branches=req.branches,
        transfer_cost_matrix=req.transfer_cost_matrix,
        unit_procurement_cost=req.unit_procurement_cost
    )
    return res
