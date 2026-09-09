const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    organization: { name: "Enterprise Operations Corp", industry: "restaurant", locations: 5, currency: "USD" },
    products: [],
    ingredients: [],
    employees: [],
    forecasts: {},
    chartInstance: null
};

function switchTab(stageId) {
    const stages = ['setup', 'data', 'forecast', 'optimization', 'scenarios', 'network'];
    stages.forEach(s => {
        const btn = document.getElementById(`tab-${s}`);
        const container = document.getElementById(`stage-${s}`);
        if (s === stageId) {
            btn.className = "sidebar-item sidebar-item-active w-full text-left px-3.5 py-2.5 rounded-r-md text-xs font-medium flex items-center space-x-3 transition";
            container.classList.remove("hidden");
        } else {
            btn.className = "sidebar-item w-full text-left px-3.5 py-2.5 rounded-r-md text-xs font-medium flex items-center space-x-3 transition";
            container.classList.add("hidden");
        }
    });
}

function onOrgIndustryChange() {
    const ind = document.getElementById("orgIndustry").value;
    document.getElementById("industrySelect").value = ind;
    appState.organization.industry = ind;
}

function onIndustryChange() {
    const ind = document.getElementById("industrySelect").value;
    document.getElementById("orgIndustry").value = ind;
    appState.organization.industry = ind;
}

function saveOrgProfile() {
    appState.organization.name = document.getElementById("orgName").value;
    appState.organization.locations = parseInt(document.getElementById("orgLocations").value) || 1;
    appState.organization.currency = document.getElementById("orgCurrency").value;
    switchTab('data');
    if (appState.products.length === 0) {
        loadStandardDataset();
    }
}

function loadStandardDataset() {
    appState.products = [
        { name: "Product A (Standard)", selling_price: 15.00, prep_time_minutes: 10, category: "Core", ingredient_requirements: { "Material Alpha": 1, "Material Beta": 2 } },
        { name: "Product B (Premium)", selling_price: 25.00, prep_time_minutes: 18, category: "Premium", ingredient_requirements: { "Material Alpha": 2, "Material Gamma": 1 } },
        { name: "Product C (Economy)", selling_price: 8.50, prep_time_minutes: 6, category: "Volume", ingredient_requirements: { "Material Beta": 1 } }
    ];

    appState.ingredients = [
        { name: "Material Alpha", unit: "kg", purchase_cost: 4.50, supplier: "Supplier 101", current_stock: 120 },
        { name: "Material Beta", unit: "unit", purchase_cost: 1.20, supplier: "Supplier 102", current_stock: 350 },
        { name: "Material Gamma", unit: "unit", purchase_cost: 3.80, supplier: "Supplier 103", current_stock: 80 }
    ];

    appState.employees = [
        { name: "Operator 1", role: "Senior Technician", hourly_cost: 28.00, available_hours: 40 },
        { name: "Operator 2", role: "Assembly Specialist", hourly_cost: 20.00, available_hours: 35 },
        { name: "Operator 3", role: "Logistics Clerk", hourly_cost: 16.50, available_hours: 30 }
    ];

    renderTables();
}

function renderTables() {
    document.getElementById("prodCount").innerText = `${appState.products.length} Records`;
    document.getElementById("ingCount").innerText = `${appState.ingredients.length} Records`;
    document.getElementById("empCount").innerText = `${appState.employees.length} Records`;

    document.getElementById("prodTableBody").innerHTML = appState.products.map(p => `
        <tr class="hover:bg-slate-900">
            <td class="px-3 py-2 font-medium text-slate-200">${p.name}</td>
            <td class="px-3 py-2">$${p.selling_price.toFixed(2)}</td>
            <td class="px-3 py-2">${p.prep_time_minutes} min</td>
            <td class="px-3 py-2 text-slate-400">${p.category}</td>
        </tr>
    `).join('');

    document.getElementById("ingTableBody").innerHTML = appState.ingredients.map(i => `
        <tr class="hover:bg-slate-900">
            <td class="px-3 py-2 font-medium text-slate-200">${i.name}</td>
            <td class="px-3 py-2">${i.unit}</td>
            <td class="px-3 py-2">$${i.purchase_cost.toFixed(2)}</td>
            <td class="px-3 py-2 text-slate-400">${i.supplier}</td>
            <td class="px-3 py-2 font-mono">${i.current_stock}</td>
        </tr>
    `).join('');

    document.getElementById("empTableBody").innerHTML = appState.employees.map(e => `
        <tr class="hover:bg-slate-900">
            <td class="px-3 py-2 font-medium text-slate-200">${e.name}</td>
            <td class="px-3 py-2 text-slate-400">${e.role}</td>
            <td class="px-3 py-2">$${e.hourly_cost.toFixed(2)}</td>
            <td class="px-3 py-2 font-mono">${e.available_hours} hrs</td>
        </tr>
    `).join('');
}

async function runValidation() {
    if (appState.products.length === 0) loadStandardDataset();

    try {
        const res = await fetch(`${API_BASE}/data/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.products,
                ingredients: appState.ingredients,
                employees: appState.employees
            })
        });
        const data = await res.json();
        
        document.getElementById("auditLogContainer").classList.remove("hidden");
        const list = document.getElementById("auditLogList");
        
        if (data.issues_found && data.issues_found.length > 0) {
            list.innerHTML = data.issues_found.map(iss => `<li>${iss}</li>`).join('');
        } else {
            list.innerHTML = `<li>Data validation completed: 0 critical schema anomalies detected.</li>`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function runForecastModel() {
    if (appState.products.length === 0) loadStandardDataset();

    try {
        const res = await fetch(`${API_BASE}/forecasting/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                historical_sales: [],
                products: appState.products,
                days_ahead: 7
            })
        });
        const data = await res.json();
        appState.forecasts = data.forecasts;

        renderForecastChart(data.forecasts);
    } catch (err) {
        console.error(err);
    }
}

function renderForecastChart(forecasts) {
    const ctx = document.getElementById('forecastChartCanvas').getContext('2d');
    if (appState.chartInstance) appState.chartInstance.destroy();

    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

    const datasets = Object.keys(forecasts).map((name, idx) => ({
        label: name,
        data: forecasts[name],
        borderColor: palette[idx % palette.length],
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

async function executeSolver() {
    if (appState.products.length === 0) loadStandardDataset();
    if (Object.keys(appState.forecasts).length === 0) await runForecastModel();

    const obj = document.getElementById("optObjective").value;
    const budget = parseFloat(document.getElementById("optBudget").value) || 5000;
    const staffHours = parseFloat(document.getElementById("optStaffHours").value) || 8;

    try {
        const res = await fetch(`${API_BASE}/optimization/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.products,
                ingredients: appState.ingredients,
                employees: appState.employees,
                demand_forecast: appState.forecasts,
                objective: obj,
                days: 1,
                constraints_config: { budget_limit: budget, min_daily_staff_hours: staffHours }
            })
        });

        const data = await res.json();
        document.getElementById("solverOutput").classList.remove("hidden");

        if (data.status === "infeasible") {
            document.getElementById("resProfit").innerText = "INFEASIBLE";
            document.getElementById("resSummary").innerText = data.infeasibility_diagnosis.bottlenecks[0].detail;
            return;
        }

        const fin = data.optimization_result.financials;
        document.getElementById("resProfit").innerText = `$${fin.expected_profit.toLocaleString()}`;
        document.getElementById("resRevenue").innerText = `$${fin.expected_revenue.toLocaleString()}`;
        document.getElementById("resCost").innerText = `$${fin.expected_total_cost.toLocaleString()}`;
        document.getElementById("resRoi").innerText = `${fin.roi_percentage}%`;

        const ai = data.ai_explanation;
        document.getElementById("resSummary").innerText = ai.executive_summary;
        document.getElementById("resRecs").innerHTML = ai.actionable_recommendations.map(r => `<li>${r}</li>`).join('');
    } catch (err) {
        console.error(err);
    }
}

function updateScenText() {
    const d = document.getElementById("scenDem").value;
    const c = document.getElementById("scenCost").value;
    const w = document.getElementById("scenWage").value;

    const dPct = Math.round((d - 1.0) * 100);
    const cPct = Math.round((c - 1.0) * 100);
    const wPct = Math.round((w - 1.0) * 100);

    document.getElementById("scenDemText").innerText = `${dPct >= 0 ? '+' : ''}${dPct}% Demand Variance`;
    document.getElementById("scenCostText").innerText = `${cPct >= 0 ? '+' : ''}${cPct}% Raw Cost Variance`;
    document.getElementById("scenWageText").innerText = `${wPct >= 0 ? '+' : ''}${wPct}% Wage Variance`;
}

async function runScenarioSim() {
    if (appState.products.length === 0) loadStandardDataset();
    if (Object.keys(appState.forecasts).length === 0) await runForecastModel();

    const dem = parseFloat(document.getElementById("scenDem").value);
    const cost = parseFloat(document.getElementById("scenCost").value);
    const wage = parseFloat(document.getElementById("scenWage").value);

    try {
        const res = await fetch(`${API_BASE}/scenarios/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.products,
                ingredients: appState.ingredients,
                employees: appState.employees,
                demand_forecast: appState.forecasts,
                scenario_params: {
                    demand_multiplier: dem,
                    supplier_cost_multiplier: cost,
                    wage_multiplier: wage
                }
            })
        });

        const data = await res.json();
        document.getElementById("scenOutput").classList.remove("hidden");

        const baseP = data.baseline_financials.expected_profit;
        const newP = data.scenario_financials.expected_profit;
        const delta = data.variance.delta_profit;

        document.getElementById("scenBaseProfit").innerText = `$${baseP.toLocaleString()}`;
        document.getElementById("scenNewProfit").innerText = `$${newP.toLocaleString()}`;
        document.getElementById("scenDelta").innerText = `${delta >= 0 ? '+' : ''}$${delta.toLocaleString()}`;
    } catch (err) {
        console.error(err);
    }
}

async function runNetworkTransfers() {
    const branches = [
        { name: "Branch North (Location A)", stock: 500, demand: 150 },
        { name: "Branch South (Location B)", stock: 40, demand: 250 },
        { name: "Branch East (Location C)", stock: 300, demand: 100 }
    ];

    const matrix = {
        "Branch North (Location A)": { "Branch South (Location B)": 2.50, "Branch East (Location C)": 8.00 },
        "Branch South (Location B)": { "Branch North (Location A)": 2.50, "Branch East (Location C)": 9.00 },
        "Branch East (Location C)": { "Branch North (Location A)": 8.00, "Branch South (Location B)": 9.00 }
    };

    try {
        const res = await fetch(`${API_BASE}/network/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                branches: branches,
                transfer_cost_matrix: matrix,
                unit_procurement_cost: 12.00
            })
        });

        const data = await res.json();
        document.getElementById("netOutput").classList.remove("hidden");

        const list = document.getElementById("netTransfersList");
        list.innerHTML = data.recommended_transfers.map(t => 
            `<div class="p-2 bg-slate-950 rounded border border-slate-800 flex justify-between">
                <span>Transfer from ${t.from_branch} to ${t.to_branch}</span>
                <span class="font-bold text-blue-400">${t.quantity} units (Shipping cost: $${t.total_shipping_cost})</span>
            </div>`
        ).join('');
    } catch (err) {
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadStandardDataset();
});
