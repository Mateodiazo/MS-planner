import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TerritoriesProvider } from './context/TerritoriesContext'
import './index.css'

// Tema recibido desde MS Planner cuando el mapa está embedido en un <iframe>.
// (Mismo origen por seguridad: solo aceptamos mensajes de nuestro propio dominio.)
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  if (e.data?.type === 'INIT' || e.data?.type === 'THEME_CHANGE') {
    document.documentElement.setAttribute('data-theme', e.data.theme || 'light');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TerritoriesProvider>
      <App />
    </TerritoriesProvider>
  </React.StrictMode>,
)
