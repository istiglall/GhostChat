from fastapi import APIRouter
from app.models.schemas import RoomCreateResponse
from app.services.security_utils import generate_room_id

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    """Returns the health status of the application."""
    return {"status": "ok", "service": "GhostChat E2EE"}

@router.post("/api/room/create", response_model=RoomCreateResponse, tags=["Rooms"])
async def create_room():
    """Generates a new secure room ID. No state is saved on server."""
    room_id = generate_room_id()
    return RoomCreateResponse(
        room_id=room_id,
        message="Room ID generated successfully. It will be active once a user joins."
    )
