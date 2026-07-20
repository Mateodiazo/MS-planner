import React, { useContext } from 'react';
import MapComponent from './MapComponent';
import { TerritoriesContext } from './context/TerritoriesContext';

const inIframe = () => { try { return window.self !== window.top; } catch { return true; } };

function StandaloneHeader() {
  const { isAuthenticated, userName, isConnected } = useContext(TerritoriesContext);
  if (inIframe()) return null; // embedido en MS Planner → sin header propio

  return (
    <header className="map-standalone-header">
      <div className="msh-logo">MS</div>
      <span className="msh-title">Territorios</span>
      <div className="msh-status">
        <span className="msh-dot" style={{ background: isConnected ? '#22c55e' : '#9ca3af' }}></span>
        {isConnected ? 'Sincronizado' : 'Conectando…'}
      </div>
      <div className="msh-right">
        {isAuthenticated
          ? <span className="msh-user">👤 {userName}</span>
          : <a className="msh-login" href="/?redirect=/mapas/">Iniciar sesión</a>}
        <a className="msh-back" href="/">← Ir a MS Planner</a>
      </div>
    </header>
  );
}

function ReadOnlyBanner() {
  const { isAuthenticated } = useContext(TerritoriesContext);
  if (isAuthenticated || inIframe()) return null;
  return (
    <div className="map-readonly-banner">
      📖 Estás en modo lectura. Para editar el mapa,{' '}
      <a href="/?redirect=/mapas/">inicia sesión</a>.
    </div>
  );
}

function App() {
  return (
    <div className="app-container">
      <StandaloneHeader />
      <ReadOnlyBanner />
      <main className="map-wrapper" style={{ flex: 1, minHeight: 0 }}>
        <MapComponent />
      </main>
    </div>
  );
}

export default App;
