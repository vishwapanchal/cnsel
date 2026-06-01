import React, { useState } from 'react'
import axios from 'axios'

const API_BASE = ''

function LeakDetectorPage() {
  const [sessionId, setSessionId] = useState('')
  const [leakedText, setLeakedText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 5000)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      setLeakedText(text)
      detectLeakFromText(text)
    }
    reader.onerror = () => {
      showAlert('Error reading file', 'error')
    }
    reader.readAsText(file)
  }

  const detectLeak = () => detectLeakFromText(leakedText)

  const detectLeakFromText = async (textToAnalyze) => {
    if (!textToAnalyze) {
      showAlert('Please provide leaked text', 'warning')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await axios.post(`${API_BASE}/api/leak/detect`, {
        leaked_text: textToAnalyze
      })
      
      setResult(response.data)
      
      if (response.data.leak_detected && response.data.leaker !== 'Unknown') {
        showAlert('Leak source identified!', 'success')
      } else if (response.data.leak_detected) {
        showAlert('Watermark found but recipient unknown', 'warning')
      } else {
        showAlert('No watermark detected in text', 'info')
      }
    } catch (error) {
      showAlert('Error detecting leak: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const analyzeWatermark = () => {
    // Extract zero-width characters for visualization
    const ZERO = '\u200B'
    const ONE = '\u200C'
    const SEP = '\uFEFF'
    
    const watermarkChars = leakedText.split('').filter(c => 
      c === ZERO || c === ONE || c === SEP
    )
    
    if (watermarkChars.length === 0) {
      showAlert('No zero-width characters found in text', 'info')
      return
    }

    const bits = watermarkChars
      .filter(c => c !== SEP)
      .map(c => c === ZERO ? '0' : '1')
      .join('')
    
    showAlert(`Found ${watermarkChars.length} zero-width characters (${bits.length} bits)`, 'info')
  }

  return (
    <div>
      <h1 style={{ color: 'white', marginBottom: '24px', textAlign: 'center' }}>
        🔍 Leak Detector
      </h1>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="card">
        <h2>Forensic Watermark Analysis</h2>
        <p style={{ marginBottom: '20px', color: '#6b7280' }}>
          Paste a leaked document to identify which recipient was the source of the leak.
          The system will extract the invisible HMAC watermark and match it against registered recipients.
        </p>

        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>Leaked Document Text</label>
            <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '14px', cursor: 'pointer', margin: 0 }}>
              📁 Upload File
              <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
          <textarea
            value={leakedText}
            onChange={(e) => setLeakedText(e.target.value)}
            placeholder="Paste the leaked document text here..."
            style={{ minHeight: '200px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={detectLeak}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : '🔍 Detect Leak Source'}
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={analyzeWatermark}
            disabled={!leakedText}
          >
            📊 Analyze Watermark
          </button>
        </div>
      </div>

      {loading && (
        <div className="card">
          <div className="loading">
            <div className="spinner"></div>
            <p>Analyzing watermark and matching against recipients...</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="card">
          <h2>🎯 Analysis Results</h2>
          
          {result.leak_detected ? (
            <div>
              {result.leaker !== 'Unknown' ? (
                <div>
                  <div className="alert alert-error">
                    <strong>⚠️ LEAK DETECTED</strong>
                    <br />
                    <br />
                    <strong>Leaked by:</strong> {result.leaker}
                    <br />
                    <strong>HMAC Token Match:</strong> {result.token_match}
                  </div>

                  <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '12px' }}>Forensic Evidence</h3>
                    <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                      The document contains an invisible HMAC-SHA256 watermark that cryptographically 
                      binds it to the recipient's identity. This watermark:
                    </p>
                    <ul style={{ color: '#6b7280', marginLeft: '20px' }}>
                      <li>Was embedded using zero-width Unicode characters</li>
                      <li>Survived decryption, copying, and pasting</li>
                      <li>Cannot be forged without the shared secret</li>
                      <li>Provides mathematical proof of the leak source</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning">
                  <strong>Watermark Detected</strong>
                  <br />
                  <br />
                  A valid watermark was found in the document, but it doesn't match any 
                  registered recipient in this session. The document may be from a different 
                  session or the recipient list is incomplete.
                </div>
              )}
            </div>
          ) : (
            <div className="alert alert-info">
              <strong>No Watermark Detected</strong>
              <br />
              <br />
              No invisible watermark was found in the provided text. This could mean:
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>The document was not processed through GhostMark</li>
                <li>The watermark was removed (unlikely without the shared secret)</li>
                <li>The text was retyped rather than copied</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>How It Works</h3>
        <div style={{ color: '#6b7280', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>Zero-Width Unicode Watermarking:</strong>
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
            <li>U+200B (Zero Width Space) = binary 0</li>
            <li>U+200C (Zero Width Non-Joiner) = binary 1</li>
            <li>U+FEFF (Zero Width No-Break Space) = separator</li>
          </ul>
          
          <p style={{ marginBottom: '12px' }}>
            <strong>HMAC Token Generation:</strong>
          </p>
          <p style={{ marginLeft: '20px', marginBottom: '16px' }}>
            token = HMAC-SHA256(recipient_name, shared_secret)
            <br />
            First 64 bits encoded as invisible characters
          </p>
          
          <p style={{ marginBottom: '12px' }}>
            <strong>Detection Process:</strong>
          </p>
          <ol style={{ marginLeft: '20px' }}>
            <li>Extract zero-width characters from leaked text</li>
            <li>Reconstruct binary token from character sequence</li>
            <li>Recompute HMAC for each registered recipient</li>
            <li>Match extracted token against computed HMACs</li>
            <li>Identify recipient with matching HMAC (O(1) per recipient)</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default LeakDetectorPage
