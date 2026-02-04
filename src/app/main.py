from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from src.app.core.config import settings
from src.app.api.v1 import market_data

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        docs_url="/docs",
    )
    
    # Mount static files directory
    application.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    
    application.include_router(
        market_data.router, 
        prefix=f"{settings.API_V1_STR}/market-data", 
        tags=["Market Data"]
    )
    
    @application.get("/health")
    async def health_check():
        return {"status": "online", "version": "0.1.0"}

    @application.get("/test", response_class=HTMLResponse)
    async def test_page(request: Request):
        return templates.TemplateResponse(request, "test_client.html")
    
    @application.get("/")
    async def home_page(request: Request):
        return templates.TemplateResponse(request, "index.html")
    
    @application.get("/tactical", response_class=HTMLResponse)
    async def tactical_dashboard(request: Request):
        return templates.TemplateResponse(request, "tactical_dashboard.html")
    
    @application.get("/pro", response_class=HTMLResponse)
    async def pro_terminal(request: Request):
        """Pro Terminal with dockable layout"""
        return templates.TemplateResponse(request, "pro_terminal.html")
        
    return application

app = create_application()