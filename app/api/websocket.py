import socketio
from app.services.chat_manager import manager

# Setup Socket.IO Server with Asyncio
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    room_id = await manager.leave_room(sid)
    if room_id:
        # Notify remaining users in the room
        await sio.emit('peer_disconnected', {'sid': sid}, room=room_id)

@sio.event
async def join(sid, data):
    room_id = data.get('room_id')
    if not room_id:
        return {'status': 'error', 'message': 'room_id is required'}
        
    await manager.join_room(sid, room_id)
    await sio.enter_room(sid, room_id)
    
    print(f"User {sid} joined room {room_id}")
    
    # Notify others in the room
    await sio.emit('peer_joined', {'sid': sid}, room=room_id, skip_sid=sid)
    
    return {'status': 'ok', 'message': f'Joined room {room_id}'}

@sio.event
async def public_key_exchange(sid, data):
    """
    Acts as a signaling server for WebRTC-like E2EE (Client-side Key Exchange).
    Passes the public key to everyone else in the room, or to a specific target_id.
    """
    room_id = await manager.get_user_room(sid)
    if room_id:
        target_id = data.get('target_id')
        payload = {
            'sender_id': sid,
            'public_key': data.get('public_key')
        }
        
        if target_id:
            print(f"Key exchange from {sid} to {target_id} in room {room_id}")
            await sio.emit('public_key', payload, room=target_id)
        else:
            print(f"Key exchange from {sid} to room {room_id}")
            await sio.emit('public_key', payload, room=room_id, skip_sid=sid)

@sio.event
async def chat_message(sid, data):
    """
    Forwards the E2EE encrypted message to everyone in the room, or to a specific target_id.
    """
    room_id = await manager.get_user_room(sid)
    if room_id:
        target_id = data.get('target_id')
        payload = {
            'sender_id': sid,
            'payload': data.get('payload')
        }
        
        if target_id:
            print(f"Message from {sid} to {target_id} in room {room_id}")
            await sio.emit('chat_message', payload, room=target_id)
        else:
            print(f"Message from {sid} to room {room_id}")
            await sio.emit('chat_message', payload, room=room_id, skip_sid=sid)
