import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initializeGoogleAnalytics } from './utils/analytics.js'
import { initializeMicrosoftClarity } from './utils/clarity.js'

initializeGoogleAnalytics()
initializeMicrosoftClarity()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
