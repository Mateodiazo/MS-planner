import React from 'react';
import { useMap } from 'react-leaflet';

export default function CompassControl() {
  const map = useMap();
  const [bearing, setBearing] = React.useState(0);
  const compassRef = React.useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    const handleRotate = () => setBearing(map.getBearing());
    map.on('rotate', handleRotate);
    return () => map.off('rotate', handleRotate);
  }, [map]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !compassRef.current) return;
    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Calculate angle in radians
    const radians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    // Convert to degrees and shift so North is up
    let degrees = (radians * 180) / Math.PI + 90;
    if (degrees < 0) degrees += 360;
    
    setBearing(degrees);
    // Use leaflet-rotate's setBearing
    if (typeof map.setBearing === 'function') {
      map.setBearing(degrees);
    }
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={compassRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        bottom: '40px',
        left: '20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '3px solid #ccc',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        cursor: 'grab'
      }}
      title="Arrastra para rotar el mapa"
    >
      <div style={{
        transform: `rotate(${bearing}deg)`,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ width: '0', height: '0', borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: '28px solid #ef4444', marginTop: '6px' }}></div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: '#333' }}>N</div>
      </div>
    </div>
  );
}
