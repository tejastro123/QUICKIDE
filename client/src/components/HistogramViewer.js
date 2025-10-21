import React from 'react';

// The `imageUrl` would come from your global state
function HistogramViewer({ imageUrl, isLoading }) {
  return (
    <div style={{ padding: '10px', height: '100%', boxSizing: 'border-box' }}>
      {isLoading && <div>Simulating...</div>}
      {!isLoading && !imageUrl && <div>Run simulation to see results.</div>}
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt="Simulation Histogram" 
          style={{ maxWidth: '100%', maxHeight: '100%' }} 
        />
      )}
    </div>
  );
}
export default HistogramViewer;