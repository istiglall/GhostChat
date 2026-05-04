/**
 * Handles DOM Manipulation and Application State
 */
class UIManager {
    constructor() {
        // Screens
        this.setupScreen = document.getElementById('setup-screen');
        this.chatScreen = document.getElementById('chat-screen');
        
        // Setup Elements
        this.btnCreate = document.getElementById('btn-create-room');
        this.btnJoin = document.getElementById('btn-join-room');
        this.inputId = document.getElementById('input-room-id');
        this.errorMsg = document.getElementById('setup-error');
        
        // Chat Elements
        this.lblRoomId = document.getElementById('current-room-id');
        this.dotStatus = document.getElementById('connection-status');
        this.txtStatus = document.getElementById('connection-text');
        this.btnLeave = document.getElementById('btn-leave-room');
        this.messagesContainer = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.inputMessage = document.getElementById('input-message');
        this.btnSend = document.getElementById('btn-send');
        this.btnEmoji = document.getElementById('btn-emoji');
        this.emojiPickerContainer = document.getElementById('emoji-picker-container');
        this.emojiPicker = document.getElementById('emoji-picker');
    }

    init(socketClient) {
        this.socketClient = socketClient;

        // Setup Event Listeners
        this.btnCreate.addEventListener('click', () => this.socketClient.createRoom());
        
        this.btnJoin.addEventListener('click', () => {
            const id = this.inputId.value.trim();
            if (id) {
                this.socketClient.joinRoom(id);
            } else {
                this.showError("Please enter a Room ID");
            }
        });

        this.btnLeave.addEventListener('click', () => this.socketClient.leaveRoom());

        this.lblRoomId.addEventListener('click', () => {
            const roomId = this.lblRoomId.textContent;
            if (!roomId || roomId === '...' || roomId === 'Kopyalandı!') return;

            const onCopySuccess = () => {
                const originalText = roomId;
                this.lblRoomId.textContent = 'Kopyalandı!';
                setTimeout(() => {
                    if (this.lblRoomId.textContent === 'Kopyalandı!') {
                        this.lblRoomId.textContent = originalText;
                    }
                }, 1500);
            };

            const fallbackCopy = () => {
                const textArea = document.createElement("textarea");
                textArea.value = roomId;
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        onCopySuccess();
                    } else {
                        console.error('Fallback kopyalama başarısız oldu');
                    }
                } catch (err) {
                    console.error('Fallback kopyalama hatası', err);
                }
                document.body.removeChild(textArea);
            };

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(roomId)
                    .then(onCopySuccess)
                    .catch(err => {
                        console.error('Kopyalama başarısız, fallback deneniyor: ', err);
                        fallbackCopy();
                    });
            } else {
                fallbackCopy();
            }
        });

        // Emoji Picker Logic
        this.btnEmoji.addEventListener('click', () => {
            this.emojiPickerContainer.classList.toggle('hidden');
        });

        // Close picker if clicked outside
        document.addEventListener('click', (e) => {
            if (!this.btnEmoji.contains(e.target) && !this.emojiPickerContainer.contains(e.target)) {
                this.emojiPickerContainer.classList.add('hidden');
            }
        });

        this.emojiPicker.addEventListener('emoji-click', event => {
            const cursorPosition = this.inputMessage.selectionStart;
            const text = this.inputMessage.value;
            const newText = text.slice(0, cursorPosition) + event.detail.unicode + text.slice(cursorPosition);
            this.inputMessage.value = newText;
            
            // Move cursor after inserted emoji
            const newCursorPos = cursorPosition + event.detail.unicode.length;
            this.inputMessage.setSelectionRange(newCursorPos, newCursorPos);
            this.inputMessage.focus();
        });

        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = this.inputMessage.value;
            this.socketClient.sendMessage(text);
            this.inputMessage.value = '';
            this.emojiPickerContainer.classList.add('hidden');
        });
    }

    showError(msg) {
        this.errorMsg.textContent = msg;
        this.errorMsg.classList.remove('hidden');
        setTimeout(() => this.errorMsg.classList.add('hidden'), 3000);
    }

    showChatScreen(roomId) {
        this.setupScreen.classList.remove('active');
        this.setupScreen.classList.add('hidden');
        
        this.chatScreen.classList.remove('hidden');
        this.chatScreen.classList.add('active');
        
        this.lblRoomId.textContent = roomId;
        this.setPeerConnected(false);
    }

    setPeerConnected(isConnected) {
        if (isConnected) {
            this.dotStatus.className = 'dot waiting';
            this.txtStatus.textContent = 'Exchanging Keys...';
        } else {
            this.dotStatus.className = 'dot disconnected';
            this.txtStatus.textContent = 'Waiting for peer...';
            this.disableChat();
        }
    }

    updateParticipantCount(count) {
        if (!this.participantCount) this.participantCount = document.getElementById('participant-count');
        if (count > 1) {
            this.participantCount.textContent = `${count} Online`;
            this.participantCount.classList.remove('hidden');
        } else {
            this.participantCount.classList.add('hidden');
        }
    }

    enableChat() {
        this.dotStatus.className = 'dot connected';
        this.txtStatus.textContent = 'Securely Connected';
        this.inputMessage.disabled = false;
        this.btnSend.disabled = false;
        this.btnEmoji.disabled = false;
        this.inputMessage.focus();
        this.appendSystemMessage("Secure channel established. E2EE active.");
    }

    disableChat() {
        this.inputMessage.disabled = true;
        this.btnSend.disabled = true;
        this.btnEmoji.disabled = true;
        this.emojiPickerContainer.classList.add('hidden');
    }

    getNickname() {
        if (!this.inputNickname) {
            this.inputNickname = document.getElementById('input-nickname');
        }
        return this.inputNickname.value.trim() || 'Anonim';
    }

    appendSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.textContent = text;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    appendMessage(text, isMine, nickname = null) {
        const div = document.createElement('div');
        div.className = `message ${isMine ? 'mine' : 'peer'}`;
        
        if (nickname && !isMine) {
            const nicknameDiv = document.createElement('div');
            nicknameDiv.className = 'message-nickname';
            nicknameDiv.textContent = nickname;
            div.appendChild(nicknameDiv);
        }
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        div.appendChild(textDiv);

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        const now = new Date();
        timeDiv.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(timeDiv);

        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => {
    const cryptoEngine = new CryptoEngine();
    const uiManager = new UIManager();
    const socketClient = new SocketClient(cryptoEngine, uiManager);
    
    uiManager.init(socketClient);
});
