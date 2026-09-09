# Multi-Industry Business Optimization Platform 🚀

An enterprise optimization platform that combines **Machine Learning (Predictive Demand Forecasting)**, **Mixed-Integer Linear Programming (MILP Solver via Google OR-Tools)**, and an **AI Natural Language Explanation Layer** to generate actionable, cost-effective operational decisions.

---

## 🌟 Architecture Overview

```text
                    ORGANIZATION
                         │
                         ▼
                ┌─────────────────┐
                │ Create Account  │
                │ & Organization  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Data Ingestion  │
                │ & Validation    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ ML Demand       │
                │ Forecasting     │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ MILP Solver     │
                │ (OR-Tools)      │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ AI Explanation  │
                │ & ROI Dashboard │
                └─────────────────┘
```

---

## 🔑 Core Features

1. **Multi-Industry Support**: Modular domain models for Restaurant, Retail, Manufacturing, and Logistics operations.
2. **Data Cleaning & Ingestion Pipeline**: Automated unit conversion, missing field resolution, and anomaly detection.
3. **ML Demand Forecasting**: Time-series demand predictions powered by `scikit-learn` Random Forest regressors.
4. **MILP Decision Engine**: Google OR-Tools CBC solver handling complex operational constraints (budget limits, prep time, shelf-life, staff availability, ingredient stock).
5. **Constraint Infeasibility Diagnosis**: Automated diagnostic feedback when constraints are over-constrained or conflicting.
6. **"What-If" Scenario Stress Testing**: Interactive parameter perturbation simulator (demand shifts, supplier price inflation, wage adjustments).
7. **AI Recommendation Layer**: Natural language executive summaries, rationale bullet points, and plan comparisons (Recommended vs Lowest Cost vs Max Revenue).
8. **Multi-Branch Network Optimizer**: Inter-branch stock transfer optimization vs new supplier procurement.
9. **Interactive Dashboard**: Modern dark-mode Single Page Application UI with Chart.js visualization.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install ortools pandas numpy scikit-learn fastapi uvicorn pydantic sqlalchemy pytest
```

### 2. Run Backend Server
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```
FastAPI Interactive Swagger Docs available at: `http://127.0.0.1:8000/docs`

### 3. Launch Frontend Dashboard
Open `frontend/index.html` directly in any web browser.

### 4. Run Automated Test Suite
```bash
python -m pytest tests/
```

---

## 📁 Repository Structure

```text
├── backend/
│   └── app/
│       ├── db/               # SQLAlchemy ORM models & SQLite/PostgreSQL setup
│       ├── data_ingestion/   # Data validation and quality cleaning pipeline
│       ├── forecasting/      # Machine learning time-series demand forecasting
│       ├── optimization/     # MILP OR-Tools solver, infeasibility & network transfer engines
│       ├── industries/       # Industry plugin modules (Restaurant, Retail)
│       ├── scenarios/        # What-If scenario stress-test simulator
│       ├── recommendations/  # AI natural language explanation engine
│       └── main.py           # FastAPI application entrypoint & API endpoints
├── frontend/
│   ├── index.html            # Dashboard Single Page Application
│   └── app.js                # Frontend logic & API client integration
├── tests/                    # Comprehensive Pytest test suites
├── roadmap.md                # Project architectural blueprint & roadmap
└── README.md
```
