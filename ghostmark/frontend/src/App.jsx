import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SenderPage from './pages/SenderPage'
import RecipientPage from './pages/RecipientPage'
import LeakDetectorPage from './pages/LeakDetectorPage'

function Navigation() {
  const location = useLocation()
  
  // Don't show navigation on home page
  if (location.pathname === '/') {
    return null
  }
  
  return (
    <nav className="nav">
      <div className="nav-content">
        <Link to="/" className="nav-title">🔒 GhostMark</Link>
        <div className="nav-links">
          <Link 
            to="/sender" 
            className={`nav-link ${location.pathname === '/sender' ? 'active' : ''}`}
          >
            Sender
          </Link>
          <Link 
            to="/recipient" 
            className={`nav-link ${location.pathname === '/recipient' ? 'active' : ''}`}
          >
            Recipient
          </Link>
          <Link 
            to="/detector" 
            className={`nav-link ${location.pathname === '/detector' ? 'active' : ''}`}
          >
            Leak Detector
          </Link>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <div className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sender" element={<SenderPage />} />
            <Route path="/recipient" element={<RecipientPage />} />
            <Route path="/detector" element={<LeakDetectorPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
