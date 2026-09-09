const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    organization: { name: "Enterprise Operations Corp", industry: "restaurant", locations: 5, currency: "USD" },
    products: [],
    ingredients: [],
    suppliers: [],
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
        { name: "Classic Burger", selling_price: 15.00, prep_time_minutes: 10, category: "Mains", ingredient_requirements: { "Beef Patty": 1, "Burger Bun": 1 } },
        { name: "Margherita Pizza", selling_price: 22.00, prep_time_minutes: 15, category: "Mains", ingredient_requirements: { "Pizza Dough": 1, "Mozzarella": 2 } },
        { name: "French Fries", selling_price: 7.50, prep_time_minutes: 5, category: "Sides", ingredient_requirements: { "Potatoes": 0.3 } }
    ];

    appState.ingredients = [
        { name: "Beef Patty", unit: "piece", purchase_cost: 3.50, current_stock: 150, min_stock: 20 },
        { name: "Burger Bun", unit: "piece", purchase_cost: 0.80, current_stock: 200, min_stock: 30 },
        { name: "Mozzarella", unit: "piece", purchase_cost: 2.00, current_stock: 100, min_stock: 15 },
        { name: "Pizza Dough", unit: "piece", purchase_cost: 1.50, current_stock: 80, min_stock: 10 },
        { name: "Potatoes", unit: "kg", purchase_cost: 1.20, current_stock: 100, min_stock: 15 }
    ];

    appState.suppliers = [
        { name: "Prime Meats Co", rating: 4.9 },
        { name: "Fresh Bakery & Dairy", rating: 4.8 }
    ];

    appState.employees = [
        { name: "Head Chef Mario", role: "Cook", hourly_cost: 26.00, available_hours: 40, skills: ["Cook"] },
        { name: "Prep Specialist Sarah", role: "Cook", hourly_cost: 18.50, available_hours: 35, skills: ["Cook"] },
        { name: "Cashier David", role: "Cashier", hourly_cost: 15.00, available_hours: 30, skills: ["Cashier"] }
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
            <td class="px-3 py-2 text-slate-400">Prime Meats / Fresh Bakery</td>
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
        const res = await fetch(`${API_BASE}/datasets/readiness`, {
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
        list.innerHTML = `
            <li>Data Readiness Score: <strong class="text-emerald-400">${data.overall_score}% (${data.readiness_status})</strong></li>
            <li>Completeness: ${data.metrics.completeness}% | Validity: ${data.metrics.validity}% | Freshness: ${data.metrics.freshness}%</li>
        `;
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
    const palette = ['#3b82f6', '#10b981', '#f59e0b'];

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
        const res = await fetch(`${API_BASE}/optimization/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.products,
                ingredients: appState.ingredients,
                suppliers: appState.suppliers,
                employees: appState.employees,
                demand_forecast: appState.forecasts,
                objective: obj,
                days: 1,
                constraints_config: { budget_limit: budget, min_daily_staff_hours: staffHours }
            })
        });

        const data = await res.json();
        document.getElementById("solverOutput").classList.remove("hidden");

        if (data.status === "INFEASIBLE") {
            document.getElementById("resProfit").innerText = "INFEASIBLE";
            document.getElementById("resSummary").innerText = data.message;
            return;
        }

        const fin = data.financials;
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
        const res = await fetch(`${API_BASE}/optimization/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.products,
                ingredients: appState.ingredients,
                suppliers: appState.suppliers,
                employees: appState.employees,
                demand_forecast: appState.forecasts,
                objective: "maximize_profit",
                days: 1
            })
        });

        const data = await res.json();
        document.getElementById("scenOutput").classList.remove("hidden");

        const baseP = data.financials.expected_profit;
        const newP = Math.round(baseP * dem * (2.0 - cost));
        const delta = newP - baseP;

        document.getElementById("scenBaseProfit").innerText = `$${baseP.toLocaleString()}`;
        document.getElementById("scenNewProfit").innerText = `$${newP.toLocaleString()}`;
        document.getElementById("scenDelta").innerText = `${delta >= 0 ? '+' : ''}$${delta.toLocaleString()}`;
    } catch (err) {
        console.error(err);
    }
}

async function runNetworkTransfers() {
    document.getElementById("netOutput").classList.remove("hidden");
    document.getElementById("netTransfersList").innerHTML = `
        <div class="p-2 bg-slate-950 rounded border border-slate-800 flex justify-between">
            <span>Transfer from Location A to Location B</span>
            <span class="font-bold text-blue-400">120 units (Shipping cost: $300.00)</span>
        </div>
    `;
}

window.addEventListener('DOMContentLoaded', () => {
    loadStandardDataset();
});
