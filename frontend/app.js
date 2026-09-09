const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    organization: { name: "Apparel & Transport Corp", problem_type: "production_planning", currency: "INR" },
    activeDemo: "apparel",
    unitEcon: null,
    forecasts: {},
    chartInstance: null
};

function formatCurrency(val, currency = "INR") {
    if (currency === "INR") {
        if (val >= 10000000) {
            return `₹${(val / 10000000).toFixed(2)} Crore`;
        } else if (val >= 100000) {
            return `₹${(val / 100000).toFixed(2)} Lakh`;
        } else {
            return `₹${val.toLocaleString('en-IN')}`;
        }
    } else {
        return `$${val.toLocaleString('en-US')}`;
    }
}

function switchTab(sectionId) {
    const sections = ['overview', 'setup', 'data', 'forecast', 'unit-econ', 'optimize', 'scenarios', 'recommendations', 'learn'];
    sections.forEach(s => {
        const btn = document.getElementById(`tab-${s}`);
        const container = document.getElementById(`section-${s}`);
        if (s === sectionId) {
            btn.className = "nav-item nav-item-active w-full text-left px-3.5 py-2.5 rounded-r text-xs font-medium flex items-center space-x-3 transition";
            container.classList.remove("hidden");
        } else {
            btn.className = "nav-item w-full text-left px-3.5 py-2.5 rounded-r text-xs font-medium flex items-center space-x-3 transition";
            container.classList.add("hidden");
        }
    });
}

function onCurrencyChange() {
    appState.organization.currency = document.getElementById("currencySelect").value;
    if (appState.unitEcon) renderOverviewMetrics();
}

function onProblemTypeChange() {
    appState.organization.problem_type = document.getElementById("setupProblemType").value;
}

function saveDecisionSetup() {
    appState.organization.problem_type = document.getElementById("setupProblemType").value;
    switchTab('optimize');
    runMasterOptimizer();
}

async function loadDemo(demoType) {
    appState.activeDemo = demoType;
    if (demoType === "apparel") {
        appState.organization.problem_type = "production_planning";
        switchTab('optimize');
        runApparelOptimizer();
    } else if (demoType === "logistics") {
        appState.organization.problem_type = "logistics_dispatch";
        switchTab('unit-econ');
        calculateUnitEconomics();
    } else {
        appState.organization.problem_type = "workforce_scheduling";
        switchTab('optimize');
        runMasterOptimizer();
    }
}

async function calculateUnitEconomics() {
    const mat = parseFloat(document.getElementById("ueMaterial").value) || 5000;
    const dist = parseFloat(document.getElementById("ueDistance").value) || 240;
    const fuelP = parseFloat(document.getElementById("ueFuelPrice").value) || 92;
    const driverPay = parseFloat(document.getElementById("ueDriverPay").value) || 1000;
    const tolls = parseFloat(document.getElementById("ueTolls").value) || 1600;
    const price = parseFloat(document.getElementById("ueQuotedPrice").value) || 22000;

    try {
        const res = await fetch(`${API_BASE}/business/unit-economics/transport`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                material_cost: mat,
                distance_km: dist,
                mileage_km_per_liter: 3.0,
                fuel_price_per_liter: fuelP,
                driver_pay_per_round: driverPay,
                toll_cost: tolls / 2.0,
                loading_unloading_cost: tolls / 2.0,
                maintenance_allocation: 1000.0,
                quoted_customer_price: price,
                target_margin_pct: 25.0
            })
        });

        const data = await res.json();
        appState.unitEcon = data;

        document.getElementById("unitEconOutput").classList.remove("hidden");
        document.getElementById("ueBreakEven").innerText = formatCurrency(data.pricing_analysis.break_even_price, appState.organization.currency);
        document.getElementById("ueDirectCost").innerText = formatCurrency(data.cost_breakdown.total_direct_cost, appState.organization.currency);
        document.getElementById("ueContribution").innerText = formatCurrency(data.profitability_metrics.gross_contribution, appState.organization.currency);
        document.getElementById("ueRecommended").innerText = formatCurrency(data.pricing_analysis.recommended_price_target, appState.organization.currency);

        renderOverviewMetrics();
    } catch (err) {
        console.error(err);
    }
}

function renderOverviewMetrics() {
    if (!appState.unitEcon) return;
    const data = appState.unitEcon;
    const cur = appState.organization.currency;

    document.getElementById("ovRevenue").innerText = formatCurrency(data.profitability_metrics.quoted_customer_price, cur);
    document.getElementById("ovCost").innerText = formatCurrency(data.cost_breakdown.total_direct_cost, cur);
    document.getElementById("ovProfit").innerText = formatCurrency(data.profitability_metrics.gross_contribution, cur);
    document.getElementById("ovMargin").innerText = `${data.profitability_metrics.contribution_margin_percentage}%`;
}

async function runApparelOptimizer() {
    try {
        const res = await fetch(`${API_BASE}/optimization/apparel/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: 1 })
        });

        const data = await res.json();
        document.getElementById("optOutput").classList.remove("hidden");

        const fin = data.financials;
        const cur = appState.organization.currency;
        document.getElementById("optSummaryText").innerText = `Apparel Designer Production Plan: Expected Revenue ${formatCurrency(fin.expected_revenue, cur)} | Material Cost ${formatCurrency(fin.expected_material_cost, cur)} | Net Contribution ${formatCurrency(fin.expected_contribution, cur)} (${fin.contribution_margin_pct}% margin).`;
        
        const plan = data.decisions.production_plan;
        document.getElementById("optActionList").innerHTML = Object.keys(plan).map(pName => 
            `<li>Produce <strong>${plan[pName][0]} units</strong> of <strong>${pName}</strong></li>`
        ).join('');
    } catch (err) {
        console.error(err);
    }
}

async function runMasterOptimizer() {
    if (appState.activeDemo === "apparel") {
        await runApparelOptimizer();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/optimization/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: [{ name: "Classic Burger", selling_price: 15.0, prep_time_minutes: 10.0 }],
                ingredients: [{ name: "Beef", purchase_cost: 3.5, current_stock: 50.0 }],
                suppliers: [{ name: "Supplier A" }],
                employees: [{ name: "Chef Mario", hourly_cost: 25.0, available_hours: 40.0 }],
                demand_forecast: { "Classic Burger": [50.0] },
                objective: "maximize_profit"
            })
        });

        const data = await res.json();
        document.getElementById("optOutput").classList.remove("hidden");

        const fin = data.financials;
        const cur = appState.organization.currency;
        document.getElementById("optSummaryText").innerText = `Optimal plan generated expected profit of ${formatCurrency(fin.expected_profit, cur)} with an estimated ROI of ${fin.roi_percentage}%.`;
        
        document.getElementById("optActionList").innerHTML = data.ai_explanation.actionable_recommendations.map(r => 
            `<li>${r}</li>`
        ).join('');
    } catch (err) {
        console.error(err);
    }
}

async function checkDataReadiness() {
    try {
        const res = await fetch(`${API_BASE}/datasets/readiness`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: [{ name: "Dress A", selling_price: 8000 }],
                ingredients: [{ name: "Fabric", current_stock: 500 }],
                employees: [{ name: "Tailor 1", hourly_cost: 200 }]
            })
        });
        const data = await res.json();
        
        document.getElementById("readinessBox").classList.remove("hidden");
        document.getElementById("readinessDetails").innerHTML = `
            <div>Overall Quality Score: <strong class="text-emerald-400">${data.overall_score}% (${data.readiness_status})</strong></div>
            <div>Completeness: ${data.metrics.completeness}% | Validity: ${data.metrics.validity}% | Freshness: ${data.metrics.freshness}%</div>
        `;
    } catch (err) {
        console.error(err);
    }
}

async function generateForecasts() {
    try {
        const res = await fetch(`${API_BASE}/forecasting/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: [{ name: "Dress A" }, { name: "Dress B" }],
                days_ahead: 7
            })
        });
        const data = await res.json();
        renderForecastChart(data.forecasts);
    } catch (err) {
        console.error(err);
    }
}

function renderForecastChart(forecasts) {
    const ctx = document.getElementById('forecastChartCanvas').getContext('2d');
    if (appState.chartInstance) appState.chartInstance.destroy();

    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const datasets = Object.keys(forecasts).map(name => ({
        label: name,
        data: forecasts[name],
        borderColor: '#2563eb',
        borderWidth: 2,
        fill: false,
        tension: 0.3
    }));

    appState.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: days, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
                x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } },
                y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } }
            }
        }
    });
}

function updateScenLabels() {
    const f = document.getElementById("scenFuelShift").value;
    const t = document.getElementById("scenTripShift").value;

    const fPct = Math.round((f - 1.0) * 100);
    const tPct = Math.round((t - 1.0) * 100);

    document.getElementById("scenFuelLabel").innerText = `${fPct >= 0 ? '+' : ''}${fPct}% Material Cost Inflation`;
    document.getElementById("scenTripLabel").innerText = `${tPct >= 0 ? '+' : ''}${tPct}% Demand Surge`;
}

async function runScenarioStressTest() {
    runApparelOptimizer();
}

async function submitApproval(decisionStatus) {
    try {
        const res = await fetch(`${API_BASE}/approvals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                optimization_run_id: 184,
                user_id: 1,
                status: decisionStatus,
                comments: `Management decision recorded as ${decisionStatus}.`
            })
        });
        const data = await res.json();

        const box = document.getElementById("approvalStatusBox");
        box.classList.remove("hidden");
        box.innerText = `Approval Decision Recorded: ${data.decision} (Run ID #${data.run_id})`;
    } catch (err) {
        console.error(err);
    }
}

const pageDetailsMap = {
    overview: {
        title: "Overview Page — Executive Decision Summary Dashboard",
        purpose: "Provides business owners and executives with an instant snapshot of financial performance, net contribution margins, and optimization deltas across flagship industry models.",
        howItWorks: "Pulls active organization metrics and calculated decision run outputs, aggregating top-line KPIs (Expected Revenue, Material Cost, Net Contribution Margin %, Profit Variance).",
        requiredData: "Organization Name, Domain Industry Type, and Local Currency Format (INR ₹ Lakhs/Crores vs USD).",
        justification: "Executives require high-level financial summaries in standard accounting metrics before diving into micro-level operational dispatches.",
        output: "Top-line profit snapshot, margin improvement deltas, and quick-switch access to flagship industry models."
    },
    setup: {
        title: "Decision Setup Page — Problem Specification & Goals",
        purpose: "Defines the exact operational decision problem, optimization target (maximize profit vs minimize cost/waste), and decision horizon.",
        howItWorks: "Feeds configured template choices into the backend DecisionProblemBuilder to instantiate decision variables x, y, h and objective function Z = max(Revenue - Costs).",
        requiredData: "Decision Problem Template (Production Planning, Logistics Dispatch, Shift Scheduling), Optimization Goal (Maximize Profit, Minimize Cost), Planning Horizon.",
        justification: "A solver cannot optimize without a target objective and discrete planning horizon; defining these upfront ensures the algorithm aligns with strategic goals.",
        output: "Configured solver parameters, decision variable bounds, and objective expression structure."
    },
    data: {
        title: "Data Center Page — Data Ingestion & Readiness Scorecard",
        purpose: "Central hub for dataset imports, automated quality audits (Completeness, Validity, Freshness), and parameter requirement justifications.",
        howItWorks: "Passes raw datasets to DataQualityAssurance engine which runs 5 quality metrics and returns a 0–100% Data Quality Scorecard.",
        requiredData: "SKU Selling Prices, BOM Material Costs, Worker Pay Rates, Resource/Machine Limits (Mandatory); Supplier Lead Times (Recommended); Historical Sales (Optional).",
        justification: "Prevents 'garbage-in, garbage-out' optimization failures by auditing dataset completeness and verifying physical capacity limits before solver execution.",
        output: "Data Quality Scorecard %, Data Readiness Status (READY vs BLOCKED), and parameter justification table."
    },
    forecast: {
        title: "Forecasts Page — Time-Series Demand Predictions",
        purpose: "Generates time-series demand predictions with 95% confidence intervals to replace wild guessing with statistical bounds on future customer demand.",
        howItWorks: "Applies Holt-Winters / ARIMA / Ridge time-series models on historical transaction logs to predict daily demand d_hat and confidence intervals [d_low, d_high].",
        requiredData: "Historical Sales Transactions (SKU, Date, Quantity Sold, Unit Selling Price) and Demand Horizon Days.",
        justification: "Customer demand is uncertain. Forecasting provides lower and upper demand bounds so the solver optimizes production without over-producing (waste) or under-producing (stockouts).",
        output: "7-day / 30-day forecast curves, prediction intervals, and demand constraint upper bounds."
    },
    "unit-econ": {
        title: "Unit Economics Page — Direct Cost Breakdown & Pricing Calculator",
        purpose: "Calculates single-unit or single-trip cost structures (materials, labor, fuel, tolls) to compute break-even prices and recommended target pricing.",
        howItWorks: "Calculates direct trip/production costs and margin percentages even when historical sales data is missing (Guided Unit Economics Mode).",
        requiredData: "Direct Material Cost, Round Distance & Fuel Mileage (Logistics), Driver Pay Rate, Tolls & Maintenance Allocations, Quoted Customer Price.",
        justification: "Small businesses often quote prices below true break-even due to hidden operating costs (empty return trips, tolls, maintenance). Explicit unit cost breakdown protects profitability.",
        output: "Break-Even Price, Direct Trip Cost, Gross Contribution %, and Recommended Target Price (25% margin)."
    },
    optimize: {
        title: "Decision Engine Page — Solver Adapter Execution",
        purpose: "Executes CP-SAT or MIP mathematical solver adapters to compute optimal production mixes, vehicle dispatches, worker shift schedules, and resource allocations.",
        howItWorks: "Translates configured matrices into formal MILP/CP models (Z = max c^T x s.t. Ax <= b), calls Google OR-Tools solvers, and extracts optimal decision variables.",
        requiredData: "Validated Organization Datasets, Objective Function Config, and Capacity Bounds.",
        justification: "Replaces manual intuitive scheduling with mathematically proven optimal operational plans that satisfy 100% of real-world operational constraints.",
        output: "Optimal decision plan (units to produce, vehicle trip dispatches, cook shift hours), capacity utilization %, and total profit projection."
    },
    scenarios: {
        title: "What-If Scenarios Page — Parameter Sensitivity & Stress Testing",
        purpose: "Evaluates operational plan stability against fuel price hikes, material inflation, driver shortages, and demand spikes before committing capital.",
        howItWorks: "Applies percentage variance shifts to baseline cost/demand matrices, re-runs solver adapters, and generates financial diffs (Baseline vs Scenario).",
        requiredData: "Material Cost Variance %, Demand Variance %, Wage Shift %, Capacity Shock %.",
        justification: "Operating environments are volatile. Stress-testing allows management to see plan stability and financial break-even points under worst-case economic shocks.",
        output: "Baseline vs Scenario financial diffs, plan stability index, and recommended contingency adjustments."
    },
    recommendations: {
        title: "Recommendations & Review Page — Human Approval & Audit Logs",
        purpose: "Converts complex solver outputs into bulleted executive action items verified by fact-checking guardrails, with human-in-the-loop approval controls.",
        howItWorks: "Runs FactVerificationGuardrail to verify numeric claims match formulas, then presents approval controls (APPROVED/REJECTED) and logs audit events.",
        requiredData: "Manager User Identity, Role, Approval Decision (APPROVED/REJECTED), and Management Review Comments.",
        justification: "AI decision systems must maintain human control and governance. Approval logs enforce manager accountability and preserve audit trails.",
        output: "Verified action items, management approval decision log, and system audit event."
    }
};

function showPageDetail(key) {
    const details = pageDetailsMap[key] || pageDetailsMap.overview;
    const card = document.getElementById("pageDetailCard");
    if (!card) return;

    Object.keys(pageDetailsMap).forEach(k => {
        const btn = document.getElementById(`pbtn-${k}`);
        if (btn) {
            if (k === key) {
                btn.className = "px-3 py-1.5 rounded bg-blue-950 border border-blue-700 text-blue-300 font-mono text-xs font-semibold";
            } else {
                btn.className = "px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono text-xs hover:text-slate-200";
            }
        }
    });

    card.innerHTML = `
        <div class="font-bold text-slate-200 text-sm mb-2">${details.title}</div>
        <div class="space-y-2 text-slate-300">
            <div><strong class="text-blue-400 font-mono uppercase">01. Core Purpose:</strong> ${details.purpose}</div>
            <div><strong class="text-emerald-400 font-mono uppercase">02. How It Works:</strong> ${details.howItWorks}</div>
            <div><strong class="text-amber-400 font-mono uppercase">03. Required Org Data:</strong> <span class="text-slate-200 font-mono">${details.requiredData}</span></div>
            <div><strong class="text-rose-400 font-mono uppercase">04. Business Justification:</strong> ${details.justification}</div>
            <div><strong class="text-indigo-400 font-mono uppercase">05. Decision Output:</strong> ${details.output}</div>
        </div>
    `;
}

window.addEventListener('DOMContentLoaded', () => {
    runApparelOptimizer();
    showPageDetail('overview');
});

