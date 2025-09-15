import { useState, useEffect } from 'react'
import './App.css'

interface HealthCheck {
  status: string
  timestamp: number
}

interface Message {
  text: string
}

function App() {
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [message, setMessage] = useState<string>('')
  const [echoInput, setEchoInput] = useState<string>('')
  const [echoResponse, setEchoResponse] = useState<string>('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

  useEffect(() => {
    // Check backend health
    fetch(`${API_URL}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Health check failed:', err))
  }, [])

  const fetchHello = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hello`)
      const data: Message = await response.json()
      setMessage(data.text)
    } catch (error) {
      console.error('Failed to fetch hello:', error)
      setMessage('Error connecting to backend')
    }
  }

  const sendEcho = async () => {
    if (!echoInput.trim()) return

    try {
      const response = await fetch(`${API_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: echoInput })
      })
      const data: Message = await response.json()
      setEchoResponse(data.text)
    } catch (error) {
      console.error('Failed to send echo:', error)
      setEchoResponse('Error sending echo')
    }
  }

  return (
    <>
      <h1>Frontend-Backend Communication Test</h1>

      <div className="card">
        <h2>Health Check</h2>
        {health ? (
          <p>
            Status: {health.status} |
            Timestamp: {new Date(health.timestamp * 1000).toLocaleString()}
          </p>
        ) : (
          <p>Checking backend health...</p>
        )}
      </div>

      <div className="card">
        <h2>GET Request Test</h2>
        <button onClick={fetchHello}>
          Fetch Hello Message
        </button>
        {message && <p>{message}</p>}
      </div>

      <div className="card">
        <h2>POST Request Test</h2>
        <input
          type="text"
          value={echoInput}
          onChange={(e) => setEchoInput(e.target.value)}
          placeholder="Enter text to echo"
        />
        <button onClick={sendEcho}>
          Send Echo
        </button>
        {echoResponse && <p>{echoResponse}</p>}
      </div>
    </>
  )
}

export default App
