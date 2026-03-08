"""
Entrypoint FastAPI.
Execução: uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware.logging_middleware import SafeLoggingMiddleware
from app.routes import ai_routes, meal_routes, patient_routes, upload_routes

settings = get_settings()

app = FastAPI(
    title="NutriApp Backend (Referência)",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SafeLoggingMiddleware)

# --- Routes ---
app.include_router(ai_routes.router, prefix="/api", tags=["AI"])
app.include_router(meal_routes.router, prefix="/api", tags=["Meals"])
app.include_router(patient_routes.router, prefix="/api", tags=["Patients"])
app.include_router(upload_routes.router, prefix="/api", tags=["Upload"])


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
