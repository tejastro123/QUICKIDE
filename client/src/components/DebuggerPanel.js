import React from 'react';

/**
 * Visualizes the Statevector:
 * - Shows index (binary and decimal)
 * - Amplitude (Real + Imag)
 * - Probability (|α|^2)
 */
function DebuggerPanel({ debugData, stepIndex, totalSteps }) {
  if (!debugData) {
    return (
      <div className="panel-content scrollable empty-panel">
        Select IR and enter Debug Mode to inspect quantum states gate-by-gate.
      </div>
    );
  }

  const { statevector, num_qubits, current_gate } = debugData;

  // Helper to format complex numbers
  const formatComplex = (complex) => {
    const real = complex[0].toFixed(3);
    const imag = complex[1].toFixed(3);
    if (Math.abs(complex[1]) < 0.001) return real;
    if (Math.abs(complex[0]) < 0.001) return `${imag}i`;
    return `${real} ${complex[1] >= 0 ? '+' : '-'} ${Math.abs(complex[1]).toFixed(3)}i`;
  };

  return (
    <div className="panel-content scrollable debug-panel">
      <div className="debug-header">
        <div className="step-count">Step: {stepIndex + 1} / {totalSteps}</div>
        <div className="gate-tag">Last Gate: <span>{current_gate}</span></div>
      </div>

      <table className="statevector-table">
        <thead>
          <tr>
            <th>Basis State</th>
            <th>Amplitude</th>
            <th>Prob.</th>
            <th>Graph</th>
          </tr>
        </thead>
        <tbody>
          {statevector.map((val, idx) => {
            const prob = Math.pow(val[0], 2) + Math.pow(val[1], 2);
            if (prob < 0.001 && statevector.length > 8) return null; // Hide near-zero states for large circuits

            const binaryStr = idx.toString(2).padStart(num_qubits, '0');
            
            return (
              <tr key={idx} className={prob > 0.1 ? 'active-state' : ''}>
                <td>|{binaryStr}⟩ ({idx})</td>
                <td className="amplitude-cell">{formatComplex(val)}</td>
                <td>{(prob * 100).toFixed(1)}%</td>
                <td className="graph-cell">
                  <div className="prob-bar" style={{ width: `${prob * 100}%` }}></div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {statevector.length > 32 && (
        <div className="debug-warning">
          Only non-zero states are shown for large circuits.
        </div>
      )}
    </div>
  );
}

export default DebuggerPanel;
