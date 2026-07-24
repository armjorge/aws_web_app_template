from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, me


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.project,
        version="0.1.0",
        docs_url="/docs" if settings.environment != "prod" else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(me.router)

    return app


app = create_app()
