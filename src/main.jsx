import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConsentManager } from './components/ConsentManager.jsx'
import { startTrackingConsent } from './utils/trackingConsent.js'
import { standbyActionsDisabled, standbyTest } from './config/standby.js'

// DL-PRIVACY-CONSENT-01: GA4 and Clarity load only for a valid stored opt-in (and only in
// production on an allowed domain); otherwise nothing optional loads and leftover cookies are removed.
const initialConsent = startTrackingConsent()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {standbyActionsDisabled && (
      <aside id="standby-mode" className="standby-notice">
        {standbyTest ? 'Cloudflare TEST' : 'Cloudflare FAILOVER preview'} — Aucune demande ni aucun e-mail ne sera envoyé depuis cette version. This version cannot submit requests or send email.
      </aside>
    )}
    <ConsentManager initialConsent={initialConsent} />
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
