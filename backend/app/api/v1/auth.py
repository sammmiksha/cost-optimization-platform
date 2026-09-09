from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.app.db.session import get_db
from backend.app.db.models.entities import Organization, User
from backend.app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    org_name: str
    industry: str = "restaurant"
    full_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register_organization(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User email already registered.")

    org = Organization(name=req.org_name, industry=req.industry)
    db.add(org)
    db.commit()
    db.refresh(org)

    user = User(
        organization_id=org.id,
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role="Owner"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role, org_id=org.id)
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role, "org_id": org.id}
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email credentials.")

    token = create_access_token(subject=user.id, role=user.role, org_id=user.organization_id)
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role, "org_id": user.organization_id}
    }
