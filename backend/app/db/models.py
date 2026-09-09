from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship

from backend.app.db.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=False, default="restaurant")
    locations_count = Column(Integer, default=1)
    employees_count = Column(Integer, default=0)
    currency = Column(String, default="USD")
    default_objective = Column(String, default="maximize_profit")
    created_at = Column(DateTime, default=datetime.utcnow)

    locations = relationship("Location", back_populates="organization", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="organization", cascade="all, delete-orphan")
    ingredients = relationship("Ingredient", back_populates="organization", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="organization", cascade="all, delete-orphan")
    optimization_runs = relationship("OptimizationRun", back_populates="organization", cascade="all, delete-orphan")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    city = Column(String, nullable=True)
    capacity = Column(Float, nullable=True)

    organization = relationship("Organization", back_populates="locations")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    selling_price = Column(Float, nullable=False)
    prep_time_minutes = Column(Float, default=10.0)
    category = Column(String, nullable=True)
    ingredient_requirements = Column(JSON, default=dict)  # e.g., {"Beef": 0.2, "Bun": 1}

    organization = relationship("Organization", back_populates="products")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    unit = Column(String, default="kg")
    purchase_cost = Column(Float, nullable=False)
    supplier = Column(String, nullable=True)
    shelf_life_days = Column(Integer, default=7)
    current_stock = Column(Float, default=0.0)
    min_stock = Column(Float, default=0.0)
    max_stock = Column(Float, default=1000.0)

    organization = relationship("Organization", back_populates="ingredients")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    hourly_cost = Column(Float, nullable=False)
    available_hours = Column(Float, default=40.0)
    skills = Column(JSON, default=list)

    organization = relationship("Organization", back_populates="employees")


class SaleRecord(Base):
    __tablename__ = "sale_records"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    product_name = Column(String, nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    time_slot = Column(String, nullable=True)  # e.g. "peak_lunch", "dinner"
    quantity_sold = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    run_date = Column(DateTime, default=datetime.utcnow)
    objective = Column(String, default="maximize_profit")
    constraints_config = Column(JSON, default=dict)
    results = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    status = Column(String, default="completed")

    organization = relationship("Organization", back_populates="optimization_runs")
