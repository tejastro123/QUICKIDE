import React, { useState, useEffect } from 'react';
import { getAlgorithms } from '../services/api';

function AlgorithmLibrary({ onLoadCode, log }) {
  const [algorithms, setAlgorithms] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { name: 'All Categories', value: '' },
    { name: 'Foundations', value: 'Foundations' },
    { name: 'Search', value: 'Search' },
    { name: 'Cryptography & Complexity', value: 'Cryptography' },
    { name: 'Arithmetic & Transforms', value: 'Arithmetic' },
    { name: 'Error Correction', value: 'Error Correction' },
    { name: 'Variational / NISQ', value: 'Variational' }
  ];

  const fetchAlgorithms = async () => {
    setLoading(true);
    try {
      const response = await getAlgorithms(search, selectedCategory);
      setAlgorithms(response.data);
    } catch (err) {
      console.error(err);
      if (log) log('Failed to load algorithm library.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlgorithms();
  }, [search, selectedCategory]);

  return (
    <div className="panel-content scrollable" style={styles.container}>
      <div style={styles.header}>
        <input
          type="text"
          placeholder="Search algorithms (e.g. Grover, teleport)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={styles.selectInput}
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={styles.grid}>
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse" style={{ ...styles.card, opacity: 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ height: '16px', width: '120px', borderRadius: '4px', background: 'var(--border-color)' }}></div>
                <div style={{ height: '16px', width: '60px', borderRadius: '4px', background: 'var(--border-color)' }}></div>
              </div>
              <div style={{ height: '12px', width: '80px', borderRadius: '4px', background: 'var(--border-color)', marginBottom: '8px' }}></div>
              <div style={{ height: '12px', width: '100%', borderRadius: '4px', background: 'var(--border-color)', marginBottom: '4px' }}></div>
              <div style={{ height: '12px', width: '80%', borderRadius: '4px', background: 'var(--border-color)' }}></div>
            </div>
          ))}
        </div>
      ) : algorithms.length === 0 ? (
        <div style={styles.empty}>No algorithms found matching the filters.</div>
      ) : (
        <div style={styles.grid}>
          {algorithms.map((algo) => (
            <div key={algo.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h4 style={styles.algoName}>{algo.name}</h4>
                <span style={{
                  ...styles.categoryTag,
                  backgroundColor: getCategoryColor(algo.category)
                }}>
                  {algo.category}
                </span>
              </div>
              <div style={styles.qubitTag}>Qubits: {algo.qubits}</div>
              <p style={styles.description}>{algo.description}</p>
              
              <div style={styles.buttonContainer}>
                <button
                  onClick={() => {
                    onLoadCode(algo.code);
                    if (log) log(`Loaded "${algo.name}" into editor.`, 'success');
                  }}
                  style={styles.loadBtn}
                >
                  ⚡ Load into Editor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const getCategoryColor = (category) => {
  switch (category) {
    case 'Foundations': return 'rgba(59, 130, 246, 0.15)';
    case 'Search': return 'rgba(245, 158, 11, 0.15)';
    case 'Cryptography': return 'rgba(16, 185, 129, 0.15)';
    case 'Arithmetic': return 'rgba(139, 92, 246, 0.15)';
    case 'Error Correction': return 'rgba(239, 68, 68, 0.15)';
    case 'Variational': return 'rgba(236, 72, 153, 0.15)';
    default: return 'rgba(255, 255, 255, 0.08)';
  }
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: 'var(--panel-bg)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  searchInput: {
    flexGrow: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
  },
  selectInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.85rem',
    cursor: 'pointer',
    outline: 'none',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    flexGrow: 1,
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '14px',
    transition: 'border-color 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  algoName: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  categoryTag: {
    fontSize: '0.7rem',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    color: 'inherit',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  qubitTag: {
    fontSize: '0.75rem',
    color: '#a78bfa',
    fontWeight: '600',
  },
  description: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#94a3b8',
    lineHeight: '1.45',
    whiteSpace: 'pre-wrap',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '6px',
  },
  loadBtn: {
    background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '24px',
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  empty: {
    textAlign: 'center',
    padding: '24px',
    color: '#94a3b8',
    fontSize: '0.85rem',
  }
};

export default AlgorithmLibrary;
