import asyncio
from typing import Dict, Set

class ChatManager:
    def __init__(self):
        # rooms: { "room_id": set("sid1", "sid2", ...) }
        self.rooms: Dict[str, Set[str]] = {}
        # users: { "sid": "room_id" }
        self.users: Dict[str, str] = {}
        self.lock = asyncio.Lock()

    async def join_room(self, sid: str, room_id: str) -> bool:
        async with self.lock:
            # Leave current room if already in one
            await self._leave_room(sid)
            
            if room_id not in self.rooms:
                self.rooms[room_id] = set()
            
            self.rooms[room_id].add(sid)
            self.users[sid] = room_id
            return True

    async def leave_room(self, sid: str) -> str | None:
        async with self.lock:
            return await self._leave_room(sid)
            
    async def _leave_room(self, sid: str) -> str | None:
        if sid in self.users:
            room_id = self.users[sid]
            if room_id in self.rooms:
                self.rooms[room_id].discard(sid)
                if not self.rooms[room_id]:
                    # Delete the room entirely if no one is left
                    del self.rooms[room_id]
            del self.users[sid]
            return room_id
        return None

    async def get_room_users(self, room_id: str) -> Set[str]:
        async with self.lock:
            return self.rooms.get(room_id, set()).copy()
            
    async def get_user_room(self, sid: str) -> str | None:
        async with self.lock:
            return self.users.get(sid)

# Singleton instance
manager = ChatManager()
