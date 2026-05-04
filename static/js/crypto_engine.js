/**
 * Handles End-to-End Encryption using Web Crypto API.
 * Uses ECDH for Key Exchange and AES-GCM for message encryption.
 */
class CryptoEngine {
    constructor() {
        this.keyPair = null;
        this.peerKeys = new Map(); // Map to store AES keys per peerId
        this.roomKey = null; // Optional room password AES key
        
        if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
            console.error("GhostChat requires a Secure Context (HTTPS or localhost) to use E2EE features.");
            alert("SECURITY ERROR: Web Crypto API is not available. Please use HTTPS or access via localhost (127.0.0.1).");
        }
    }

    // Derive Room Key using PBKDF2
    async deriveRoomKey(passwordStr) {
        if (!passwordStr) {
            this.roomKey = null;
            return;
        }
        console.log("Deriving room AES key from password...");
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(passwordStr),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        const salt = encoder.encode("GhostChatRoomSalt_v1"); // Static salt since room passwords aren't stored
        
        this.roomKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
        console.log("Room key derived successfully.");
    }

    // Encrypt payload with Room Password (returns Base64)
    async encryptWithPassword(plaintext) {
        if (!this.roomKey) return plaintext; // No password, return as is
        
        const enc = new TextEncoder();
        const encodedText = enc.encode(plaintext);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const cipherBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            this.roomKey,
            encodedText
        );
        
        const cipherArray = new Uint8Array(cipherBuffer);
        const payload = new Uint8Array(iv.length + cipherArray.length);
        payload.set(iv, 0);
        payload.set(cipherArray, iv.length);
        
        return "R:" + btoa(String.fromCharCode.apply(null, payload)); // Prefix "R:" to denote room encrypted
    }

    // Decrypt payload with Room Password
    async decryptWithPassword(payloadStr) {
        if (this.roomKey) {
            if (!payloadStr.startsWith("R:")) {
                throw new Error("Message is not encrypted with the required room password.");
            }
            
            const base64Payload = payloadStr.substring(2);
            const binaryStr = atob(base64Payload);
            const payload = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                payload[i] = binaryStr.charCodeAt(i);
            }
            
            const iv = payload.slice(0, 12);
            const ciphertext = payload.slice(12);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                this.roomKey,
                ciphertext
            );
            
            const dec = new TextDecoder();
            return dec.decode(decryptedBuffer);
        } else {
            if (payloadStr.startsWith("R:")) {
                throw new Error("Message is encrypted with a room password, but no password was provided!");
            }
            return payloadStr;
        }
    }

    // 1. Generate ECDH Key Pair
    async generateKeyPair() {
        this.keyPair = await window.crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true, // extractable
            ["deriveKey", "deriveBits"]
        );
        return this.keyPair;
    }

    // 2. Export Public Key to send to peer
    async exportPublicKey() {
        if (!this.keyPair) await this.generateKeyPair();
        const exported = await window.crypto.subtle.exportKey(
            "jwk",
            this.keyPair.publicKey
        );
        return exported;
    }

    // 3. Import Peer's Public Key
    async importPublicKey(jwk) {
        return await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        );
    }

    // 4. Derive Shared Secret (AES-GCM Key) for a specific peer
    async deriveSharedSecret(peerId, peerPublicKeyJwk) {
        try {
            console.log(`Importing public key for peer ${peerId}...`);
            const peerPublicKey = await this.importPublicKey(peerPublicKeyJwk);
            
            if (!this.keyPair || !this.keyPair.privateKey) {
                console.log("Local keypair missing, generating now...");
                await this.generateKeyPair();
            }

            console.log(`Deriving shared key for peer ${peerId}...`);
            const aesKey = await window.crypto.subtle.deriveKey(
                {
                    name: "ECDH",
                    public: peerPublicKey
                },
                this.keyPair.privateKey,
                {
                    name: "AES-GCM",
                    length: 256
                },
                false,
                ["encrypt", "decrypt"]
            );
            
            this.peerKeys.set(peerId, aesKey);
            console.log(`Shared AES-GCM key derived successfully for ${peerId}!`);
            return aesKey;
        } catch (e) {
            console.error(`CRITICAL ERROR in deriveSharedSecret for ${peerId}:`, e);
            throw e;
        }
    }

    hasKeyFor(peerId) {
        return this.peerKeys.has(peerId);
    }

    removePeer(peerId) {
        this.peerKeys.delete(peerId);
    }

    hasAnyKeys() {
        return this.peerKeys.size > 0;
    }

    // 5. Encrypt Message for a specific peer
    async encrypt(peerId, text) {
        const aesKey = this.peerKeys.get(peerId);
        if (!aesKey) throw new Error(`AES Key not established for peer ${peerId}.`);
        
        const enc = new TextEncoder();
        const encodedText = enc.encode(text);
        
        // Initialization Vector
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const cipherBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            encodedText
        );
        
        // Combine IV and Ciphertext for transport
        const cipherArray = new Uint8Array(cipherBuffer);
        const payload = new Uint8Array(iv.length + cipherArray.length);
        payload.set(iv, 0);
        payload.set(cipherArray, iv.length);
        
        // Convert to Base64 for socket transport
        return btoa(String.fromCharCode.apply(null, payload));
    }

    // 6. Decrypt Message from a specific peer
    async decrypt(peerId, base64Payload) {
        const aesKey = this.peerKeys.get(peerId);
        if (!aesKey) throw new Error(`AES Key not established for peer ${peerId}.`);
        
        // Convert Base64 back to Uint8Array
        const binaryStr = atob(base64Payload);
        const payload = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            payload[i] = binaryStr.charCodeAt(i);
        }
        
        // Extract IV and Ciphertext
        const iv = payload.slice(0, 12);
        const ciphertext = payload.slice(12);
        
        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                aesKey,
                ciphertext
            );
            
            const dec = new TextDecoder();
            return dec.decode(decryptedBuffer);
        } catch (e) {
            console.error(`Decryption failed for ${peerId}:`, e);
            throw new Error(`Failed to decrypt message from ${peerId}.`);
        }
    }
}
