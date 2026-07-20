import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, Marker, useMap, SVGOverlay, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-rotate';
import { generateDocx } from './utils/docxGenerator';
import CompassControl from './components/map/CompassControl';
import { TerritoriesContext } from './context/TerritoriesContext';

function MapBoundsFitter({ territories }) {
  const map = useMap();
  useEffect(() => {
    if (territories && territories.length > 0 && territories[0].limites) {
      const bounds = L.latLngBounds(territories[0].limites);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [territories, map]);
  return null;
}

function ZoomTracker({ onZoomChange, onBoundsChange }) {
  const map = useMapEvents({
    zoomend: () => { onZoomChange(map.getZoom()); if (onBoundsChange) onBoundsChange(map.getBounds()); },
    moveend: () => { if (onBoundsChange) onBoundsChange(map.getBounds()); },
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
    if (onBoundsChange) onBoundsChange(map.getBounds());
  }, [map, onZoomChange, onBoundsChange]);
  return null;
}

function TerritoryWatermark({ territory, currentZoom, businessLayerActive }) {
  if (!territory || !territory.limites) return null;
  const opacity = businessLayerActive ? 0.15 : (currentZoom <= 16 ? 1 : 0.15);
  const fontSize = currentZoom <= 16 ? '40' : '20';
  const bounds = L.latLngBounds(territory.limites);
  return (
    <SVGOverlay bounds={bounds} zIndexOffset={currentZoom <= 16 ? 100 : -100}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={fontSize}
          fontWeight="900" fill={`rgba(0,0,0,${opacity})`}
          style={{ userSelect: 'none', transition: 'all 0.3s', textShadow: '2px 2px 4px rgba(255,255,255,0.8)' }}>
          {territory.numero_territorio}
        </text>
      </svg>
    </SVGOverlay>
  );
}

function UserLocation() {
  const [position, setPosition] = useState(null);
  const map = useMapEvents({
    locationfound(e) { setPosition(e.latlng); map.flyTo(e.latlng, 18); },
    locationerror() { alert('No se pudo obtener la ubicación. Verifica los permisos de tu navegador o GPS.'); },
  });
  return (
    <>
      <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
        <button onClick={() => map.locate()} className="icon-btn" title="Mi ubicación">📍</button>
      </div>
      {position && (<Marker position={position}><Popup>Estás aquí</Popup></Marker>)}
    </>
  );
}

function ClearAllButton({ onConfirm }) {
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState(15);
  useEffect(() => {
    let timer;
    if (step === 1 && countdown > 0) timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown]);
  return (
    <>
      <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 1000 }}>
        <button onClick={() => { setStep(1); setCountdown(15); }}
          style={{ padding: '10px 15px', background: 'white', border: '2px solid red', borderRadius: '8px', cursor: 'pointer', color: 'red', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
          Limpiar
        </button>
      </div>
      {step === 1 && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>¿Seguro que quiere limpiar todas las manzanas?</h2>
            <p>Esta acción borrará el progreso de todos los territorios. Por favor espere {countdown} segundos para confirmar.</p>
            <button disabled={countdown > 0} onClick={() => setStep(2)} style={countdown === 0 ? { background: '#ef4444', color: 'white' } : {}}>
              {countdown > 0 ? `Esperar ${countdown}s` : 'Continuar'}
            </button>
            <button onClick={() => setStep(0)}>Cancelar</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>ÚLTIMA ADVERTENCIA</h2>
            <p>Oprima el botón rojo para limpiar TODAS las manzanas.</p>
            <button style={{ background: 'red', color: 'white', fontWeight: 'bold' }} onClick={() => { onConfirm(); setStep(0); }}>
              Borrar Todo Definitivamente
            </button>
            <button onClick={() => setStep(0)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

function DocxModal({ onClose, onGenerate }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const years = [2025, 2026, 2027, 2028, 2029, 2030];
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Descargar Registro DOCX</h2>
        <p>Seleccione el Año de servicio:</p>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 0 }}>Ej: Año 2026 = Sept 2025 a Ago 2026</p>
        <select className="name-modal-input" value={year} onChange={(e) => setYear(e.target.value)} style={{ marginTop: '10px' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button style={{ background: '#2563eb', color: 'white', marginTop: 15 }} onClick={() => { onGenerate(year); onClose(); }}>Generar DOCX</button>
        <button onClick={onClose} style={{ marginTop: 5 }}>Cancelar</button>
      </div>
    </div>
  );
}

function LogPanel({ log, onClose, onDownloadDocx, onDeleteEntry, canDownload, canDelete }) {
  const reversed = [...log].reverse();
  return (
    <div className="log-panel-overlay" onClick={onClose}>
      <div className="log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="log-panel-header">
          <h3>📋 Registro de Actividad</h3>
          <button className="log-close-btn" onClick={onClose}>✕</button>
        </div>
        {canDownload && (
          <div style={{ padding: '10px' }}>
            <button onClick={onDownloadDocx} className="docx-btn">📄 Descargar Registro DOCX</button>
          </div>
        )}
        <div className="log-panel-body">
          {reversed.length === 0 && <p className="log-empty">No hay actividad registrada aún.</p>}
          {reversed.map((entry, i) => {
            const emoji = entry.type === 'completar_manzana' ? '🟢' : entry.type === 'parcial_manzana' ? '🟡' : entry.type === 'terminar_parcial' ? '✅' : entry.type === 'territorio_completo' ? '🏆' : entry.type === 'limpiar_todo' ? '🗑️' : '📝';
            let mainText = '', subText = '';
            if (entry.type === 'completar_manzana') { mainText = `Territorio ${entry.territoryNum}`; subText = `Se completó la manzana ${entry.blockNum}`; }
            else if (entry.type === 'parcial_manzana') { mainText = `Territorio ${entry.territoryNum}`; subText = `Se realizó parcial de la manzana ${entry.blockNum}`; }
            else if (entry.type === 'terminar_parcial') { mainText = `Territorio ${entry.territoryNum}`; subText = `Se terminó parcial de la manzana ${entry.blockNum}`; }
            else if (entry.type === 'territorio_completo') { mainText = `¡Territorio ${entry.territoryNum} COMPLETADO!`; }
            else if (entry.type === 'limpiar_todo') { mainText = 'Limpiar todo'; }
            else { mainText = 'Cambio'; }
            return (
              <div key={i} className={`log-entry log-type-${entry.type}`} style={{ display: 'flex' }}>
                <span className="log-emoji">{emoji}</span>
                <div className="log-info" style={{ flexGrow: 1 }}>
                  <strong>{mainText}</strong>
                  {subText && <div style={{ fontSize: '0.9em', color: '#555', marginTop: '2px' }}>{subText}</div>}
                  <div className="log-meta" style={{ marginTop: '4px' }}>{entry.userName} — {new Date(entry.date).toLocaleString()}</div>
                </div>
                {canDelete && (
                  <button onClick={() => { if (window.confirm('¿Seguro que quieres borrar este registro?')) onDeleteEntry(entry.date); }}
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px', alignSelf: 'center', flexShrink: 0 }}
                    title="Borrar registro">🗑️</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MapComponent() {
  const {
    partStates, territories, currentZoom, setCurrentZoom, mapBounds, setMapBounds,
    userName, activityLog, isReadOnly, isAuthenticated, mapPermissions,
    businessLayerActive, setBusinessLayerActive,
    togglePart, markBlockParts, toggleFaceType, updateBagPosition, clearAll, deleteLogEntry,
  } = useContext(TerritoriesContext);

  const [showDocxModal, setShowDocxModal] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showDocxModal && mapPermissions.can_download_report && (
        <DocxModal onClose={() => setShowDocxModal(false)} onGenerate={(y) => generateDocx(y, activityLog)} />
      )}

      <MapContainer center={[4.7425, -74.090]} zoom={16} minZoom={14} maxZoom={22} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={false} preferCanvas={true} rotate={true} touchRotate={false} rotateControl={{ closeOnZero: true, position: 'bottomleft' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} />
        <ZoomTracker onZoomChange={setCurrentZoom} onBoundsChange={setMapBounds} />
        <MapBoundsFitter territories={territories} />
        <UserLocation />
        <CompassControl />

        {territories.map(territory => {
          let totalNormalParts = 0, completedNormalParts = 0, totalBusinessParts = 0, completedBusinessParts = 0;
          if (territory.manzanas) {
            territory.manzanas.forEach(block => {
              const numSides = block.puntos.length;
              for (let i = 0; i < numSides; i++) {
                const isBusiness = partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business';
                const isCompleted = partStates[`${territory.territorio_id}_${block.id}_p${i}`] === 'completed';
                if (isBusiness) { totalBusinessParts++; if (isCompleted) completedBusinessParts++; }
                else { totalNormalParts++; if (isCompleted) completedNormalParts++; }
              }
            });
          }

          let territoryColor = 'rgba(0,0,0,0.4)';
          if (completedNormalParts > 0 && completedNormalParts < totalNormalParts) territoryColor = '#eab308';
          else if (completedNormalParts === totalNormalParts && totalNormalParts > 0) territoryColor = '#22c55e';

          let territoryBagColor = null;
          if (totalBusinessParts > 0) {
            if (completedBusinessParts === totalBusinessParts) territoryBagColor = '#3b82f6';
            else if (completedBusinessParts > 0) territoryBagColor = '#f97316';
            else territoryBagColor = '#9ca3af';
          }

          let territoryCenter = null;
          if (territory.limites && territory.limites.length >= 3) territoryCenter = L.latLngBounds(territory.limites).getCenter();

          let iconAnchor = [18, -15];
          const bagPos = partStates[`bag_pos_${territory.territorio_id}`] || 'Abajo';
          if (bagPos === 'Arriba') iconAnchor = [18, 45];
          else if (bagPos === 'Izquierda') iconAnchor = [45, 15];
          else if (bagPos === 'Derecha') iconAnchor = [-10, 15];
          else if (bagPos === 'Centro') iconAnchor = [18, 15];

          const isTerritoryVisible = !mapBounds || !territory.limites || L.latLngBounds(territory.limites).intersects(mapBounds);

          return (
          <React.Fragment key={territory.territorio_id}>
            <TerritoryWatermark territory={territory} currentZoom={currentZoom} businessLayerActive={businessLayerActive} />

            {territoryCenter && territoryBagColor && currentZoom <= 16 && !businessLayerActive && (
              <Marker key={`bag-${territory.territorio_id}-${bagPos}`} position={territoryCenter}
                icon={L.divIcon({ className: 'territory-bag-container', html: `<div class="block-bag" style="background:${territoryBagColor}; padding: 4px 8px; font-size: 16px; border-radius: 6px;">💼</div>`, iconSize: [36, 30], iconAnchor })}
                interactive={false} />
            )}

            {territory.limites && territory.limites.length >= 3 && !businessLayerActive && (
              <Polygon positions={territory.limites} pathOptions={{ color: territoryColor, weight: currentZoom <= 16 ? 5 : 3, fill: currentZoom <= 16, fillColor: territoryColor, fillOpacity: 0.2, dashArray: '5, 5', opacity: 0.9 }} interactive={false} />
            )}

            {(currentZoom > 16 || businessLayerActive) && isTerritoryVisible && territory.manzanas.map(block => {
              if (mapBounds) {
                const blockBounds = L.latLngBounds(block.puntos);
                if (!mapBounds.intersects(blockBounds)) return null;
              }
              const numSides = block.puntos.length;
              let normalCount = 0, normalCompletedCount = 0, businessCount = 0, businessCompletedCount = 0;
              for (let i = 0; i < numSides; i++) {
                const id = `${territory.territorio_id}_${block.id}_p${i}`;
                const isBusiness = partStates[`type_${id}`] === 'business';
                const isDone = partStates[id] === 'completed';
                if (isBusiness) { businessCount++; if (isDone) businessCompletedCount++; }
                else { normalCount++; if (isDone) normalCompletedCount++; }
              }

              let bagColor = '#9ca3af';
              if (businessCount > 0) {
                if (businessCompletedCount === businessCount) bagColor = '#3b82f6';
                else if (businessCompletedCount > 0) bagColor = '#f97316';
              }
              if (businessLayerActive && businessCount === 0) return null;

              const isFullyCompletedNormal = normalCount > 0 && normalCompletedCount === normalCount;
              const isPartiallyCompletedNormal = normalCompletedCount > 0 && normalCompletedCount < normalCount;
              let fillColor = isFullyCompletedNormal ? '#22c55e' : isPartiallyCompletedNormal ? '#fbbf24' : '#3b82f6';
              let fillOpacity = isFullyCompletedNormal ? 0.6 : isPartiallyCompletedNormal ? 0.4 : 0.0;
              if (normalCount === 0) { fillColor = '#3b82f6'; fillOpacity = 0.0; }
              if (businessLayerActive) fillOpacity = 0.0;

              const blockCenter = L.latLngBounds(block.puntos).getCenter();
              const bagHtml = businessCount > 0 ? `<div class="block-bag" style="background:${bagColor};">💼</div>` : '';
              const blockIcon = L.divIcon({ className: 'block-number-container', html: `<div class="block-number-label"><span>${block.numero}</span></div>${!businessLayerActive ? bagHtml : ''}`, iconSize: [24, 40], iconAnchor: [12, 12] });

              return (
                <React.Fragment key={block.id}>
                  {!businessLayerActive && (<Marker position={blockCenter} icon={blockIcon} interactive={false} />)}

                  <Polygon positions={block.puntos} pathOptions={{ stroke: false, fillColor, fillOpacity }} interactive={!businessLayerActive}>
                    <Popup>
                      <div className="popup-content">
                        <h3>Manzana {block.numero}</h3>
                        <p>Normales: {normalCompletedCount}/{normalCount} | Negocios: {businessCompletedCount}/{businessCount}</p>
                        <div className="sides-grid">
                          {block.puntos.map((_, i) => {
                            const id = `${territory.territorio_id}_${block.id}_p${i}`;
                            const isDone = partStates[id] === 'completed';
                            const isBusiness = partStates[`type_${id}`] === 'business';
                            return (
                              <div key={i} style={{ display: 'flex', gap: '5px' }}>
                                <button className={`side-btn ${isDone ? 'done' : ''}`} style={{ flex: 1, background: isBusiness && !isDone ? '#3b82f6' : '' }}
                                  onClick={() => !isReadOnly && togglePart(territory, block, i, partStates[id])} disabled={isReadOnly}>
                                  Cara {i + 1} {isDone ? '✓' : ''}
                                </button>
                                {!isReadOnly && mapPermissions.can_set_business && (
                                  <button className="type-toggle-btn" style={{ background: isBusiness ? '#4b5563' : '#e5e7eb', color: isBusiness ? 'white' : 'black' }}
                                    onClick={() => toggleFaceType(territory, block, i, isBusiness)} title="Marcar como negocio">💼</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {!isReadOnly && (
                          <>
                            <button className="complete-all-btn"
                              onClick={() => {
                                const targetState = normalCompletedCount === normalCount ? 'pending' : 'completed';
                                const indices = [];
                                block.puntos.forEach((_, i) => {
                                  if (partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] !== 'business') indices.push(i);
                                });
                                markBlockParts(territory, block, indices, targetState);
                              }}>
                              {normalCompletedCount === normalCount ? 'Desmarcar Normales' : 'Marcar Normales'}
                            </button>
                            {businessCount > 0 && (
                              <button className="complete-all-btn"
                                style={{ marginTop: '5px', background: businessCompletedCount === businessCount ? '#f87171' : '#3b82f6' }}
                                onClick={() => {
                                  const targetState = businessCompletedCount === businessCount ? 'pending' : 'completed';
                                  const indices = [];
                                  block.puntos.forEach((_, i) => {
                                    if (partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business') indices.push(i);
                                  });
                                  markBlockParts(territory, block, indices, targetState);
                                }}>
                                {businessCompletedCount === businessCount ? 'Desmarcar Negocios' : 'Marcar Negocios'}
                              </button>
                            )}
                          </>
                        )}

                        {!isReadOnly && mapPermissions.can_set_business && (
                          <div style={{ marginTop: '10px', padding: '5px', background: '#f3f4f6', borderRadius: '5px' }}>
                            <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: '#4b5563' }}>Posición del Maletín del Territorio:</label>
                            <select style={{ width: '100%', padding: '3px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                              value={partStates[`bag_pos_${territory.territorio_id}`] || 'Abajo'}
                              onChange={(e) => updateBagPosition(territory.territorio_id, e.target.value)}>
                              <option value="Abajo">Abajo</option>
                              <option value="Arriba">Arriba</option>
                              <option value="Izquierda">Izquierda</option>
                              <option value="Derecha">Derecha</option>
                              <option value="Centro">Centro</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polygon>

                  {block.puntos.map((point, i) => {
                    const nextI = (i + 1) % numSides;
                    const linePositions = [point, block.puntos[nextI]];
                    const isDone = partStates[`${territory.territorio_id}_${block.id}_p${i}`] === 'completed';
                    const isBusiness = partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business';
                    if (businessLayerActive && !isBusiness) return null;
                    let lineColor = isDone ? '#16a34a' : '#ef4444';
                    if (isBusiness) lineColor = isDone ? '#16a34a' : '#3b82f6';
                    return (<Polyline key={`line_${i}`} positions={linePositions} pathOptions={{ color: lineColor, weight: isDone ? 6 : 3, opacity: 0.9 }} />);
                  })}
                </React.Fragment>
              );
            })}
          </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Capa de negocios */}
      <div style={{ position: 'absolute', top: 120, right: 15, zIndex: 10000 }}>
        <button className="icon-btn" style={{ background: businessLayerActive ? '#4b5563' : 'white', color: businessLayerActive ? 'white' : 'black' }}
          onClick={() => setBusinessLayerActive(!businessLayerActive)} title="Capa de Negocios">💼</button>
      </div>

      {/* Registro de actividad (solo autenticados) */}
      {isAuthenticated && (
        <div style={{ position: 'absolute', top: 70, right: 15, zIndex: 10000 }}>
          <button className="icon-btn" onClick={() => setShowLogPanel(true)} title="Registro de actividad">☰</button>
        </div>
      )}

      {/* Barra de usuario (nombre del perfil, no editable) */}
      {isAuthenticated && (
        <div className="user-name-bar"><span>Usuario: {userName}</span></div>
      )}

      {/* Limpiar todo (requiere permiso) */}
      {mapPermissions.can_clear && (<ClearAllButton onConfirm={() => clearAll()} />)}

      {isAuthenticated && showLogPanel && (
        <LogPanel log={activityLog} onClose={() => setShowLogPanel(false)}
          onDownloadDocx={() => { setShowLogPanel(false); setShowDocxModal(true); }}
          onDeleteEntry={deleteLogEntry}
          canDownload={mapPermissions.can_download_report}
          canDelete={mapPermissions.can_delete_log} />
      )}
    </div>
  );
}

export default MapComponent;
