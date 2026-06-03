import React, { useState, useEffect } from 'react';
import * as api from '../services/api';

function MultiCircuitComparison({ codeA, irA, histogramUrlA, backend, log }) {
  const [codeB, setCodeB] = useState('// Paste or write Circuit B code here...\n');
  const [comparing, setComparing] = useState(false);
  const [histogramUrlB, setHistogramUrlB] = useState(null);
  const [stats, setStats] = useState(null);

  // Clean up object URL for B on unmount
  useEffect(() => {
    return () => {
      if (histogramUrlB) URL.revokeObjectURL(histogramUrlB);
    };
  }, [histogramUrlB]);

  const handleCompare = async () => {
    if (!irA) {
      if (log) log('Please compile Circuit A first.', 'error');
      return;
    }
    setComparing(true);
    setStats(null);
    if (histogramUrlB) {
      URL.revokeObjectURL(histogramUrlB);
      setHistogramUrlB(null);
    }

    try {
      // 1. Compile Circuit B
      const parseRes = await api.parseCode(codeB);
      const compileRes = await api.compileAst(parseRes.data.ast);
      const irB = compileRes.data.ir;

      // 2. Simulate Circuit B
      const simRes = await api.getSimulation(irB, backend);
      const urlB = URL.createObjectURL(simRes.data);
      setHistogramUrlB(urlB);

      // 3. Compute a similarity metric using statevectors
      // We call the simulation/debugger step endpoints to get the final statevectors for both
      const stepResA = await api.getDebugStep(irA, irA.instructions.length - 1);
      const stepResB = await api.getDebugStep(irB, irB.instructions.length - 1);

      const svA = stepResA.data.statevector;
      const svB = stepResB.data.statevector;

      if (svA && svB) {
        // Calculate probability distributions
        const probsA = svA.map(c => Math.pow(c[0], 2) + Math.pow(c[1], 2));
        const probsB = svB.map(c => Math.pow(c[0], 2) + Math.pow(c[1], 2));

        // Pad the smaller distribution with zeros if qubit count differs
        const maxLength = Math.max(probsA.length, probsB.length);
        while (probsA.length < maxLength) probsA.push(0);
        while (probsB.length < maxLength) probsB.push(0);

        // Compute Total Variation Distance (TVD) = 0.5 * sum(|p_i - q_i|)
        let sumAbsDiff = 0;
        for (let i = 0; i < maxLength; i++) {
          sumAbsDiff += Math.abs(probsA[i] - probsB[i]);
        }
        const tvd = 0.5 * sumAbsDiff;

        // Compute Hellinger Distance = sqrt(0.5 * sum((sqrt(p_i) - sqrt(q_i))^2))
        let sumSqrtDiffSq = 0;
        for (let i = 0; i < maxLength; i++) {
          sumSqrtDiffSq += Math.pow(Math.sqrt(probsA[i]) - Math.sqrt(probsB[i]), 2);
        }
        const hellinger = Math.sqrt(0.5 * sumSqrtDiffSq);

        setStats({
          tvd: tvd,
          similarity: (1 - tvd) * 100,
          hellinger: hellinger,
          qubitsA: stepResA.data.num_qubits,
          qubitsB: stepResB.data.num_qubits
        });
      }

      if (log) log('Comparison complete.', 'success');
    } catch (err) {
      console.error(err);
      if (log) log(`Comparison error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setComparing(false);
    }
  };

  const loadOptimizedToB = async () => {
    if (!irA) return;
    try {
      const optRes = await api.optimizeIr(irA);
      const qasmRes = await api.transpileAst(optRes.data.optimized_ir);
      const revRes = await api.reverseTranspile(qasmRes.data.qasm);
      setCodeB(revRes.data.code);
      if (log) log('Optimized version of Circuit A loaded into Slot B.', 'success');
    } catch (err) {
      console.error(err);
      if (log) log('Failed to load optimized circuit.', 'error');
    }
  };

  return (
    <div className="panel-content scrollable" style={styles.container}>
      <div style={styles.sideBySideCode}>
        {/* Slot A */}
        <div style={styles.codeColumn}>
          <div style={styles.columnHeader}>Slot A (Active Circuit)</div>
          <div style={styles.codeAContainer}>
            <pre style={styles.preCode}>{codeA}</pre>
          </div>
        </div>

        {/* Slot B */}
        <div style={styles.codeColumn}>
          <div style={styles.columnHeader}>
            <span>Slot B (Compare Target)</span>
            <button onClick={loadOptimizedToB} style={styles.smallActionBtn}>
              ⚡ Use Optimized A
            </button>
          </div>
          <textarea
            value={codeB}
            onChange={(e) => setCodeB(e.target.value)}
            style={styles.textareaCode}
          />
        </div>
      </div>

      <div style={styles.actionRow}>
        <button
          onClick={handleCompare}
          disabled={comparing}
          style={styles.compareBtn}
        >
          {comparing ? 'Simulating & Comparing...' : '📊 Run Comparative Analysis'}
        </button>
      </div>

      {stats && (
        <div style={styles.resultsSection}>
          <div style={styles.metricsHeader}>Analysis Results ({backend} backend)</div>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Total Variation Distance</div>
              <div style={{ ...styles.metricValue, color: stats.tvd > 0.05 ? '#f87171' : '#4ade80' }}>
                {(stats.tvd * 100).toFixed(2)}%
              </div>
              <div style={styles.metricDesc}>L1 distance between distributions</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Classical Fidelity / Similarity</div>
              <div style={{ ...styles.metricValue, color: stats.similarity > 95 ? '#4ade80' : '#fbbf24' }}>
                {stats.similarity.toFixed(2)}%
              </div>
              <div style={styles.metricDesc}>Overlap of measurement probabilities</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Hellinger Distance</div>
              <div style={styles.metricValue}>{stats.hellinger.toFixed(4)}</div>
              <div style={styles.metricDesc}>Root-mean-square distance metric</div>
            </div>
          </div>
        </div>
      )}

      {(histogramUrlA || histogramUrlB) && (
        <div style={styles.histogramsRow}>
          <div style={styles.histogramCol}>
            <div style={styles.columnHeader}>Slot A Distribution</div>
            <div style={styles.imageFrame}>
              {histogramUrlA ? (
                <img src={histogramUrlA} alt="Histogram A" style={styles.histImage} />
              ) : (
                <div style={styles.imagePlaceholder}>Run simulation on A first.</div>
              )}
            </div>
          </div>
          <div style={styles.histogramCol}>
            <div style={styles.columnHeader}>Slot B Distribution</div>
            <div style={styles.imageFrame}>
              {histogramUrlB ? (
                <img src={histogramUrlB} alt="Histogram B" style={styles.histImage} />
              ) : (
                <div style={styles.imagePlaceholder}>Click Compare to simulate Slot B.</div>
              )}
            </div>
          </div>
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
    gap: '16px',
    height: '100%',
  },
  sideBySideCode: {
    display: 'flex',
    gap: '12px',
    height: '150px',
  },
  codeColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    height: '100%',
  },
  columnHeader: {
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeAContainer: {
    flexGrow: 1,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px',
    overflow: 'auto',
  },
  preCode: {
    margin: 0,
    fontSize: '0.78rem',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#a78bfa',
  },
  textareaCode: {
    flexGrow: 1,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '0.78rem',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#38bdf8',
    outline: 'none',
    resize: 'none',
  },
  smallActionBtn: {
    fontSize: '0.7rem',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    color: '#c084fc',
    borderRadius: '4px',
    padding: '2px 6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  compareBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 24px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  resultsSection: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
  },
  metricsHeader: {
    fontSize: '0.8rem',
    fontWeight: '700',
    marginBottom: '10px',
    color: '#f8fafc',
    textTransform: 'uppercase',
  },
  metricsGrid: {
    display: 'flex',
    gap: '10px',
  },
  metricCard: {
    flex: 1,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#f8fafc',
  },
  metricDesc: {
    fontSize: '0.62rem',
    color: '#64748b',
    textAlign: 'center',
  },
  histogramsRow: {
    display: 'flex',
    gap: '12px',
    flexGrow: 1,
  },
  histogramCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  imageFrame: {
    flexGrow: 1,
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    minHeight: '160px',
  },
  histImage: {
    maxWidth: '100%',
    maxHeight: '180px',
    objectFit: 'contain',
  },
  imagePlaceholder: {
    fontSize: '0.78rem',
    color: '#64748b',
  }
};

export default MultiCircuitComparison;
