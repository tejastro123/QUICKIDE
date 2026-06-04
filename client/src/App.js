import React, { useState, useEffect, useRef, useContext } from 'react';
import { Routes, Route, useNavigate, useMatch, useLocation } from 'react-router-dom';
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
import LandingPage from './pages/LandingPage';
import CopilotPage from './pages/CopilotPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CommandPalette from './components/CommandPalette';

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
  const [debugSessionId, setDebugSessionId] = useState(null);
  const eventSourceRef = useRef(null);

  // --- Phase 2 State ---
  const [isImportQiskitOpen, setIsImportQiskitOpen] = useState(false);
  const [importQiskitText, setImportQiskitText] = useState('');

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
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [quotaExceededDetails, setQuotaExceededDetails] = useState(null);

  // --- Ref for File Input ---
  const fileInputRef = useRef(null);

  // --- Auth Context & Navigation ---
  const { isAuthenticated, fetchQuota } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const matchShare = useMatch('/share/:shareId');
  const shareId = matchShare?.params?.shareId;

  // Allow landing page to scroll
  useEffect(() => {
    const isLanding = location.pathname === '/' && !isAuthenticated;
    document.body.classList.toggle('landing-open', isLanding);
    return () => document.body.classList.remove('landing-open');
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    const handleQuotaExceeded = (e) => {
      setQuotaExceededDetails(e.detail);
      setIsUpgradeModalOpen(true);
    };
    window.addEventListener('quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('quota-exceeded', handleQuotaExceeded);
    };
  }, []);

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
      setIsImportQiskitOpen(false);
      setImportQiskitText('');
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
      fetchQuota?.();
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
    // If forcedIr is a React event object, ignore it
    const cleanIr = (forcedIr && typeof forcedIr.preventDefault === 'function') ? null : forcedIr;
    let currentIr = cleanIr || ir;
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
      fetchQuota?.();
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

  useEffect(() => {
    if (!debugSessionId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const es = new EventSource(`http://localhost:5000/api/debug/stream?sessionId=${debugSessionId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'connected') {
          console.log('[SSE] Debugger SSE connected:', data);
        } else {
          setDebugData(data);
          if (data.circuit_img) {
            setCircuitUrl(data.circuit_img);
          }
        }
      } catch (err) {
        console.error('Error parsing debugger SSE data:', err);
      }
    };

    es.onerror = (err) => {
      console.error('[SSE Error] Debugger EventSource error:', err);
    };

    return () => {
      es.close();
    };
  }, [debugSessionId]);

  const toggleDebugMode = async () => {
    if (!isDebugMode) {
      let currentIr = ir;
      if (!currentIr) {
        currentIr = await handleCompile();
        if (!currentIr) return;
      }
      
      const newSessionId = Math.random().toString(36).substring(2, 11);
      setDebugSessionId(newSessionId);
      
      setIsDebugMode(true);
      setDebugStep(-1);
      fetchDebugStep(currentIr, -1, newSessionId);
      log('Debugger started. Inspecting initial state.', 'info');
    } else {
      setIsDebugMode(false);
      setDebugSessionId(null);
      setDebugData(null);
      log('Debugger stopped.', 'info');
    }
  };

  const fetchDebugStep = async (currentIr, index, sessionId = debugSessionId) => {
    setIsDebugging(true);
    try {
      const response = await api.getDebugStep(currentIr, index, sessionId);
      if (!sessionId) {
        setDebugData(response.data);
        setCircuitUrl(response.data.circuit_img);
      }
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

  const handleImportQiskitSubmit = async () => {
    if (!importQiskitText.trim()) return;
    log('Reverse transpiling Qiskit to QuCPL...');
    try {
      const response = await api.reverseTranspile(importQiskitText);
      setCode(response.data.code);
      log('Reverse transpilation complete.', 'success');
      if (response.data.warnings && response.data.warnings.length > 0) {
        response.data.warnings.forEach(w => log(`Warning: ${w}`, 'warning'));
      }
      setIsImportQiskitOpen(false);
      setImportQiskitText('');
    } catch (err) {
      log(`Import Qiskit Error: ${err.response?.data?.error || err.message}`, 'error');
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
    navigate('/ide');
  };

  return (
    <div className="app-container">
      <Navbar />
      <CommandPalette />
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".qucpl" style={{ display: 'none' }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Public landing page for guests */}
        {!isAuthenticated && <Route path="/" element={<LandingPage />} />}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage onLoadProject={loadProjectAndNavigate} />} />
          <Route path="/ide" element={
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
              onImportQiskit={() => setIsImportQiskitOpen(true)}
              onOptimizeAccept={handleOptimizeAccept}
              log={log}
            />
          } />
          <Route path="/resources" element={<ResourcesPage setCode={loadProjectAndNavigate} log={log} />} />
          <Route path="/cloud" element={<CloudPage log={log} />} />
          <Route path="/copilot" element={<CopilotPage code={code} />} />
          <Route path="/dashboard" element={<DashboardPage onLoadProject={loadProjectAndNavigate} />} />
          <Route path="/profile" element={<ProfilePage onLoadProject={loadProjectAndNavigate} />} />
          <Route path="/settings" element={<ProfilePage onLoadProject={loadProjectAndNavigate} defaultTab="settings" />} />
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
            onImportQiskit={() => setIsImportQiskitOpen(true)}
            onOptimizeAccept={handleOptimizeAccept}
            log={log}
            isSharedView={true}
          />
        } />
      </Routes>

      {/* Import Qiskit Modal */}
      <Modal
        isOpen={isImportQiskitOpen}
        onClose={() => setIsImportQiskitOpen(false)}
        title="Import Qiskit Circuit"
        actions={
          <>
            <button className="modal-btn-secondary" onClick={() => setIsImportQiskitOpen(false)}>Cancel</button>
            <button className="modal-btn-primary" onClick={handleImportQiskitSubmit}>⚡ Transpile & Load</button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
          Paste your Qiskit Python code below to reverse-transpile it into QuCPL format.
        </p>
        <textarea
          value={importQiskitText}
          onChange={e => setImportQiskitText(e.target.value)}
          placeholder="# Paste Qiskit Python code here (e.g. circuit.h(q[0]))"
          style={{
            width: '100%', height: '220px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            color: 'var(--quantum-cyan)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.83rem',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </Modal>
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

      {/* Upgrade Quota Plan Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade Your Plan 🚀"
        actions={
          <>
            <button className="modal-btn-secondary" onClick={() => setIsUpgradeModalOpen(false)}>Maybe Later</button>
            <button className="modal-btn-primary" onClick={() => {
              log('Redirecting to upgrade subscription...', 'info');
              setIsUpgradeModalOpen(false);
            }}>Upgrade to Pro</button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
          {quotaExceededDetails?.error || "You've reached your daily quota limit."}
        </p>
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontSize: '0.82rem',
          color: 'var(--text-primary)',
          lineHeight: '1.6'
        }}>
          <strong>Pro Tier Features:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>Up to 25 Qubits support</li>
            <li>100 Simulations per day</li>
            <li>Unlimited Compilations</li>
            <li>Priority Simulation Queue</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

// Styles moved to App.css design system

export default App;