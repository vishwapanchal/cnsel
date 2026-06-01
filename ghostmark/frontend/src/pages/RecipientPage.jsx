import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import jsQR from 'jsqr'

const API_BASE = ''

function RecipientPage() {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [sharedSecret, setSharedSecret] = useState('')
  const [decryptedDoc, setDecryptedDoc] = useState('')
  const [scanning, setScanning] = useState(false)
  const [alert, setAlert] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scanIntervalRef = useRef(null)

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 5000)
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
    
    if (step === 1) {
      try {
        const parsed = JSON.parse(data)
        if (parsed.s && parsed.p) {
          showAlert('Sender QR code scanned successfully! Initializing...', 'success')
          initializeRecipient(parsed.s, parsed.p)
        } else {
          throw new Error('Invalid QR format')
        }
      } catch (err) {
        showAlert('QR code scanned, but it is not in the correct JSON format. Try again.', 'warning')
      }
    } else if (step === 2) {
      showAlert('Encrypted document scanned! Decrypting...', 'success')
      decryptDocument(data)
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

  const initializeRecipient = async (sId, pVal) => {
    try {
      const response = await axios.post(`${API_BASE}/api/dh/init-recipient`, {
        public_value: pVal,
        session_id: sId
      })
      setSessionId(response.data.session_id)
      setQrCode(response.data.qr_code)
      setSharedSecret(response.data.shared_secret)
      setStep(2)
      showAlert('Key exchange complete! Show your QR to sender.', 'success')
    } catch (error) {
      showAlert('Error initializing recipient: ' + error.message, 'error')
    }
  }

  const decryptDocument = async (docText) => {
    try {
      const response = await axios.post(`${API_BASE}/api/document/decrypt`, {
        session_id: sessionId,
        document_text: docText,
        recipient_name: 'Recipient'
      })
      setDecryptedDoc(response.data.decrypted_document)
      setStep(3)
      showAlert('Document decrypted successfully!', 'success')
    } catch (error) {
      showAlert('Error decrypting document: ' + error.message, 'error')
    }
  }

  const downloadTxtFile = () => {
    const element = document.createElement("a");
    const file = new Blob([decryptedDoc], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "ghostmark_secure_document.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
    showAlert('Document downloaded as .txt safely!', 'success');
  }

  useEffect(() => {
    return () => { stopWebcamScanning() }
  }, [])

  return (
    <div>
      <h1 style={{ color: 'white', marginBottom: '24px', textAlign: 'center' }}>📥 Recipient Dashboard</h1>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {step === 1 && (
        <div className="card">
          <h2>Step 1: Scan Sender QR</h2>
          <p style={{ marginBottom: '20px', color: '#6b7280' }}>Use your camera to scan the initial QR code displayed by the sender.</p>
          {!scanning && (
            <button className="btn btn-primary" onClick={startWebcamScanning}>Start Camera</button>
          )}
          {scanning && (
            <div>
              <div className="video-container" style={{ background: '#000', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
              <button className="btn btn-danger" onClick={stopWebcamScanning} style={{ marginTop: '12px' }}>Stop Camera</button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="card">
            <div className="alert alert-success">✅ Key Exchange Complete! Shared Secret: {sharedSecret.substring(0, 16)}...</div>
          </div>
          <div className="card">
            <h2>Step 2: Show Your QR to Sender</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Display this QR code to the sender's webcam.</p>
            <div className="qr-display">
              <img src={`data:image/png;base64,${qrCode}`} alt="Recipient QR Code" />
            </div>
          </div>
          <div className="card">
            <h2>Step 3: Scan Encrypted Document</h2>
            <p>Scan the final QR code displayed by the sender to receive and decrypt the document.</p>
            {!scanning ? (
              <button className="btn btn-secondary" onClick={startWebcamScanning}>Start Scanner</button>
            ) : (
              <div>
                <div className="video-container" style={{ background: '#000', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                <button className="btn btn-danger" onClick={stopWebcamScanning} style={{ marginTop: '12px' }}>Stop Camera</button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2>✅ Decrypted Document</h2>
          <div className="alert alert-success">Document decrypted successfully! (Contains invisible watermark)</div>
          <div className="input-group">
            <label>Decrypted Text</label>
            <textarea value={decryptedDoc} readOnly style={{ minHeight: '200px' }} />
          </div>
          <button className="btn btn-secondary" onClick={downloadTxtFile}>⬇️ Download .txt</button>
          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={() => {
              setStep(1); setSessionId(''); setQrCode(''); setSharedSecret(''); setDecryptedDoc('');
            }}>Start New Session</button>
          </div>
          <div className="alert alert-warning" style={{ marginTop: '20px' }}>
            ⚠️ Warning: This document contains an invisible cryptographic watermark tied to your identity. If you leak this document, you can be identified.
          </div>
        </div>
      )}
    </div>
  )
}
export default RecipientPage
