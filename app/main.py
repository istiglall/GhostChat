import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from socketio import ASGIApp

from app.core.config import settings
from app.api.routes import router
from app.api.websocket import sio

def create_app() -> FastAPI:
    # Initialize FastAPI
    app = FastAPI(
        title="GhostChat",
        description="E2EE, Log-less and Stateless Messaging Platform",
        version="1.0.0"
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include REST Routes
    app.include_router(router)

    # Mount static files if directory exists
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

    # Combine FastAPI and Socket.IO
    sio_asgi_app = ASGIApp(sio, other_asgi_app=app)
    
    return sio_asgi_app

app = create_app()
