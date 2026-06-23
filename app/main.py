from fastapi import FastAPI

from app.core.config import APP_NAME
from app.api.assistant_routes import router as assistant_router
from app.api.nlp_routes import router as nlp_router
from app.api.maximo_plan_routes import router as maximo_plan_router
from app.api.add_workorder_reference_routes import router as add_workorder_reference_router
from app.api.add_workorder_routes import router as add_workorder_router

app = FastAPI(title=APP_NAME)

app.include_router(assistant_router)
app.include_router(nlp_router)
app.include_router(maximo_plan_router)
app.include_router(add_workorder_reference_router)
app.include_router(add_workorder_router)


@app.get("/")
def root():
    return {"message": f"{APP_NAME} is running"}


@app.get("/health")
def health():
    return {"status": "ok"}