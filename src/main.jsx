import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept and swallow benign AbortErrors caused by Firestore WebChannel stream recycling and listener cleanups
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (!reason) return;
  const isAbort =
    reason.name === 'AbortError' ||
    reason.code === 20 ||
    (typeof reason.message === 'string' &&
      (reason.message.includes('signal is aborted') ||
       reason.message.includes('The user aborted a request') ||
       reason.message.includes('Request was aborted')));

  if (isAbort) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
