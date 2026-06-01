from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import secrets
import hmac
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import qrcode
import io
import base64
import json
import sqlite3
import datetime
from typing import List, Optional

# Optional imports for QR scanning (not required for basic functionality)
try:
    import cv2
    from pyzbar.pyzbar import decode as pyzbar_decode
    import numpy as np
    QR_SCANNING_AVAILABLE = True
except Exception as e:
    QR_SCANNING_AVAILABLE = False
    print(f"Warning: cv2/pyzbar not available ({type(e).__name__}: {e}). QR scanning from webcam disabled.")

app = FastAPI(title="GhostMark API")

# CORS middleware - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diffie-Hellman parameters (using safe primes)
DH_PRIME = 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF
DH_GENERATOR = 2

# Session storage (in production, use Redis)
sessions = {}

# Initialize Database
def init_db():
    conn = sqlite3.connect('ghostmark.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sent_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            recipient_name TEXT,
            watermark_token TEXT,
            document_snippet TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class DHPublicValue(BaseModel):
    public_value: str
    session_id: str

class DocumentRequest(BaseModel):
    recipient_name: str
    document_text: str
    session_id: str

class LeakDetectionRequest(BaseModel):
    leaked_text: str


def generate_dh_keypair():
    """Generate Diffie-Hellman private and public values"""
    private = secrets.randbelow(DH_PRIME - 2) + 1
    public = pow(DH_GENERATOR, private, DH_PRIME)
    return private, public

def compute_shared_secret(private_value: int, other_public_value: int) -> bytes:
    """Compute shared secret from DH exchange"""
    shared = pow(other_public_value, private_value, DH_PRIME)
    shared_bytes = shared.to_bytes((shared.bit_length() + 7) // 8, byteorder='big')
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'ghostmark-key-derivation',
        backend=default_backend()
    )
    return hkdf.derive(shared_bytes)

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 image"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

def embed_watermark(text: str, recipient_name: str, shared_secret: bytes) -> str:
    """Embed invisible HMAC watermark using zero-width Unicode characters"""
    token = hmac.new(shared_secret, recipient_name.encode(), hashlib.sha256).digest()
    token_bits = ''.join(format(byte, '08b') for byte in token[:8])
    ZERO, ONE, SEP = '\u200B', '\u200C', '\uFEFF'
    watermark = SEP + ''.join(ZERO if bit == '0' else ONE for bit in token_bits) + SEP
    
    words = text.split()
    if len(words) == 0:
        return watermark + text
    
    watermark_chars = list(watermark)
    step = max(1, len(words) // len(watermark_chars))
    result = []
    watermark_idx = 0
    for i, word in enumerate(words):
        result.append(word)
        if watermark_idx < len(watermark_chars) and i % step == 0:
            result.append(watermark_chars[watermark_idx])
            watermark_idx += 1
    while watermark_idx < len(watermark_chars):
        result.append(watermark_chars[watermark_idx])
        watermark_idx += 1
    return ''.join(result)

def extract_watermark(text: str) -> Optional[bytes]:
    """Extract watermark from text"""
    ZERO, ONE, SEP = '\u200B', '\u200C', '\uFEFF'
    watermark_chars = [c for c in text if c in [ZERO, ONE, SEP]]
    if not watermark_chars:
        return None
    bits = ''.join('0' if c == ZERO else '1' for c in watermark_chars if c != SEP)
    if len(bits) < 64:
        return None
    token_bytes = bytes(int(bits[i:i+8], 2) for i in range(0, 64, 8))
    return token_bytes

def aes_encrypt(plaintext: str, key: bytes) -> str:
    """Encrypt text using AES-256-CBC"""
    iv = secrets.token_bytes(16)
    plaintext_bytes = plaintext.encode('utf-8')
    padding_length = 16 - (len(plaintext_bytes) % 16)
    padded_plaintext = plaintext_bytes + bytes([padding_length] * padding_length)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_plaintext) + encryptor.finalize()
    return base64.b64encode(iv + ciphertext).decode()

def aes_decrypt(ciphertext_b64: str, key: bytes) -> str:
    """Decrypt AES-256-CBC ciphertext"""
    data = base64.b64decode(ciphertext_b64)
    iv = data[:16]
    ciphertext = data[16:]
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    padding_length = padded_plaintext[-1]
    plaintext = padded_plaintext[:-padding_length]
    return plaintext.decode('utf-8')

@app.get("/")
def read_root():
    return {"message": "GhostMark API - Zero-Trace Secure Document Delivery"}

@app.post("/api/dh/init-sender")
def init_sender():
    """Initialize sender's DH key exchange"""
    session_id = secrets.token_urlsafe(16)
    private, public = generate_dh_keypair()
    sessions[session_id] = {
        'private': private,
        'public': public,
        'role': 'sender',
        'shared_secret': None
    }
    qr_data = json.dumps({"s": session_id, "p": str(public)})
    qr_image = generate_qr_code(qr_data)
    return {
        'session_id': session_id,
        'public_value': str(public),
        'qr_code': qr_image
    }

@app.post("/api/dh/init-recipient")
def init_recipient(data: DHPublicValue):
    """Initialize recipient's DH key exchange with sender's public value"""
    sender_public = int(data.public_value)
    private, public = generate_dh_keypair()
    shared_secret = compute_shared_secret(private, sender_public)
    recipient_session_id = secrets.token_urlsafe(16)
    sessions[recipient_session_id] = {
        'private': private,
        'public': public,
        'role': 'recipient',
        'shared_secret': shared_secret,
        'sender_session': data.session_id
    }
    qr_data = f"{public}"
    qr_image = generate_qr_code(qr_data)
    return {
        'session_id': recipient_session_id,
        'public_value': str(public),
        'qr_code': qr_image,
        'shared_secret': shared_secret.hex()
    }

@app.post("/api/dh/complete-sender")
def complete_sender(data: DHPublicValue):
    """Complete sender's DH exchange with recipient's public value"""
    if data.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[data.session_id]
    recipient_public = int(data.public_value)
    shared_secret = compute_shared_secret(session['private'], recipient_public)
    session['shared_secret'] = shared_secret
    return {
        'shared_secret': shared_secret.hex(),
        'message': 'Key exchange complete'
    }

@app.post("/api/document/send")
def send_document(request: DocumentRequest):
    """Watermark and encrypt document for recipient"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[request.session_id]
    if session['shared_secret'] is None:
        raise HTTPException(status_code=400, detail="Key exchange not complete")
    
    watermarked_text = embed_watermark(
        request.document_text,
        request.recipient_name,
        session['shared_secret']
    )
    encrypted = aes_encrypt(watermarked_text, session['shared_secret'])
    
    # Store record in SQLite
    expected_token = hmac.new(
        session['shared_secret'],
        request.recipient_name.encode(),
        hashlib.sha256
    ).digest()[:8]
    token_hex = expected_token.hex()
    snippet = request.document_text[:100] + ("..." if len(request.document_text) > 100 else "")
    
    conn = sqlite3.connect('ghostmark.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sent_documents (session_id, recipient_name, watermark_token, document_snippet)
        VALUES (?, ?, ?, ?)
    ''', (request.session_id, request.recipient_name, token_hex, snippet))
    conn.commit()
    conn.close()
    
    try:
        encrypted_qr = generate_qr_code(encrypted)
    except Exception:
        encrypted_qr = None
        
    return {
        'encrypted_document': encrypted,
        'encrypted_document_qr': encrypted_qr,
        'recipient': request.recipient_name,
        'message': 'Document watermarked and encrypted'
    }

@app.post("/api/document/decrypt")
def decrypt_document(request: DocumentRequest):
    """Decrypt document for recipient"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[request.session_id]
    if session['shared_secret'] is None:
        raise HTTPException(status_code=400, detail="Key exchange not complete")
    decrypted = aes_decrypt(request.document_text, session['shared_secret'])
    return {
        'decrypted_document': decrypted,
        'message': 'Document decrypted successfully'
    }

@app.post("/api/leak/detect")
def detect_leak(request: LeakDetectionRequest):
    """Detect leak source from watermarked document"""
    extracted_token = extract_watermark(request.leaked_text)
    
    if extracted_token is None:
        return {
            'leak_detected': False,
            'message': 'No watermark found in text'
        }
        
    token_hex = extracted_token.hex()
    
    conn = sqlite3.connect('ghostmark.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT recipient_name, timestamp, document_snippet 
        FROM sent_documents 
        WHERE watermark_token = ?
    ''', (token_hex,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            'leak_detected': True,
            'leaker': row[0],
            'timestamp': row[1],
            'snippet': row[2],
            'token_match': token_hex,
            'message': f'Document leaked by: {row[0]}'
        }
    
    return {
        'leak_detected': True,
        'leaker': 'Unknown',
        'message': 'Watermark found but no matching recipient in database'
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
