# 🔒 GhostMark

**Zero-Trace Secure Document Delivery with Cryptographic Leak Attribution**

GhostMark is an end-to-end secure document delivery system that combines optical Diffie-Hellman key exchange via QR codes with HMAC-based zero-width Unicode watermarking. It solves two critical problems:

1. **Zero-trace key exchange**: Exchange encryption keys without any digital trace on the network
2. **Leak attribution**: Cryptographically prove which recipient leaked a confidential document

## 🎯 Features

### Phase 1: Optical Diffie-Hellman Key Exchange
- QR code-based key exchange using screen-to-camera communication
- No network involvement during key exchange (works in airplane mode)
- HKDF-SHA256 key derivation for AES-256 keys
- Man-in-the-middle resistant (requires physical interception)

### Phase 2: HMAC Watermark Embedding + AES Encryption
- Invisible watermarking using zero-width Unicode characters
- HMAC-SHA256 binds recipient identity to document
- AES-256-CBC encryption with random IV
- Watermark survives decryption, copying, and pasting

### Phase 3: Leak Detection and Forensic Attribution
- Extract invisible watermark from leaked documents
- O(1) recipient matching using HMAC verification
- Cryptographic proof of leak source (not probabilistic)
- Sub-second detection regardless of document length

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.9+
- **Cryptography**: 
  - Diffie-Hellman with 2048-bit safe primes
  - AES-256-CBC encryption
  - HMAC-SHA256 for watermarking
  - HKDF for key derivation
- **QR Code**: Generation and webcam scanning
- **API**: RESTful endpoints for all operations

### Frontend (React.js)
- **Framework**: React 18 with Vite
- **Camera Access**: getUserMedia API for QR scanning
- **QR Scanning**: jsQR library for browser-based scanning
- **UI**: Responsive design with CSS3
- **Routing**: React Router for multi-page navigation

## 📋 Prerequisites

### Backend Requirements
- Python 3.9 or higher
- pip (Python package manager)
- Webcam (for sender to scan recipient QR)

### Frontend Requirements
- Node.js 18 or higher
- npm or yarn

### System Requirements
- Windows/Linux/macOS
- Camera access for QR code scanning
- Modern web browser (Chrome, Firefox, Edge, Safari)

## 🚀 Installation

### 1. Clone the Repository
```bash
cd C:\Users\vishw\Desktop\CNSEL\ghostmark
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

## 🎮 Running the Application

### Start Backend Server

```bash
# From backend directory
python main.py
```

The API will be available at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Start Frontend Development Server

```bash
# From frontend directory
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage Guide

### For Sender (Laptop)

1. **Navigate to Sender Dashboard** (`http://localhost:3000`)
2. **Click "Generate QR Code"** to initialize key exchange
3. **Show QR code to recipient's phone camera**
4. **Click "Start Webcam Scanning"** to scan recipient's QR response
5. **Enter recipient name and document text**
6. **Click "Watermark & Encrypt Document"**
7. **Copy encrypted document and share with recipient** (via WiFi/email/etc.)

### For Recipient (Phone/Laptop)

1. **Navigate to Recipient Dashboard** (`http://localhost:3000/recipient`)
2. **Click "Start Camera"** to scan sender's QR code
3. **Enter sender's session ID**
4. **Click "Complete Key Exchange"**
5. **Show your QR code to sender's webcam**
6. **Paste encrypted document** received from sender
7. **Click "Decrypt Document"** to view content

### For Leak Detection

1. **Navigate to Leak Detector** (`http://localhost:3000/detector`)
2. **Enter the original session ID** used for encryption
3. **Paste the leaked document text**
4. **Click "Detect Leak Source"**
5. **View forensic analysis** showing which recipient leaked the document

## 🔬 Demo Script (5-Minute Presentation)

### Act 1: The Impossible Key Exchange (90 seconds)

1. Place laptop on table, hold phone visibly
2. Say: *"I will create an encryption key between these devices without using internet, Bluetooth, or cables"*
3. Enable airplane mode on phone and show to audience
4. Generate QR code on laptop
5. Scan with phone camera
6. Phone displays its QR code
7. Laptop webcam scans phone's QR
8. Both screens show same 256-bit key
9. Say: *"The key traveled as light, never touched any network"*

### Act 2: The Invisible Watermark (90 seconds)

1. Enter recipient name and upload document
2. Click "Send Securely"
3. Say: *"Before encrypting, GhostMark embeds an invisible fingerprint"*
4. Show decrypted text in normal editor (looks clean)
5. Show same text in Unicode inspector (reveal zero-width characters)
6. Show network traffic during transmission (encrypted bytes)
7. Say: *"Recipient sees clean text, network sees noise, watermark is invisible"*

### Act 3: Catching the Leaker (60 seconds)

1. Say: *"Imagine this document was leaked"*
2. Copy decrypted text
3. Open Leak Detector
4. Paste leaked text
5. Click "Identify Leaker"
6. Screen instantly shows: *"Document leaked by: [Recipient Name]"*
7. Say: *"Watermark survived copying because it's in the text itself, mathematically bound to recipient's identity"*

## 🧪 Testing

### Test Key Exchange

```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev

# Browser: Open http://localhost:3000
# Follow sender workflow to generate QR
# Open http://localhost:3000/recipient in another tab/device
# Complete key exchange
```

### Test Watermarking

```python
# Test script (backend/test_watermark.py)
import hmac
import hashlib

def test_watermark():
    text = "This is a confidential document."
    recipient = "John Doe"
    secret = b"shared_secret_key"
    
    # Embed watermark
    token = hmac.new(secret, recipient.encode(), hashlib.sha256).digest()[:8]
    bits = ''.join(format(byte, '08b') for byte in token)
    
    ZERO = '\u200B'
    ONE = '\u200C'
    watermark = ''.join(ZERO if bit == '0' else ONE for bit in bits)
    
    watermarked = text + watermark
    
    # Extract watermark
    extracted_chars = [c for c in watermarked if c in [ZERO, ONE]]
    extracted_bits = ''.join('0' if c == ZERO else '1' for c in extracted_chars)
    extracted_token = bytes(int(extracted_bits[i:i+8], 2) for i in range(0, 64, 8))
    
    assert extracted_token == token
    print("✅ Watermark test passed!")

test_watermark()
```

## 📊 Syllabus Coverage (IS3621A)

| Unit | Topic | Implementation |
|------|-------|----------------|
| Unit I | Steganography | Zero-width Unicode watermarking |
| Unit II | AES-256, CBC mode | Document encryption with random IV |
| Unit II | SHA-256 | Used in HKDF and HMAC |
| Unit III | Diffie-Hellman | Optical key exchange via QR codes |
| Unit III | Key exchange protocols | Full DH with HKDF key derivation |
| Unit IV | HMAC | Recipient identity binding |
| Unit IV | Message authentication | Watermark verification |
| Unit V | Transport security | Optical vs TLS comparison |
| Unit VI | User authentication | HMAC-based recipient verification |
| Lab | Implement DH | Visual working demo |

## 🔐 Security Analysis

### Strengths

1. **Key Exchange Security**
   - No network metadata during key exchange
   - Requires physical presence for MITM attack
   - Forward secrecy (session keys not reused)

2. **Watermark Security**
   - HMAC prevents forgery without shared secret
   - Survives text copying and pasting
   - Cryptographically binds recipient to document

3. **Encryption Security**
   - AES-256-CBC with random IV per session
   - Key derived using HKDF-SHA256
   - No key reuse across sessions

### Limitations

1. **Physical Security**
   - Attacker with camera can photograph QR codes
   - Requires trusted physical environment

2. **Watermark Limitations**
   - Can be removed if text is retyped manually
   - Requires original session ID for detection
   - Only works with text documents

3. **Session Management**
   - In-memory session storage (use Redis in production)
   - No session expiration implemented
   - No multi-user authentication

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **cryptography**: AES, HKDF, secure random
- **qrcode**: QR code generation
- **opencv-python**: Webcam access
- **pyzbar**: QR code decoding
- **hmac + hashlib**: HMAC-SHA256

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **jsQR**: Browser QR scanning
- **Axios**: HTTP client

## 📁 Project Structure

```
ghostmark/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── test_watermark.py    # Test scripts
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SenderPage.jsx
│   │   │   ├── RecipientPage.jsx
│   │   │   └── LeakDetectorPage.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🐛 Troubleshooting

### Backend Issues

**Error: "No module named 'cv2'"**
```bash
pip install opencv-python
```

**Error: "pyzbar not found"**
```bash
# Windows: Install Visual C++ Redistributable
# Linux: sudo apt-get install libzbar0
# Mac: brew install zbar
pip install pyzbar
```

### Frontend Issues

**Error: "Camera access denied"**
- Check browser permissions
- Use HTTPS or localhost
- Try different browser

**QR Code not scanning**
- Ensure good lighting
- Hold QR code steady
- Adjust camera distance
- Try different camera

### Network Issues

**CORS errors**
- Ensure backend is running on port 8000
- Check CORS middleware configuration
- Use correct API_BASE URL

## 🚀 Production Deployment

### Backend

```bash
# Use production ASGI server
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend

```bash
# Build for production
npm run build

# Serve with nginx or deploy to Vercel/Netlify
```

### Security Recommendations

1. Use HTTPS in production
2. Implement session expiration
3. Use Redis for session storage
4. Add rate limiting
5. Implement user authentication
6. Add input validation and sanitization
7. Use environment variables for configuration

## 📝 API Documentation

### Endpoints

#### POST /api/dh/init-sender
Initialize sender's DH key exchange

**Response:**
```json
{
  "session_id": "string",
  "public_value": "string",
  "qr_code": "base64_image"
}
```

#### POST /api/dh/init-recipient
Initialize recipient's DH key exchange

**Request:**
```json
{
  "public_value": "string",
  "session_id": "string"
}
```

#### POST /api/document/send
Watermark and encrypt document

**Request:**
```json
{
  "session_id": "string",
  "recipient_name": "string",
  "document_text": "string"
}
```

#### POST /api/leak/detect
Detect leak source from watermarked document

**Request:**
```json
{
  "session_id": "string",
  "leaked_text": "string"
}
```

Full API documentation available at `http://localhost:8000/docs`

## 🤝 Contributing

This is an academic project for IS3621A - Cryptography and Network Security.

## 📄 License

Educational use only - RV College of Engineering

## 👥 Authors

- **Course**: IS3621A - Cryptography and Network Security
- **Institution**: RV College of Engineering, Bengaluru
- **Semester**: VI

## 🙏 Acknowledgments

- Diffie-Hellman key exchange (Whitfield Diffie & Martin Hellman, 1976)
- Unicode Consortium for zero-width character specifications
- FastAPI and React communities

---

**GhostMark** - *Where the key never touched the internet, and the leaker cannot hide.*
