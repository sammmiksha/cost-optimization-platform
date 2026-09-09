from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship

from backend.app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(64), nullable=False, default="restaurant")
    currency = Column(String(8), nullable=False, default="USD")
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="organization", cascade="all, delete-orphan")
    dataset_versions = relationship("DatasetVersion", back_populates="organization", cascade="all, delete-orphan")
    optimization_runs = relationship("OptimizationRun", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="Analyst")  # Owner, Admin, Manager, Analyst, Viewer
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    city = Column(String(128), nullable=True)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    rating = Column(Float, default=5.0)

    organization = relationship("Organization", back_populates="suppliers")
    items = relationship("SupplierItem", back_populates="supplier", cascade="all, delete-orphan")


class SupplierItem(Base):
    __tablename__ = "supplier_items"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    ingredient_name = Column(String(255), nullable=False)
    unit = Column(String(32), nullable=False, default="kg")
    purchase_cost = Column(Float, nullable=False)
    lead_time_days = Column(Integer, default=1)
    daily_capacity = Column(Float, default=1000.0)
    min_order_qty = Column(Float, default=0.0)

    supplier = relationship("Supplier", back_populates="items")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    version_tag = Column(String(64), nullable=False)
    s3_storage_key = Column(String(512), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    quality_score = Column(Float, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="dataset_versions")


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    dataset_version_id = Column(Integer, ForeignKey("dataset_versions.id"), nullable=True)
    objective_type = Column(String(64), nullable=False, default="maximize_profit")
    solver_name = Column(String(32), nullable=False, default="CP-SAT")
    status = Column(String(32), nullable=False, default="COMPLETED")  # OPTIMAL, FEASIBLE, INFEASIBLE, TIME_LIMIT
    runtime_seconds = Column(Float, default=0.0)
    optimality_gap = Column(Float, default=0.0)
    baseline_financials = Column(JSON, default=dict)
    optimized_financials = Column(JSON, default=dict)
    decisions_payload = Column(JSON, default=dict)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="optimization_runs")
    approvals = relationship("Approval", back_populates="optimization_run", cascade="all, delete-orphan")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    optimization_run_id = Column(Integer, ForeignKey("optimization_runs.id", ondelete="CASCADE"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED, MODIFIED
    comments = Column(Text, nullable=True)
    actioned_at = Column(DateTime, default=datetime.utcnow)

    optimization_run = relationship("OptimizationRun", back_populates="approvals")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(128), nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)
