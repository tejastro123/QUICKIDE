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
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; // Make sure you create this file

// Helper function to create log entries
const createLog = (message, type = 'info') => ({ message: `[${new Date().toLocaleTimeString()}] ${message}`, type });

function App() {
  // --- Main State ---
  const [code, setCode] = useState('// Welcome to QuickIDE! \n');
  const [ast, setAst] = useState(null);
  const [ir, setIr] = useState(null);
  const [logs, setLogs] = useState([createLog('Application started.')]);
  
  // Image URLs are stored as object URLs
  const [circuitUrl, setCircuitUrl] = useState(null);
  const [histogramUrl, setHistogramUrl] = useState(null);

  // --- Loading State ---
  const [isParsing, setIsParsing] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // --- Ref for File Input ---
  const fileInputRef = useRef(null);

  // --- Auth Context & Navigation ---
  // We get the auth state to reset the IDE if the user logs out
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // --- Log Helper ---
  const log = (message, type) => {
    setLogs(prev => [...prev, createLog(message, type)]);
  };

  // --- Cleanup for Object URLs ---
  useEffect(() => {
    // This is important to prevent memory leaks
    return () => {
      if (circuitUrl) URL.revokeObjectURL(circuitUrl);
      if (histogramUrl) URL.revokeObjectURL(histogramUrl);
    };
  }, [circuitUrl, histogramUrl]);

  // --- Reset state on logout ---
  useEffect(() => {
    if (!isAuthenticated) {
      // If user logs out, clear all IDE state
      setCode('// Please log in to start a new session. \n');
      setAst(null);
      setIr(null);
      setLogs([createLog('User logged out.')]);
      setCircuitUrl(null);
      setHistogramUrl(null);
    }
  }, [isAuthenticated]); // This effect runs when auth state changes

  // --- Toolbar Handlers ---
  // (These are all wrapped in a check for authentication)

  const handleParse = async () => {
    if (!isAuthenticated) return log('Please log in to use the compiler.', 'error');
    log('Parsing code to AST...');
    setIsParsing(true);
    try {
      const response = await api.parseCode(code);
      setAst(response.data.ast);
      log('AST generated successfully.', 'success');
    } catch (err) {
      log(`AST Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCompile = async () => {
    if (!isAuthenticated) return log('Please log in to use the compiler.', 'error');
    let currentAst = ast;
    if (!currentAst) {
      log('No AST found. Running parser first...');
      try {
        const response = await api.parseCode(code);
        setAst(response.data.ast);
        currentAst = response.data.ast;
        log('AST generated successfully.', 'success');
      } catch (err) {
        log(`AST Error: ${err.response?.data?.error || err.message}`, 'error');
        return;
      }
    }
    
    log('Compiling AST to IR...');
    setIsCompiling(true);
    try {
      const response = await api.compileAst(currentAst);
      setIr(response.data.ir);
      log('IR compiled successfully.', 'success');
    } catch (err) {
      log(`Compilation Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleVisualize = async () => {
    if (!isAuthenticated) return log('Please log in to use the compiler.', 'error');
    let currentIr = ir;
    if (!currentIr) {
      log('No IR found. Please compile first.', 'error');
      return;
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
    if (!isAuthenticated) return log('Please log in to use the compiler.', 'error');
    let currentIr = ir;
    if (!currentIr) {
      log('No IR found. Please compile first.', 'error');
      return;
    }
    
    log('Running simulation...');
    setIsSimulating(true);
    if (histogramUrl) URL.revokeObjectURL(histogramUrl);

    try {
      const response = await api.getSimulation(currentIr);
      const imageUrl = URL.createObjectURL(response.data);
      setHistogramUrl(imageUrl);
      log('Simulation complete.', 'success');
    } catch (err) {
      log(`Simulation Error: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClear = () => {
    if (!isAuthenticated) return log('Please log in.', 'error');
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
      if (file.name.endsWith('.qucpl')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileContent = e.target.result;
          setCode(fileContent);
          log(`Opened file: ${file.name}`, 'success');
        };
        reader.readAsText(file);
      } else {
        log('Error: Please select a .qucpl file', 'error');
      }
      event.target.value = null;
    }
  };

  // This function will be passed to ResourcesPage
  const loadProjectAndNavigate = (projectCode) => {
    setCode(projectCode);
    log('Project loaded. Navigating to IDE...', 'success');
    navigate('/'); // Navigate back to the IDE page
  };


  // --- RENDER METHOD USING ROUTES ---
  return (
    <div className="app-container">
      <Navbar />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".qucpl"
        style={{ display: 'none' }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} /> 

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <IdePage
                code={code} setCode={setCode} ast={ast} ir={ir}
                logs={logs} circuitUrl={circuitUrl} histogramUrl={histogramUrl}
                isParsing={isParsing} isCompiling={isCompiling}
                isVisualizing={isVisualizing} isSimulating={isSimulating}
                handleParse={handleParse} handleCompile={handleCompile}
                handleVisualize={handleVisualize} handleSimulate={handleSimulate}
                handleClear={handleClear} handleSave={handleSave}
                handleOpenFileClick={handleOpenFileClick}
              />
            }
          />
          <Route
            path="/resources"
            element={
              <ResourcesPage
                // Pass the new wrapper function
                loadProjectAndNavigate={loadProjectAndNavigate} 
                log={log}
              />
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;