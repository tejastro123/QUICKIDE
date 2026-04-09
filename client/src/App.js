import React, { useState, useEffect, useRef, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';

// Import services and components
import * as api from './services/api';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
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
  const [backend, setBackend] = useState('ideal');
  const [logs, setLogs] = useState([createLog('Application started.')]);
  
  // Image URLs are stored as object URLs
  const [circuitUrl, setCircuitUrl] = useState(null);
  const [histogramUrl, setHistogramUrl] = useState(null);

  // --- Debugger State ---
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugStep, setDebugStep] = useState(-1);
  const [debugData, setDebugData] = useState(null);

  // --- Loading State ---
  const [isParsing, setIsParsing] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTranspiling, setIsTranspiling] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isSubmittingCloud, setIsSubmittingCloud] = useState(false);

  // --- Ref for File Input ---
  const fileInputRef = useRef(null);

  // --- Auth Context & Navigation ---
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

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
      setIsDebugMode(false);
      setDebugData(null);
      setLogs([createLog('User logged out.')]);
      setCircuitUrl(null);
      setHistogramUrl(null);
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
      log('OpenQASM 3.0 generated.', 'success');
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
  
  const handleSimulate = async () => {
    if (!isAuthenticated) return log('Please log in.', 'error');
    let currentIr = ir;
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

    const hwBackend = prompt('Enter IBM Backend (e.g., ibm_osaka, ibm_kyoto):', 'ibm_osaka');
    if (!hwBackend) return;

    log(`Submitting job to IBM Cloud [${hwBackend}]...`, 'info');
    setIsSubmittingCloud(true);
    try {
      const response = await api.submitCloudJob(currentIr, hwBackend, 'Hardware Run');
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

  const handleClear = () => {
    setLogs([createLog('Console cleared.')]);
  };

  const handleSave = async () => {
    if (!isAuthenticated) return log('Please log in to save.', 'error');
    const projectName = prompt('Enter project name:', 'My Project');
    if (!projectName) return;

    log(`Saving project: ${projectName}...`);
    try {
      const response = await api.saveProject(projectName, code);
      log(`Project saved with ID: ${response.data._id}`, 'success');
    } catch (err) {
      log(`Save Error: ${err.response?.data?.error || err.message}`, 'error');
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
              code={code} setCode={setCode} ast={ast} ir={ir} qasm={qasm} logs={logs} 
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
            />
          } />
          <Route path="/resources" element={<ResourcesPage loadProjectAndNavigate={loadProjectAndNavigate} log={log} />} />
          <Route path="/cloud" element={<CloudPage log={log} />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;