// Backend API Base URL
const API_BASE = "http://127.0.0.1:8000/api/v1";

// Global Data State
let currentProducts = [];
let currentIngredients = [];
let currentEmployees = [];
let currentForecasts = {};
let forecastChartInstance = null;

// Tab Switcher
function switchTab(tabId) {
    const tabs = ['ingestion', 'forecast', 'optimization', 'scenarios', 'network'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const content = document.getElementById(`content-${t}`);
        if (t === tabId) {
            btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-600/20";
            content.classList.remove("hidden");
        } else {
            btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all text-slate-400 hover:bg-slate-800/60 hover:text-slate-200";
            content.classList.add("hidden");
        }
    });
}

// Load Benchmark Sample Dataset
function loadSampleData() {
    currentProducts = [
        { name: "Classic Burger", selling_price: 12.50, prep_time_minutes: 10, category: "Mains", ingredient_requirements: { "Beef Patty": 1, "Burger Bun": 1, "Cheese Slice": 1 } },
        { name: "Margherita Pizza", selling_price: 18.00, prep_time_minutes: 15, category: "Mains", ingredient_requirements: { "Pizza Dough": 1, "Cheese Slice": 2, "Tomato Sauce": 1 } },
        { name: "Crispy Fries", selling_price: 6.00, prep_time_minutes: 5, category: "Sides", ingredient_requirements: { "Potatoes": 0.3 } }
    ];

    currentIngredients = [
        { name: "Beef Patty", unit: "piece", purchase_cost: 3.20, supplier: "Prime Meats Co", current_stock: 150 },
        { name: "Burger Bun", unit: "piece", purchase_cost: 0.80, supplier: "Fresh Bakery", current_stock: 200 },
        { name: "Cheese Slice", unit: "piece", purchase_cost: 0.50, supplier: "Dairy Craft", current_stock: 300 },
        { name: "Pizza Dough", unit: "piece", purchase_cost: 1.50, supplier: "Fresh Bakery", current_stock: 80 },
        { name: "Tomato Sauce", unit: "can", purchase_cost: 1.00, supplier: "Global Foods", current_stock: 50 },
        { name: "Potatoes", unit: "kg", purchase_cost: 1.20, supplier: "AgriDirect", current_stock: 100 }
    ];

    currentEmployees = [
        { name: "Mario Rossi", role: "Head Chef", hourly_cost: 24.00, available_hours: 40 },
        { name: "Sarah Jenkins", role: "Prep Cook", hourly_cost: 16.50, available_hours: 35 },
        { name: "David Chen", role: "Cashier", hourly_cost: 14.00, available_hours: 30 }
    ];

    renderDataLists();
}

function renderDataLists() {
    const pContainer = document.getElementById("productsList");
    const iContainer = document.getElementById("ingredientsList");
    const eContainer = document.getElementById("employeesList");

    pContainer.innerHTML = currentProducts.map(p => 
        `<div class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
            <span class="font-medium text-slate-200">${p.name}</span>
            <span class="text-emerald-400 font-bold">$${p.selling_price.toFixed(2)}</span>
        </div>`
    ).join('');

    iContainer.innerHTML = currentIngredients.map(i => 
        `<div class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
            <div>
                <div class="font-medium text-slate-200">${i.name}</div>
                <div class="text-[10px] text-slate-500">${i.supplier}</div>
            </div>
            <span class="text-amber-400 font-semibold">$${i.purchase_cost.toFixed(2)} / ${i.unit}</span>
        </div>`
    ).join('');

    eContainer.innerHTML = currentEmployees.map(e => 
        `<div class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center">
            <div>
                <div class="font-medium text-slate-200">${e.name}</div>
                <div class="text-[10px] text-slate-500">${e.role}</div>
            </div>
            <span class="text-indigo-400 font-semibold">$${e.hourly_cost.toFixed(2)}/hr</span>
        </div>`
    ).join('');
}

// Run Data Validation Pipeline
async function validateDataset() {
    if (currentProducts.length === 0) loadSampleData();

    try {
        const res = await fetch(`${API_BASE}/data/validate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                products: currentProducts,
                ingredients: currentIngredients,
                employees: currentEmployees
            })
        });
        const data = await res.json();
        
        document.getElementById("validationResults").classList.remove("hidden");
        document.getElementById("validationMsg").innerText = `Cleaned ${data.cleaned_data.products.length} products, ${data.cleaned_data.ingredients.length} ingredients, and ${data.cleaned_data.employees.length} staff records.`;

        const warningsList = document.getElementById("warningsList");
        if (data.issues_found && data.issues_found.length > 0) {
            document.getElementById("warningsBox").classList.remove("hidden");
            warningsList.innerHTML = data.issues_found.map(issue => `<li>${issue}</li>`).join('');
        } else {
            document.getElementById("warningsBox").classList.add("hidden");
        }
    } catch (err) {
        console.error(err);
    }
}

// Generate ML Demand Forecast
async function runForecast() {
    if (currentProducts.length === 0) loadSampleData();

    try {
        const res = await fetch(`${API_BASE}/forecasting/predict`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                historical_sales: [],
                products: currentProducts,
                days_ahead: 7
            })
        });
        const data = await res.json();
        currentForecasts = data.forecasts;

        renderForecastChart(data.forecasts);
    } catch (err) {
        console.error(err);
    }
}

function renderForecastChart(forecasts) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChartInstance) forecastChartInstance.destroy();

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'];

    const datasets = Object.keys(forecasts).map((pName, idx) => ({
        label: pName,
        data: forecasts[pName],
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        borderWidth: 3,
        tension: 0.4,
        fill: true
    }));

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: days, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Run MILP Optimization Engine
async function runOptimization() {
    if (currentProducts.length === 0) loadSampleData();
    if (Object.keys(currentForecasts).length === 0) {
        await runForecast();
    }

    const obj = document.getElementById("objSelect").value;
    const budget = parseFloat(document.getElementById("budgetInput").value) || 5000;
    const staffHours = parseFloat(document.getElementById("staffHoursInput").value) || 8;

    try {
        const res = await fetch(`${API_BASE}/optimization/run`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                products: currentProducts,
                ingredients: currentIngredients,
                employees: currentEmployees,
                demand_forecast: currentForecasts,
                objective: obj,
                days: 1,
                constraints_config: { budget_limit: budget, min_daily_staff_hours: staffHours }
            })
        });

        const data = await res.json();
        renderOptimizationResults(data);
    } catch (err) {
        console.error(err);
    }
}

function renderOptimizationResults(data) {
    document.getElementById("optimizationResultsCard").classList.remove("hidden");

    if (data.status === "infeasible") {
        document.getElementById("kpiProfit").innerText = "INFEASIBLE";
        document.getElementById("aiSummary").innerText = data.infeasibility_diagnosis.bottlenecks[0].detail;
        return;
    }

    const fin = data.optimization_result.financials;
    document.getElementById("kpiProfit").innerText = `$${fin.expected_profit.toLocaleString()}`;
    document.getElementById("kpiRevenue").innerText = `$${fin.expected_revenue.toLocaleString()}`;
    document.getElementById("kpiCost").innerText = `$${fin.expected_total_cost.toLocaleString()}`;
    document.getElementById("kpiRoi").innerText = `${fin.roi_percentage}%`;

    const ai = data.ai_explanation;
    document.getElementById("aiSummary").innerText = ai.executive_summary;
    document.getElementById("aiRecsList").innerHTML = ai.actionable_recommendations.map(r => 
        `<li class="flex items-center gap-2"><i class="fa-solid fa-circle-right text-indigo-400"></i> ${r}</li>`
    ).join('');
}

// Update What-If Scenario Labels
function updateScenLabels() {
    const dem = document.getElementById("scenDemand").value;
    const sup = document.getElementById("scenSupplier").value;
    const wage = document.getElementById("scenWage").value;

    const demPct = Math.round((dem - 1.0) * 100);
    const supPct = Math.round((sup - 1.0) * 100);
    const wagePct = Math.round((wage - 1.0) * 100);

    document.getElementById("labelDemand").innerText = `${demPct >= 0 ? '+' : ''}${demPct}% Demand Shift`;
    document.getElementById("labelSupplier").innerText = `${supPct >= 0 ? '+' : ''}${supPct}% Supplier Price Change`;
    document.getElementById("labelWage").innerText = `${wagePct >= 0 ? '+' : ''}${wagePct}% Wage Adjustment`;
}

// Run What-If Scenario Stress Test
async function runScenarioSimulation() {
    if (currentProducts.length === 0) loadSampleData();
    if (Object.keys(currentForecasts).length === 0) await runForecast();

    const dem = parseFloat(document.getElementById("scenDemand").value);
    const sup = parseFloat(document.getElementById("scenSupplier").value);
    const wage = parseFloat(document.getElementById("scenWage").value);

    try {
        const res = await fetch(`${API_BASE}/scenarios/simulate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                products: currentProducts,
                ingredients: currentIngredients,
                employees: currentEmployees,
                demand_forecast: currentForecasts,
                scenario_params: {
                    demand_multiplier: dem,
                    supplier_cost_multiplier: sup,
                    wage_multiplier: wage
                }
            })
        });

        const data = await res.json();
        document.getElementById("scenarioResultsCard").classList.remove("hidden");

        const baseProfit = data.baseline_financials.expected_profit;
        const newProfit = data.scenario_financials.expected_profit;
        const variance = data.variance.delta_profit;

        document.getElementById("scenBaseProfit").innerText = `$${baseProfit.toLocaleString()}`;
        document.getElementById("scenNewProfit").innerText = `$${newProfit.toLocaleString()}`;
        document.getElementById("scenVariance").innerText = `${variance >= 0 ? '+' : ''}$${variance.toLocaleString()}`;
        document.getElementById("scenVariance").className = `text-xl font-bold mt-1 ${variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    } catch (err) {
        console.error(err);
    }
}

// Run Multi-Branch Network Transfer Optimizer
async function runNetworkOptimization() {
    const branches = [
        { name: "Mumbai Branch", stock: 500, demand: 150 },
        { name: "Pune Branch", stock: 40, demand: 250 },
        { name: "Delhi Branch", stock: 300, demand: 100 }
    ];

    const matrix = {
        "Mumbai Branch": { "Pune Branch": 2.50, "Delhi Branch": 8.00 },
        "Pune Branch": { "Mumbai Branch": 2.50, "Delhi Branch": 9.00 },
        "Delhi Branch": { "Mumbai Branch": 8.00, "Pune Branch": 9.00 }
    };

    try {
        const res = await fetch(`${API_BASE}/network/optimize`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                branches: branches,
                transfer_cost_matrix: matrix,
                unit_procurement_cost: 12.00
            })
        });

        const data = await res.json();
        document.getElementById("networkResults").classList.remove("hidden");

        const container = document.getElementById("networkTransfersList");
        container.innerHTML = data.recommended_transfers.map(t => 
            `<div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span><strong class="text-indigo-400">${t.from_branch}</strong> ➔ <strong class="text-emerald-400">${t.to_branch}</strong></span>
                <span class="font-bold text-amber-300">Transfer ${t.quantity} units ($${t.total_shipping_cost} ship cost)</span>
            </div>`
        ).join('');
    } catch (err) {
        console.error(err);
    }
}

// Auto Initialize Sample Data on Load
window.addEventListener('DOMContentLoaded', () => {
    loadSampleData();
});
