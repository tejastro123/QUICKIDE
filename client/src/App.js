import React, { useState, useEffect, useRef, useContext } from 'react';
import { Routes, Route, useNavigate, useMatch } from 'react-router-dom';
import './App.css';

// Import services and components
import * as api from './services/api';
import { AuthContext } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Modal from './components/Modal';
import IdePage from './pages/IdePage';
import ResourcesPage from './pages/ResourcesPage';
import CloudPage from './pages/CloudPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Helper function to create log entries
const createLog = (message, type = 'info') => ({ message: `[${new Date().toLocaleTimeString()}] ${message}`, type });

function App() {
  // --- Main State ---
  const [code, setCode] = useState('// Welcome to QuickIDE! \n');
  const [ast, setAst] = useState(null);
  const [ir, setIr] = useState(null);
  const [qasm, setQasm] = useState('');
  const [qiskitCode, setQiskitCode] = useState('');
  const [backend, setBackend] = useState('ideal');
  const [logs, setLogs] = useState([createLog('Application started.')]);
  
  // Image URLs are stored as object URLs
  const [circuitUrl, setCircuitUrl] = useState(null);
  const [histogramUrl, setHistogramUrl] = useState(null);

  // --- Debugger State ---
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugStep, setDebugStep] = useState(-1);
  const [debugData, setDebugData] = useState(null);

  // --- Phase 2 State ---
  const [isImportQasmOpen, setIsImportQasmOpen] = useState(false);
  const [importQasmText, setImportQasmText] = useState('');

  // --- Loading State ---
  const [isParsing, setIsParsing] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTranspiling, setIsTranspiling] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isSubmittingCloud, setIsSubmittingCloud] = useState(false);

  // --- Modal States ---
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState('My Project');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudBackendName, setCloudBackendName] = useState('ibm_osaka');

  // --- Ref for File Input ---
  const fileInputRef = useRef(null);

  // --- Auth Context & Navigation ---
  const { isAuthenticated } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const matchShare = useMatch('/share/:shareId');
  const shareId = matchShare?.params?.shareId;

  useEffect(() => {
    if (shareId) {
      const loadSharedCode = async () => {
        log('Loading shared circuit...', 'info');
        try {
          const response = await api.getSharedCode(shareId);
          setCode(response.data.code);
          log('Shared circuit loaded successfully!', 'success');
        } catch (err) {
          log('Failed to load shared circuit.', 'error');
        }
      };
      loadSharedCode();
    }
  }, [shareId]);

  // --- Log Helper ---
  const log = (message, type) => {
    setLogs(prev => [...prev, createLog(message, type)]);
  };

  // --- Cleanup for Object URLs ---
  useEffect(() => {
    return () => {
      if (circuitUrl) URL.revokeObjectURL(circuitUrl);
      if (histogramUrl) URL.revokeObjectURL(histogramUrl);
    };
  }, [circuitUrl, histogramUrl]);

  // --- Reset state on logout ---
  useEffect(() => {
    if (!isAuthenticated) {
      setCode('// Please log in to start a new session. \n');
      setAst(null);
      setIr(null);
      setQasm('');
      setQiskitCode('');
      setIsDebugMode(false);
      setDebugData(null);
      setLogs([createLog('User logged out.')]);
      setCircuitUrl(null);
      setHistogramUrl(null);
      setIsImportQasmOpen(false);
      setImportQasmText('');
    }
  }, [isAuthenticated]);

  // --- Toolbar Handlers ---

  const handleParse = async () => {
    if (!isAuthenticated) return log('Please log in to use the compiler.', 'error');
    log('Parsing code to AST...');
    setIsParsing(true);
    try {
      const response = await api.parseCode(code);
      setAst(response.data.ast);
      log('AST generated successfully.', 'success');
      return response.data.ast;
    } catch (err) {
      log(`AST Error: ${err.response?.data?.error || err.message}`, 'error');
      return null;
    } finally {
      setIsParsing(false);
    }
  };

  const handleCompile = async () => {
    if (!isAuthenticated) return log('Please log in to use the compiler.', 'error');
    let currentAst = ast;
    if (!currentAst) {
      currentAst = await handleParse();
      if (!currentAst) return;
    }
    
    log('Compiling AST to IR...');
    setIsCompiling(true);
    try {
      const response = await api.compileAst(currentAst);
      setIr(response.data.ir);
      log('IR compiled successfully.', 'success');
      handleTranspile(response.data.ir);
      return response.data.ir;
    } catch (err) {
      log(`Compilation Error: ${err.response?.data?.error || err.message}`, 'error');
      return null;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleTranspile = async (currentIr) => {
    if (!currentIr) return;
    setIsTranspiling(true);
    try {
      const response = await api.transpileAst(currentIr);
      setQasm(response.data.qasm);
      setQiskitCode(response.data.qiskit);
      log('Qiskit Python code generated.', 'success');
    } catch (err) {
      log(`Transpilation Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsTranspiling(false);
    }
  };

  const handleVisualize = async () => {
    if (!isAuthenticated) return log('Please log in.', 'error');
    let currentIr = ir;
    if (!currentIr) {
      currentIr = await handleCompile();
      if (!currentIr) return;
    }
    
    log('Generating circuit visualization...');
    setIsVisualizing(true);
    if (circuitUrl) URL.revokeObjectURL(circuitUrl);
    
    try {
      const response = await api.getVisualization(currentIr);
      const imageUrl = URL.createObjectURL(response.data);
      setCircuitUrl(imageUrl);
      log('Circuit visualized.', 'success');
    } catch (err) {
      log(`Visualization Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsVisualizing(false);
    }
  };
  
  const handleSimulate = async (forcedIr = null) => {
    if (!isAuthenticated) return log('Please log in.', 'error');
    let currentIr = forcedIr || ir;
    if (!currentIr) {
      currentIr = await handleCompile();
      if (!currentIr) return;
    }
    
    log(`Running simulation on [${backend}] backend...`);
    setIsSimulating(true);
    if (histogramUrl) URL.revokeObjectURL(histogramUrl);

    try {
      const response = await api.getSimulation(currentIr, backend);
      const imageUrl = URL.createObjectURL(response.data);
      setHistogramUrl(imageUrl);
      log(`Simulation complete on ${backend}.`, 'success');
    } catch (err) {
      log(`Simulation Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCloudSubmit = async () => {
    if (!isAuthenticated) return log('Please log in.', 'error');
    let currentIr = ir;
    if (!currentIr) {
      currentIr = await handleCompile();
      if (!currentIr) return;
    }
    setIsCloudModalOpen(true);
  };

  const submitCloudJob = async () => {
    setIsCloudModalOpen(false);
    let currentIr = ir;
    if (!currentIr) {
      currentIr = await handleCompile();
      if (!currentIr) return;
    }

    log(`Submitting job to IBM Cloud [${cloudBackendName}]...`, 'info');
    setIsSubmittingCloud(true);
    try {
      const response = await api.submitCloudJob(currentIr, cloudBackendName, 'Hardware Run');
      log(`Job submitted! ID: ${response.data.jobId}`, 'success');
      navigate('/cloud'); // Smooth transition to cloud dashboard
    } catch (err) {
      log(`Cloud Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsSubmittingCloud(false);
    }
  };

  // --- Debugger Logic ---

  const toggleDebugMode = async () => {
    if (!isDebugMode) {
      let currentIr = ir;
      if (!currentIr) {
        currentIr = await handleCompile();
        if (!currentIr) return;
      }
      setIsDebugMode(true);
      setDebugStep(-1);
      fetchDebugStep(currentIr, -1);
      log('Debugger started. Inspecting initial state.', 'info');
    } else {
      setIsDebugMode(false);
      setDebugData(null);
      log('Debugger stopped.', 'info');
    }
  };

  const fetchDebugStep = async (currentIr, index) => {
    setIsDebugging(true);
    try {
      const response = await api.getDebugStep(currentIr, index);
      setDebugData(response.data);
      setCircuitUrl(response.data.circuit_img);
    } catch (err) {
      log(`Debug Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsDebugging(false);
    }
  };

  const stepForward = () => {
    if (!ir || debugStep >= ir.instructions.length - 1) return;
    const nextStep = debugStep + 1;
    setDebugStep(nextStep);
    fetchDebugStep(ir, nextStep);
  };

  const stepBackward = () => {
    if (debugStep <= -1) return;
    const prevStep = debugStep - 1;
    setDebugStep(prevStep);
    fetchDebugStep(ir, prevStep);
  };

  // --- Auto-refresh images when theme changes ---
  useEffect(() => {
    if (isAuthenticated && ir) {
      if (isDebugMode) {
        fetchDebugStep(ir, debugStep);
      } else {
        handleVisualize();
        if (histogramUrl) {
          handleSimulate();
        }
      }
    }
  }, [theme]);

  const formatQucpl = (source) => {
    const lines = source.split('\n');
    const formattedLines = [];
    let indent = 0;
    for (let line of lines) {
      let trimmed = line.trim();
      if (!trimmed) {
        formattedLines.push('');
        continue;
      }
      if (trimmed.startsWith('}') || trimmed.startsWith('else')) {
        indent = Math.max(0, indent - 1);
      }
      const indentation = '  '.repeat(indent);
      let formatted = trimmed
        .replace(/\s*->\s*/g, ' -> ')
        .replace(/\s*,\s*/g, ', ');
      if (/^(qubit|qop|measure|print|barrier|convert|reset)\b/i.test(formatted) && !formatted.endsWith(';')) {
        formatted += ';';
      }
      formattedLines.push(indentation + formatted);
      if (formatted.endsWith('{') || formatted.endsWith('then') || formatted.includes('if ')) {
        indent++;
      }
    }
    return formattedLines.join('\n');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleCompile().then((currentIr) => {
          if (currentIr) {
            handleSimulate(currentIr);
          }
        });
      }
      
      if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setCode((prevCode) => {
          const formatted = formatQucpl(prevCode);
          log('Code formatted & linted.', 'success');
          return formatted;
        });
      }
      
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      }
      
      if (e.key === 'F5') {
        e.preventDefault();
        handleSimulate();
      }
      
      if (e.key === 'F9') {
        e.preventDefault();
        toggleDebugMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [code, ir, isAuthenticated, isDebugMode, histogramUrl, backend]);

  const handleClear = () => {
    setLogs([createLog('Console cleared.')]);
  };

  const handleSave = async () => {
    if (!isAuthenticated) return log('Please log in to save.', 'error');
    setIsSaveModalOpen(true);
  };

  const submitSave = async () => {
    setIsSaveModalOpen(false);
    if (!saveProjectName.trim()) return;

    log(`Saving project: ${saveProjectName.trim()}...`);
    try {
      const response = await api.saveProject(saveProjectName.trim(), code);
      log(`Project saved with ID: ${response.data._id}`, 'success');
    } catch (err) {
      log(`Save Error: ${err.response?.data?.error || err.message}`, 'error');
    }
  };
  const handleShare = async () => {
    log('Generating share link...');
    try {
      const response = await api.shareCode(code);
      const shareUrl = `${window.location.origin}/share/${response.data.id}`;
      await navigator.clipboard.writeText(shareUrl);
      log(`Share URL generated and copied to clipboard: ${shareUrl}`, 'success');
    } catch (err) {
      log(`Share Error: ${err.response?.data?.error || err.message}`, 'error');
    }
  };
  const handleOpenFileClick = () => {
    if (!isAuthenticated) return log('Please log in to open a file.', 'error');
    fileInputRef.current.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCode(e.target.result);
      reader.readAsText(file);
      log(`Opened file: ${file.name}`, 'success');
      event.target.value = null;
    }
  };

  const handleImportQasmSubmit = async () => {
    if (!importQasmText.trim()) return;
    log('Reverse transpiling OpenQASM to QuCPL...');
    try {
      const response = await api.reverseTranspile(importQasmText);
      setCode(response.data.code);
      log('Reverse transpilation complete.', 'success');
      if (response.data.warnings && response.data.warnings.length > 0) {
        response.data.warnings.forEach(w => log(`Warning: ${w}`, 'warning'));
      }
      setIsImportQasmOpen(false);
      setImportQasmText('');
    } catch (err) {
      log(`Import QASM Error: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleOptimizeAccept = ({ ir, qasm, qiskit, code }) => {
    setIr(ir);
    setQasm(qasm);
    if (qiskit) setQiskitCode(qiskit);
    setCode(code);
    log('Optimized circuit applied successfully.', 'success');
  };

  const loadProjectAndNavigate = (projectCode) => {
    setCode(projectCode);
    log('Project loaded. Navigating to IDE...', 'success');
    navigate('/');
  };

  return (
    <div className="app-container">
      <Navbar />
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".qucpl" style={{ display: 'none' }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} /> 
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={
            <IdePage
              code={code} setCode={setCode} ast={ast} ir={ir} qasm={qasm} qiskitCode={qiskitCode} logs={logs} 
              circuitUrl={circuitUrl} histogramUrl={histogramUrl}
              isDebugMode={isDebugMode} debugStep={debugStep} debugData={debugData}
              isParsing={isParsing} isCompiling={isCompiling} isVisualizing={isVisualizing} 
              isSimulating={isSimulating} isTranspiling={isTranspiling} isDebugging={isDebugging}
              isSubmittingCloud={isSubmittingCloud}
              backend={backend} setBackend={setBackend}
              handleParse={handleParse} handleCompile={handleCompile} handleVisualize={handleVisualize} 
              handleSimulate={handleSimulate} handleCloudSubmit={handleCloudSubmit}
              handleClear={handleClear} handleSave={handleSave} handleOpenFileClick={handleOpenFileClick}
              toggleDebugMode={toggleDebugMode} stepForward={stepForward} stepBackward={stepBackward}
              onShare={handleShare}
              onImportQasm={() => setIsImportQasmOpen(true)}
              onOptimizeAccept={handleOptimizeAccept}
              log={log}
            />
          } />
          <Route path="/resources" element={<ResourcesPage loadProjectAndNavigate={loadProjectAndNavigate} log={log} />} />
          <Route path="/cloud" element={<CloudPage log={log} />} />
        </Route>
        <Route path="/share/:shareId" element={
          <IdePage
            code={code} setCode={setCode} ast={ast} ir={ir} qasm={qasm} qiskitCode={qiskitCode} logs={logs} 
            circuitUrl={circuitUrl} histogramUrl={histogramUrl}
            isDebugMode={isDebugMode} debugStep={debugStep} debugData={debugData}
            isParsing={isParsing} isCompiling={isCompiling} isVisualizing={isVisualizing} 
            isSimulating={isSimulating} isTranspiling={isTranspiling} isDebugging={isDebugging}
            isSubmittingCloud={isSubmittingCloud}
            backend={backend} setBackend={setBackend}
            handleParse={handleParse} handleCompile={handleCompile} handleVisualize={handleVisualize} 
            handleSimulate={handleSimulate} handleCloudSubmit={handleCloudSubmit}
            handleClear={handleClear} handleSave={handleSave} handleOpenFileClick={handleOpenFileClick}
            toggleDebugMode={toggleDebugMode} stepForward={stepForward} stepBackward={stepBackward}
            onShare={handleShare}
            onImportQasm={() => setIsImportQasmOpen(true)}
            onOptimizeAccept={handleOptimizeAccept}
            log={log}
            isSharedView={true}
          />
        } />
      </Routes>

      {/* Import QASM Modal */}
      {isImportQasmOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Import OpenQASM Circuit</h3>
              <button onClick={() => setIsImportQasmOpen(false)} style={styles.closeBtn}>&times;</button>
            </div>
            <p style={styles.modalDesc}>
              Paste your OpenQASM 2.0 or 3.0 code below to reverse-transpile it into QuCPL format.
            </p>
            <textarea
              value={importQasmText}
              onChange={(e) => setImportQasmText(e.target.value)}
              placeholder="// Paste OpenQASM here (e.g. qreg q[2]; creg c[2]; h q[0]; cx q[0],q[1];)"
              style={styles.modalTextarea}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setIsImportQasmOpen(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleImportQasmSubmit} style={styles.submitBtn}>
                ⚡ Transpile & Load
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save Project Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Project"
        actions={
          <>
            <button className="modal-btn-secondary" onClick={() => setIsSaveModalOpen(false)}>Cancel</button>
            <button className="modal-btn-primary" onClick={submitSave}>Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Project Name</label>
          <input 
            type="text" 
            value={saveProjectName} 
            onChange={(e) => setSaveProjectName(e.target.value)} 
            placeholder="Enter project name"
            onKeyDown={(e) => { if (e.key === 'Enter') submitSave(); }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Cloud Job Backend Modal */}
      <Modal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        title="Submit Job to IBM Cloud"
        actions={
          <>
            <button className="modal-btn-secondary" onClick={() => setIsCloudModalOpen(false)}>Cancel</button>
            <button className="modal-btn-primary" onClick={submitCloudJob}>⚡ Submit Job</button>
          </>
        }
      >
        <div className="form-group">
          <label>IBM Backend / Simulator Target</label>
          <input 
            type="text" 
            value={cloudBackendName} 
            onChange={(e) => setCloudBackendName(e.target.value)} 
            placeholder="e.g. ibm_osaka, ibm_kyoto, ibm_sherbrooke"
            onKeyDown={(e) => { if (e.key === 'Enter') submitCloudJob(); }}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(5px)'
  },
  modalContent: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#fff',
    fontWeight: '700'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: 0,
  },
  modalDesc: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.4'
  },
  modalTextarea: {
    width: '100%',
    height: '240px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '12px',
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px'
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    color: '#94a3b8',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 20px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  }
};

export default App;