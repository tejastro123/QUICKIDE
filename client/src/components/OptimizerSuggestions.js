import React, { useState, useEffect } from 'react';
import { optimizeIr, reverseTranspile, transpileAst } from '../services/api';

function OptimizerSuggestions({ ir, onOptimizeAccept, log }) {
  const [optResult, setOptResult] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);

  const runAnalysis = async () => {
    if (!ir) return;
    setOptimizing(true);
    try {
      const response = await optimizeIr(ir);
      setOptResult(response.data);
    } catch (err) {
      console.error(err);
      if (log) log('Optimization analysis failed.', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    if (ir) {
      runAnalysis();
    } else {
      setOptResult(null);
    }
  }, [ir]);

  const handleAccept = async () => {
    if (!optResult || !optResult.optimized_ir) return;
    setApplying(true);
    try {
      // 1. Get QASM and Qiskit from optimized IR
      const qasmResponse = await transpileAst(optResult.optimized_ir);
      const qiskit = qasmResponse.data.qiskit;

      // 2. Reverse transpile Qiskit back to QuCPL code
      const reverseResponse = await reverseTranspile(qiskit);
      const newCode = reverseResponse.data.code;

      // 3. Inform parent to update state (IR, QASM, Qiskit, Code)
      onOptimizeAccept({
        ir: optResult.optimized_ir,
        qasm: qasmResponse.data.qasm,
        qiskit: qiskit,
        code: newCode
      });

      if (log) log('Peephole optimizations successfully applied and decompiled back to editor.', 'success');
      setOptResult(null); // Reset
    } catch (err) {
      console.error(err);
      if (log) log('Failed to apply optimization to editor.', 'error');
    } finally {
      setApplying(false);
    }
  };

  if (!ir) {
    return (
      <div className="panel-content scrollable empty-panel" style={styles.empty}>
        Compile your circuit first to check for optimization suggestions.
      </div>
    );
  }

  return (
    <div className="panel-content scrollable" style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Peephole Optimizations</h4>
        <button
          onClick={runAnalysis}
          disabled={optimizing}
          style={styles.refreshBtn}
        >
          {optimizing ? 'Analyzing...' : '🔄 Re-Analyze'}
        </button>
      </div>

      {optimizing && <div style={styles.info}>Running analysis passes...</div>}

      {!optimizing && optResult && (
        <div style={styles.content}>
          <div style={styles.statsCard}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Original Gates</span>
              <span style={styles.statVal}>{optResult.stats.original_gate_count}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Optimized Gates</span>
              <span style={{ ...styles.statVal, color: '#4ade80' }}>{optResult.stats.optimized_gate_count}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Gates Removed</span>
              <span style={{ ...styles.statVal, color: '#f87171' }}>{optResult.stats.gates_removed}</span>
            </div>
          </div>

          {optResult.changes.length === 0 ? (
            <div style={styles.noChanges}>
              🎉 Circuit is already fully optimized! No redundant gates or mergeable rotations found.
            </div>
          ) : (
            <div style={styles.changesListContainer}>
              <div style={styles.listTitle}>Optimizations Identified:</div>
              <ul style={styles.list}>
                {optResult.changes.map((change, idx) => (
                  <li key={idx} style={styles.listItem}>
                    <span style={styles.checkIcon}>✓</span> {change}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleAccept}
                disabled={applying}
                style={styles.applyBtn}
              >
                {applying ? 'Applying optimizations...' : '⚡ Accept & Rewrite Circuit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    backgroundColor: 'var(--panel-bg)',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    color: '#94a3b8',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  info: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '20px 0',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  statsCard: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-around',
    gap: '8px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#e2e8f0',
  },
  noChanges: {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '0.8rem',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  changesListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#94a3b8',
  },
  list: {
    margin: 0,
    paddingLeft: '0',
    listStyle: 'none',
    maxHeight: '140px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  listItem: {
    fontSize: '0.78rem',
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    lineHeight: '1.35',
  },
  checkIcon: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  applyBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'opacity 0.2s',
  }
};

export default OptimizerSuggestions;
