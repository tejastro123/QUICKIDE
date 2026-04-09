import React from 'react';
import './Toolbar.css';

// Add onOpenFile and onSave
function Toolbar({ 
  onParse, 
  onCompile, 
  onVisualize, 
  onSimulate, 
  onClear, 
  onSave,
  onOpenFile,
  backend,
  setBackend,
  isDebugMode,
  toggleDebugMode,
  onStepForward,
  onStepBackward,
  onCloudSubmit
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onOpenFile} className="accent">Open</button> 
        <button onClick={onSave} className="success_btn">Save Project</button>
      </div>

      <div className="toolbar-group">
        {!isDebugMode ? (
          <>
            <button onClick={onParse}>Parse AST</button>
            <button onClick={onCompile}>Compile IR</button>
            <button onClick={onVisualize}>Visualize</button>
          </>
        ) : (
          <>
            <button onClick={onStepBackward} className="primary_btn" title="Step Backward">⬅ Step Back</button>
            <button onClick={onStepForward} className="primary_btn" title="Step Forward">Step Forward ➡</button>
          </>
        )}
      </div>

      <div className="toolbar-group">
        {!isDebugMode && (
          <>
            <select 
              value={backend} 
              onChange={(e) => setBackend(e.target.value)}
              className="backend-select"
            >
              <option value="ideal">Ideal Simulator</option>
              <option value="fake_manila">Backend: Manila (Noisy)</option>
              <option value="fake_nairobi">Backend: Nairobi (Noisy)</option>
            </select>
            <button onClick={onSimulate} className="primary_btn">Simulate</button>
            <button onClick={onCloudSubmit} className="accent" style={{ color: '#fff', background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>🚀 Run on Real HW</button>
          </>
        )}
        <button 
          onClick={toggleDebugMode} 
          className={`debug-btn ${isDebugMode ? 'active' : ''}`}
        >
          {isDebugMode ? 'Stop Debugging' : '🐛 Debug Mode'}
        </button>
      </div>
      
      <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
        <button onClick={onClear} className="clear-btn">Clear Logs</button>
      </div>
    </div>
  );
}

export default Toolbar;