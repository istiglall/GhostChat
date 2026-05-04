from pydantic import BaseModel, Field

class RoomCreateResponse(BaseModel):
    room_id: str = Field(..., description="Unique and hard to guess room identifier")
    message: str = Field(..., description="Status message")

class ChatMessage(BaseModel):
    # This payload is E2EE encrypted (or base64 encoded binary data), server shouldn't care about its content.
    payload: str = Field(..., description="Encrypted message payload")
    sender_id: str = Field(..., description="Socket ID of the sender")
    room_id: str = Field(..., description="Room to broadcast to")

class PublicKeyPayload(BaseModel):
    public_key: str = Field(..., description="Exported public key for ECDH")
    sender_id: str = Field(..., description="Socket ID of the sender")
    room_id: str = Field(..., description="Room ID")
