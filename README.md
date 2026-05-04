# 👻 GhostChat: Enterprise-Grade Anonymous Messaging
> **This project is a product of the dialogue between human vision and Artificial Intelligence (Vibe Coding). Every single line has been shaped as the result of a shared conversation and a unified engineering vision.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Security: E2EE](https://img.shields.io/badge/Security-E2EE-green.svg)](https://en.wikipedia.org/wiki/End-to-end_encryption)

GhostChat is a **stateless**, **log-less**, and **End-to-End Encrypted (E2EE)** messaging architecture built on modern web standards. Designed with a "Zero-Trust" principle, it ensures that it is technically impossible for the server to access message contents.

---

## 🏗️ Architectural Approach

### 1. Security and Encryption Model
GhostChat is built on a **Double-Layer Encryption** strategy:
- **Transport Layer:** WebSocket communication over TLS.
- **Application Layer:** AES-256-GCM encryption occurring on the client-side (browser).
- **Key Derivation:** User passwords are never sent to the server. Keys are derived on the client-side using the **PBKDF2** (Password-Based Key Derivation Function 2) algorithm.
- **Ephemeral Storage:** Messages are never stored in any database on the server side; they are only distributed instantly among active clients in a session.

### 2. Technical Stack
- **Core Engine:** [FastAPI](https://fastapi.tiangolo.com/) based on Python 3.9+.
- **Real-time Engine:** [Python-SocketIO](https://python-socketio.readthedocs.io/).
- **Validation:** [Pydantic v2](https://docs.pydantic.dev/).
- **Asynchronous Execution:** High concurrency support with `uvicorn`.

---

## 📖 How to Use

GhostChat is designed for simplicity and maximum privacy. No registration is required.

1.  **Set Your Identity:** Enter an optional **Nickname** to identify yourself in the chat. If left blank, you will appear as "Anonim".
2.  **Create a Room:** Click on **"Create Secure Room"**. A unique, encrypted Room ID will be generated for you.
3.  **Invite Friends:** Copy the generated Room ID and share it with your peer.
4.  **Join a Room:** If you have an ID from a friend, paste it into the **"Enter Room ID"** field and click **"Join Room"**.
5.  **Chat Privately:** Once the secure channel is established (Keys are exchanged), you can send encrypted text and **Emojis** 😀 safely.

> [!TIP]
> Your Room ID also contains a hidden encryption key suffix. Sharing the full ID ensures your friend can derive the same room password for the second layer of encryption.

---

## 🚀 Installation and Setup

### Local Development Environment

1. **Clone the Project:**
   ```bash
   git clone https://github.com/istiglall/GhostChat.git
   cd GhostChat
   ```

2. **Isolate Dependencies:**
   ```bash
   python -m venv venv
   source venv/bin/activate # Windows: .\venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Start the Server:**
   ```bash
   # Development mode (Hot-reload active)
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 🔌 Socket.io API Contract

### Events (Inbound/Outbound)
- `join_room`: Allows the user to open an encrypted session in a specific room.
- `send_message`: Transmission of the encrypted payload.
- `receive_message`: Encrypted data broadcasted to other clients in the room.

---

## 🛠️ Road Map
- [ ] **WebRTC Integration:** Direct peer-to-peer data transfer.
- [ ] **Perfect Forward Secrecy (PFS):** Ephemeral key exchange for each session (Diffie-Hellman).
- [ ] **File Transfer:** Chunk-based encrypted file sharing.
- [ ] **Mobile App:** Mobile clients based on Flutter/React Native.

---

## 📄 License
This project is protected under the [MIT License](LICENSE). Copyright (c) 2026 Istiglal.
