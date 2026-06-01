import React from 'react'
import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">🔒 GhostMark</h1>
        <p className="hero-subtitle">Zero-Trace Secure Document Delivery with Cryptographic Leak Attribution</p>
        
        <div className="features">
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <span className="feature-text">Optical Diffie-Hellman Key Exchange</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👁️</span>
            <span className="feature-text">Invisible HMAC Watermarking</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <span className="feature-text">Cryptographic Leak Detection</span>
          </div>
        </div>
      </div>

      <div className="role-selection">
        <h2 className="role-title">Choose Your Role</h2>
        
        <div className="role-cards">
          <div className="role-card" onClick={() => navigate('/sender')}>
            <div className="role-icon">📤</div>
            <h3 className="role-name">Sender</h3>
            <p className="role-description">
              Send encrypted documents with invisible watermarks. 
              Perform optical key exchange and embed recipient-specific fingerprints.
            </p>
            <button className="role-button">Start as Sender</button>
          </div>

          <div className="role-card" onClick={() => navigate('/recipient')}>
            <div className="role-icon">📥</div>
            <h3 className="role-name">Recipient</h3>
            <p className="role-description">
              Receive encrypted documents securely. 
              Complete key exchange via QR code and decrypt your documents.
            </p>
            <button className="role-button">Start as Recipient</button>
          </div>

          <div className="role-card" onClick={() => navigate('/detector')}>
            <div className="role-icon">🔍</div>
            <h3 className="role-name">Leak Detector</h3>
            <p className="role-description">
              Identify document leakers instantly. 
              Extract invisible watermarks and trace the source of leaked documents.
            </p>
            <button className="role-button">Detect Leaks</button>
          </div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-box">
          <h3>🚀 How It Works</h3>
          <ol className="info-list">
            <li><strong>Phase 1:</strong> Optical Diffie-Hellman key exchange via QR codes (no network trace)</li>
            <li><strong>Phase 2:</strong> Invisible HMAC watermark embedding + AES-256 encryption</li>
            <li><strong>Phase 3:</strong> Cryptographic leak detection and attribution</li>
          </ol>
        </div>

        <div className="info-box">
          <h3>🔒 Security Features</h3>
          <ul className="info-list">
            <li>Keys never touch the network (optical exchange only)</li>
            <li>Zero-width Unicode watermarks (completely invisible)</li>
            <li>AES-256-CBC encryption with HKDF key derivation</li>
            <li>HMAC-SHA256 cryptographic proof of leak source</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HomePage
