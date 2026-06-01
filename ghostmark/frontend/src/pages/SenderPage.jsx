import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import jsQR from 'jsqr'

const API_BASE = ''

function SenderPage() {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState('')
  const [publicValue, setPublicValue] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [sharedSecret, setSharedSecret] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [documentText, setDocumentText] = useState('')
  const [encryptedDocQr, setEncryptedDocQr] = useState('')
  const [scanning, setScanning] = useState(false)
  const [alert, setAlert] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scanIntervalRef = useRef(null)

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 5000)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.txt')) {
      showAlert('Error: Only .txt files are allowed for security reasons.', 'error')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setDocumentText(event.target.result)
      showAlert('Document loaded from file!', 'success')
    }
    reader.readAsText(file)
  }

  const initializeSender = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/dh/init-sender`)
      setSessionId(response.data.session_id)
      setQrCode(response.data.qr_code)
      setPublicValue(response.data.public_value)
      setStep(2)
      showAlert('QR code generated! Show this to recipient.', 'success')
    } catch (error) {
      showAlert('Error initializing sender: ' + error.message, 'error')
    }
  }

  const startWebcamScanning = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } 
      })
      setScanning(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              scanIntervalRef.current = setInterval(() => { scanQRCode() }, 500)
            }).catch(err => {
              showAlert('Error starting video: ' + err.message, 'error')
            })
          }
        }
      }, 0)
    } catch (error) {
      showAlert('Error accessing webcam: ' + error.message, 'error')
    }
  }

  const scanQRCode = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) { handleQRCodeScanned(code.data) }
      }
    }
  }

  const handleQRCodeScanned = async (data) => {
    stopWebcamScanning()
    try {
      const response = await axios.post(`${API_BASE}/api/dh/complete-sender`, {
        session_id: sessionId,
        public_value: data
      })
      setSharedSecret(response.data.shared_secret)
      setStep(3)
      showAlert('Key exchange complete! Shared secret established.', 'success')
    } catch (error) {
      showAlert('Error completing key exchange: ' + error.message, 'error')
    }
  }

  const stopWebcamScanning = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  const sendDocument = async () => {
    if (!recipientName || !documentText) {
      showAlert('Please enter recipient name and document text', 'warning')
      return
    }
    try {
      const response = await axios.post(`${API_BASE}/api/document/send`, {
        session_id: sessionId,
        recipient_name: recipientName,
        document_text: documentText
      })
      setEncryptedDocQr(response.data.encrypted_document_qr)
      setStep(4)
      showAlert('Document watermarked and encrypted successfully!', 'success')
    } catch (error) {
      showAlert('Error sending document: ' + error.message, 'error')
    }
  }

  useEffect(() => {
    return () => { stopWebcamScanning() }
  }, [])

  return (
    <div>
      <h1 style={{ color: 'white', marginBottom: '24px', textAlign: 'center' }}>📤 Sender Dashboard</h1>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {step === 1 && (
        <div className="card">
          <h2>Step 1: Initialize Key Exchange</h2>
          <p style={{ marginBottom: '20px', color: '#6b7280' }}>Start the Diffie-Hellman key exchange by generating your QR code.</p>
          <button className="btn btn-primary" onClick={initializeSender}>Generate QR Code</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="card">
            <h2>Step 2: Share Your QR with Recipient</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Show this QR code to the recipient.</p>
            <div className="qr-display">
              <img src={`data:image/png;base64,${qrCode}`} alt="Sender QR Code" />
            </div>
          </div>
          <div className="card">
            <h2>Step 3: Scan Recipient's QR Code</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Scan the recipient's QR code with your webcam to complete the exchange.</p>
            {!scanning ? (
              <button className="btn btn-secondary" onClick={startWebcamScanning}>Start Webcam Scanning</button>
            ) : (
              <div>
                <div className="video-container" style={{ background: '#000', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: '100%', height: 'auto', display: 'block' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                <button className="btn btn-danger" onClick={stopWebcamScanning} style={{ marginTop: '12px' }}>Stop Scanning</button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="card">
            <div className="alert alert-success">✅ Key Exchange Complete! Shared Secret: {sharedSecret.substring(0, 16)}...</div>
          </div>
          <div className="card">
            <h2>Step 4: Encrypt Document</h2>
            <div className="input-group">
              <label>Recipient Name</label>
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Enter recipient's name" />
            </div>
            <div className="input-group">
              <label>Document Upload</label>
              <input type="file" accept=".txt" onChange={handleFileUpload} />
            </div>
            <div className="input-group">
              <label>Document Text</label>
              <textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} placeholder="Type or upload the confidential document text..." style={{ minHeight: '150px' }} />
            </div>
            <button className="btn btn-primary" onClick={sendDocument}>Watermark & Encrypt Document</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h2>✅ Document Ready for Transmission</h2>
          <div className="alert alert-success">Document has been watermarked and encrypted!</div>
          <p style={{ marginBottom: '20px', color: '#6b7280' }}>Show this final QR code to the recipient.</p>
          
          {encryptedDocQr ? (
            <div className="qr-display">
              <img src={`data:image/png;base64,${encryptedDocQr}`} alt="Encrypted Document QR" />
            </div>
          ) : (
            <div className="alert alert-danger">Document is too large to fit in a single QR code. Try a shorter document.</div>
          )}

          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={() => {
              setStep(1); setSessionId(''); setQrCode(''); setSharedSecret(''); setRecipientName(''); setDocumentText(''); setEncryptedDocQr('');
            }}>Start New Session</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default SenderPage
