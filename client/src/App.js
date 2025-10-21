import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import services and components
import * as api from './services/api';
import Navbar from './components/Navbar';
import IdePage from './pages/IdePage';
import ResourcesPage from './pages/ResourcesPage';

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

  // --- Toolbar Handlers ---
  const handleParse = async () => {
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
    let currentAst = ast;
    if (!currentAst) {
      log('No AST found. Running parser first...');
      try {
        const response = await api.parseCode(code);
        setAst(response.data.ast);
        currentAst = response.data.ast; // Use the new AST
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
    let currentIr = ir;
    if (!currentIr) {
      log('No IR found. Please compile first.', 'error');
      return;
    }
    
    log('Generating circuit visualization...');
    setIsVisualizing(true);
    if (circuitUrl) URL.revokeObjectURL(circuitUrl); // Clean up old one
    
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
    let currentIr = ir;
    if (!currentIr) {
      log('No IR found. Please compile first.', 'error');
      return;
    }
    
    log('Running simulation...');
    setIsSimulating(true);
    if (histogramUrl) URL.revokeObjectURL(histogramUrl); // Clean up old one

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
    setLogs([createLog('Console cleared.')]);
  };

  const handleSave = async () => {
    const projectName = prompt('Enter project name:', 'My Project');
    if (!projectName) return; // User cancelled

    log(`Saving project: ${projectName}...`);
    try {
      const response = await api.saveProject(projectName, code);
      log(`Project saved with ID: ${response.data._id}`, 'success');
    } catch (err) {
      log(`Save Error: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleOpenFileClick = () => {
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

  // --- NEW RENDER METHOD USING ROUTES ---
  return (
    <div className="app-container">
      {/* 1. Global Navbar is always visible */}
      <Navbar />

      {/* 2. Hidden file input (needed by IdePage) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".qucpl"
        style={{ display: 'none' }}
      />
      
      {/* 3. Routes define the pages */}
      <Routes>
        <Route
          path="/"
          element={
            <IdePage
              // Pass all state and handlers to the IDE page
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
              // Pass only the functions needed by the Resources page
              setCode={setCode}
              log={log}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;