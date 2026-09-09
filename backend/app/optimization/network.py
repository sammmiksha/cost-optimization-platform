from typing import Dict, List, Any
from ortools.linear_solver import pywraplp


class MultiBranchNetworkOptimizer:
    """
    Multi-Branch Network Optimizer (Step 21 of roadmap).
    Optimizes inter-branch stock transfers vs new supplier procurement across a multi-location network.
    """

    def solve_network_transfers(
        self,
        branches: List[Dict[str, Any]],  # e.g., [{"name": "Mumbai", "stock": 500, "demand": 200}, ...]
        transfer_cost_matrix: Dict[str, Dict[str, float]],  # e.g. {"Mumbai": {"Pune": 2.5}}
        unit_procurement_cost: float = 10.0
    ) -> Dict[str, Any]:
        solver = pywraplp.Solver.CreateSolver("CBC")
        if not solver:
            return {"status": "error", "message": "Failed to create OR-Tools solver instance."}

        branch_names = [b["name"] for b in branches]
        trans_vars = {}

        # Decision Variables: trans[i, j] = units transferred from branch i to branch j
        for i in branch_names:
            for j in branch_names:
                if i != j:
                    trans_vars[(i, j)] = solver.NumVar(0.0, 10000.0, f"trans_{i}_{j}")

        # Decision Variables: proc[i] = new procurement at branch i
        proc_vars = {}
        for b in branches:
            b_name = b["name"]
            proc_vars[b_name] = solver.NumVar(0.0, 10000.0, f"proc_{b_name}")

        # Constraints
        for b in branches:
            b_name = b["name"]
            avail_stock = b.get("stock", 0.0)
            req_demand = b.get("demand", 0.0)

            # Outflow constraint: total transferred out <= initial excess stock
            outflow = solver.Sum(trans_vars[(b_name, j)] for j in branch_names if j != b_name)
            solver.Add(outflow <= max(0.0, avail_stock - req_demand))

            # Demand satisfaction: initial stock + incoming transfers + new procurement >= demand
            inflow = solver.Sum(trans_vars[(i, b_name)] for i in branch_names if i != b_name)
            solver.Add(avail_stock + inflow + proc_vars[b_name] >= req_demand)

        # Objective: Minimize total cost (Inter-branch transfer shipping costs + New procurement costs)
        total_transfer_cost = solver.Sum(
            trans_vars[(i, j)] * transfer_cost_matrix.get(i, {}).get(j, 5.0)
            for i in branch_names for j in branch_names if i != j
        )
        total_proc_cost = solver.Sum(
            proc_vars[b_name] * unit_procurement_cost
            for b_name in branch_names
        )

        solver.Minimize(total_transfer_cost + total_proc_cost)

        status = solver.Solve()

        if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
            transfers = []
            for i in branch_names:
                for j in branch_names:
                    if i != j:
                        qty = trans_vars[(i, j)].solution_value()
                        if qty > 0.01:
                            transfers.append({
                                "from_branch": i,
                                "to_branch": j,
                                "quantity": round(qty, 1),
                                "unit_shipping_cost": transfer_cost_matrix.get(i, {}).get(j, 5.0),
                                "total_shipping_cost": round(qty * transfer_cost_matrix.get(i, {}).get(j, 5.0), 2)
                            })

            procurements = {
                b_name: round(proc_vars[b_name].solution_value(), 1)
                for b_name in branch_names
            }

            return {
                "status": "optimal",
                "recommended_transfers": transfers,
                "new_procurement_required": procurements,
                "total_network_cost": round(solver.Objective().Value(), 2)
            }
        else:
            return {"status": "infeasible", "message": "Could not optimize network transfers."}
