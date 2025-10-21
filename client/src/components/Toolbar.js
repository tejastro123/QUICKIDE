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
  onOpenFile 
}) {
  return (
    <div className="toolbar">
      {/* New Button */}
      <button onClick={onOpenFile} style={{backgroundColor: '#1c7c8c'}}>Open File</button> 
      <button onClick={onSave} style={{backgroundColor: '#2a8c4a'}}>Save Project</button>
      <button onClick={onParse}>Parse AST</button>
      <button onClick={onCompile}>Compile IR</button>
      <button onClick={onVisualize}>Visualize</button>
      <button onClick={onSimulate}>Simulate</button>
      <button onClick={onClear} className="clear-btn">Clear Console</button>
    </div>
  );
}

export default Toolbar;