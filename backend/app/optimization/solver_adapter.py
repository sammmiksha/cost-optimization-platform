from abc import ABC, abstractmethod
from typing import Dict, Any, List
from ortools.linear_solver import pywraplp
from ortools.sat.python import cp_model


class SolverAdapter(ABC):

    @abstractmethod
    def create_int_var(self, lb: int, ub: int, name: str) -> Any:
        pass

    @abstractmethod
    def create_num_var(self, lb: float, ub: float, name: str) -> Any:
        pass

    @abstractmethod
    def add_constraint(self, constraint_expr: Any, name: str = "") -> None:
        pass

    @abstractmethod
    def set_objective(self, expr: Any, maximize: bool = True) -> None:
        pass

    @abstractmethod
    def solve(self, time_limit_seconds: int = 60) -> Dict[str, Any]:
        pass


class CpSatAdapter(SolverAdapter):
    """
    CP-SAT Solver Adapter using Google OR-Tools CP-SAT Engine.
    Used for discrete integer, scheduling, shift, and multi-supplier allocation problems.
    """

    def __init__(self):
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.vars = {}

    def create_int_var(self, lb: int, ub: int, name: str) -> Any:
        var = self.model.NewIntVar(int(lb), int(ub), name)
        self.vars[name] = var
        return var

    def create_num_var(self, lb: float, ub: float, name: str) -> Any:
        # Scale continuous parameters by 100 for integer CP-SAT representation
        var = self.model.NewIntVar(int(lb * 100), int(ub * 100), name)
        self.vars[name] = var
        return var

    def add_constraint(self, constraint_expr: Any, name: str = "") -> None:
        self.model.Add(constraint_expr)

    def set_objective(self, expr: Any, maximize: bool = True) -> None:
        if maximize:
            self.model.Maximize(expr)
        else:
            self.model.Minimize(expr)

    def solve(self, time_limit_seconds: int = 60) -> Dict[str, Any]:
        self.solver.parameters.max_time_in_seconds = float(time_limit_seconds)
        status = self.solver.Solve(self.model)

        status_str = "UNKNOWN"
        if status == cp_model.OPTIMAL:
            status_str = "OPTIMAL"
        elif status == cp_model.FEASIBLE:
            status_str = "FEASIBLE"
        elif status == cp_model.INFEASIBLE:
            status_str = "INFEASIBLE"

        solution_vals = {}
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for name, var in self.vars.items():
                solution_vals[name] = self.solver.Value(var)

        return {
            "status": status_str,
            "solver_name": "CP-SAT",
            "runtime_seconds": round(self.solver.WallTime(), 3),
            "objective_value": round(self.solver.ObjectiveValue(), 2) if status in [cp_model.OPTIMAL, cp_model.FEASIBLE] else 0.0,
            "solution_values": solution_vals
        }


class LinearMipAdapter(SolverAdapter):
    """
    Linear MIP Solver Adapter using Google OR-Tools CBC Engine.
    Used for continuous mixed-integer linear programming formulations.
    """

    def __init__(self):
        self.solver = pywraplp.Solver.CreateSolver("CBC")
        self.vars = {}

    def create_int_var(self, lb: int, ub: int, name: str) -> Any:
        var = self.solver.IntVar(int(lb), int(ub), name)
        self.vars[name] = var
        return var

    def create_num_var(self, lb: float, ub: float, name: str) -> Any:
        var = self.solver.NumVar(float(lb), float(ub), name)
        self.vars[name] = var
        return var

    def add_constraint(self, constraint_expr: Any, name: str = "") -> None:
        self.solver.Add(constraint_expr)

    def set_objective(self, expr: Any, maximize: bool = True) -> None:
        if maximize:
            self.solver.Maximize(expr)
        else:
            self.solver.Minimize(expr)

    def solve(self, time_limit_seconds: int = 60) -> Dict[str, Any]:
        self.solver.set_time_limit(int(time_limit_seconds * 1000))
        status = self.solver.Solve()

        status_str = "UNKNOWN"
        if status == pywraplp.Solver.OPTIMAL:
            status_str = "OPTIMAL"
        elif status == pywraplp.Solver.FEASIBLE:
            status_str = "FEASIBLE"
        elif status == pywraplp.Solver.INFEASIBLE:
            status_str = "INFEASIBLE"

        solution_vals = {}
        if status in [pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE]:
            for name, var in self.vars.items():
                solution_vals[name] = var.solution_value()

        return {
            "status": status_str,
            "solver_name": "CBC",
            "runtime_seconds": round(self.solver.wall_time() / 1000.0, 3),
            "objective_value": round(self.solver.Objective().Value(), 2) if status in [pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE] else 0.0,
            "solution_values": solution_vals
        }
