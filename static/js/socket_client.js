/**
 * Manages Socket.IO connection and event routing.
 */
class SocketClient {
    constructor(cryptoEngine, uiManager) {
        this.socket = io(); // Connects to same host
        this.crypto = cryptoEngine;
        this.ui = uiManager;
        this.roomId = null;
        this.peers = new Set(); // Keep track of peers in the room
        this.sentKeysTo = new Set(); // Prevent redundant key exchange
        
        this.setupListeners();
    }

    setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        this.socket.on('peer_joined', async (data) => {
            const newPeerId = data.sid;
            console.log('Peer joined:', newPeerId);
            this.peers.add(newPeerId);
            this.ui.setPeerConnected(true);
            this.ui.updateParticipantCount(this.peers.size + 1);
            
            // Wait a random short interval (0-500ms) to prevent burst if many users
            const delay = Math.floor(Math.random() * 500);
            setTimeout(async () => {
                const pubKey = await this.crypto.exportPublicKey();
                this.sentKeysTo.add(newPeerId);
                // Send our key *specifically* to the new peer
                this.socket.emit('public_key_exchange', { 
                    public_key: pubKey,
                    target_id: newPeerId 
                });
            }, delay);
        });

        this.socket.on('public_key', async (data) => {
            const senderId = data.sender_id;
            console.log('Event: public_key received from', senderId);
            this.peers.add(senderId);
            this.ui.setPeerConnected(true);
            this.ui.updateParticipantCount(this.peers.size + 1);
            
            const isResponder = !this.sentKeysTo.has(senderId);

            try {
                // Derive shared secret for this specific peer
                await this.crypto.deriveSharedSecret(senderId, data.public_key);
                
                // If we didn't initiate this exchange (we haven't sent our key yet), we need to send our key back
                if (isResponder) {
                     console.log(`Sending my key back to ${senderId}...`);
                     const pubKey = await this.crypto.exportPublicKey();
                     this.sentKeysTo.add(senderId);
                     this.socket.emit('public_key_exchange', { 
                         public_key: pubKey,
                         target_id: senderId
                     });
                }
                
                this.ui.enableChat();
                console.log(`Secure channel established with ${senderId}.`);
            } catch (e) {
                console.error(`Key exchange failed with ${senderId}:`, e);
                this.ui.appendSystemMessage(`Encryption key exchange failed with a user.`);
            }
        });

        this.socket.on('peer_disconnected', (data) => {
            const peerId = data.sid;
            console.log('Peer disconnected:', peerId);
            this.peers.delete(peerId);
            this.sentKeysTo.delete(peerId);
            this.crypto.removePeer(peerId);
            this.ui.updateParticipantCount(this.peers.size + 1);
            
            if (!this.crypto.hasAnyKeys()) {
                this.ui.setPeerConnected(false);
                this.ui.disableChat();
            }
        });

        this.socket.on('chat_message', async (data) => {
            const senderId = data.sender_id;
            try {
                let innerPayloadStr = await this.crypto.decrypt(senderId, data.payload);
                
                try {
                    innerPayloadStr = await this.crypto.decryptWithPassword(innerPayloadStr);
                } catch (e) {
                    console.warn(`Room password decryption failed from ${senderId}`);
                    this.ui.appendSystemMessage("🔒 Incorrect room password! A message could not be decrypted.");
                    return;
                }
                
                let msgObj;
                try {
                    msgObj = JSON.parse(innerPayloadStr);
                } catch (e) {
                    // Fallback for older plaintext messages
                    msgObj = { nickname: 'Anonim', text: innerPayloadStr };
                }
                
                this.ui.appendMessage(msgObj.text, false, msgObj.nickname);
            } catch (e) {
                console.error(`Message error from ${senderId}:`, e);
                this.ui.appendSystemMessage("Received unreadable encrypted message.");
            }
        });
    }

    async createRoom() {
        try {
            const res = await fetch('/api/room/create', { method: 'POST'});
            const data = await res.json();
            
            // Generate a random 6-character hex password
            const passwordBytes = window.crypto.getRandomValues(new Uint8Array(3));
            const passwordHex = Array.from(passwordBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            
            const combinedId = `${data.room_id}-${passwordHex}`;
            this.joinRoom(combinedId);
        } catch (e) {
            console.error("Failed to create room", e);
            this.ui.showError("Failed to create secure room.");
        }
    }

    async joinRoom(combinedId) {
        let roomId = combinedId;
        let password = null;
        
        if (combinedId.includes('-')) {
            const parts = combinedId.split('-');
            roomId = parts[0];
            password = parts.slice(1).join('-'); // Re-join in case password has hyphens
        }
        
        try {
            await this.crypto.deriveRoomKey(password);
        } catch (e) {
            console.error("Failed to derive room key", e);
            this.ui.showError("Failed to initialize encryption.");
            return;
        }
        
        this.roomId = combinedId;
        this.socket.emit('join', { room_id: roomId }, (response) => {
            if (response.status === 'ok') {
                this.ui.showChatScreen(combinedId);
            } else {
                this.ui.showError(response.message);
            }
        });
    }

    async sendMessage(text) {
        if (!text.trim()) return;
        
        const nickname = this.ui.getNickname();
        const payloadStr = JSON.stringify({ nickname, text });
        
        try {
            // 1st Layer: Encrypt with Room Password (if set)
            const roomEncryptedPayload = await this.crypto.encryptWithPassword(payloadStr);
            
            // 2nd Layer: Encrypt and send individually for each peer with ECDH
            for (const [peerId, _] of this.crypto.peerKeys.entries()) {
                const finalEncryptedPayload = await this.crypto.encrypt(peerId, roomEncryptedPayload);
                this.socket.emit('chat_message', { 
                    payload: finalEncryptedPayload,
                    target_id: peerId
                });
            }
            // Show plaintext locally
            this.ui.appendMessage(text, true, nickname); 
        } catch (e) {
            console.error("Encryption error", e);
            this.ui.appendSystemMessage("Error encrypting message.");
        }
    }
    
    leaveRoom() {
        this.socket.disconnect();
        window.location.reload();
    }
}
