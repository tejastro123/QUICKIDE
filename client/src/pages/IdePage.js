import React, { useState } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import '../App.css'; // Use the main App.css

// Import all your components
import Toolbar from '../components/Toolbar';
import CodeEditor from '../components/CodeEditor';
import AstIrViewer from '../components/AstIrViewer';
import ImageViewer from '../components/ImageViewer';
import Console from '../components/Console';
import QasmViewer from '../components/QasmViewer';
import DebuggerPanel from '../components/DebuggerPanel';

// Phase 2 Components
import AlgorithmLibrary from '../components/AlgorithmLibrary';
import OptimizerSuggestions from '../components/OptimizerSuggestions';
import MultiCircuitComparison from '../components/MultiCircuitComparison';

function IdePage({
  code, setCode, ast, ir, qasm, qiskitCode, logs, circuitUrl, histogramUrl,
  isDebugMode, debugStep, debugData,
  isParsing, isCompiling, isVisualizing, isSimulating, isTranspiling, isDebugging,
  isSubmittingCloud,
  backend, setBackend,
  handleParse, handleCompile, handleVisualize, handleSimulate,
  handleClear, handleSave, handleOpenFileClick,
  toggleDebugMode, stepForward, stepBackward,
  handleCloudSubmit,
  
  // Phase 2 props
  onImportQasm,
  onOptimizeAccept,
  onShare,
  log
}) {
  const [topTab, setTopTab] = useState('ast_ir'); // 'ast_ir', 'optimizer', 'algorithms'
  const [bottomTab, setBottomTab] = useState('histogram'); // 'histogram', 'comparison'

  return (
    <div className="ide-container">
      <Toolbar
        onParse={handleParse}
        onCompile={handleCompile}
        onVisualize={handleVisualize}
        onSimulate={handleSimulate}
        onClear={handleClear}
        onSave={handleSave}
        onOpenFile={handleOpenFileClick}
        onImportQasm={onImportQasm}
        onShare={onShare}
        backend={backend}
        setBackend={setBackend}
        isDebugMode={isDebugMode}
        toggleDebugMode={toggleDebugMode}
        onStepForward={stepForward}
        onStepBackward={stepBackward}
        onCloudSubmit={handleCloudSubmit}
      />
      <main className="main-content">
        <Allotment defaultSizes={[3, 2]}>

          {/* === LEFT PANE === */}
          <Allotment.Pane>
            <Allotment vertical defaultSizes={[100, 80, 60]}>
              <div className="panel-container">
                <div className="panel-header">QuCPL Code Editor</div>
                <CodeEditor code={code} setCode={setCode} />
              </div>
              <div className="panel-container">
                <div className="panel-header">{isDebugMode ? "Debug View (Current State)" : "Circuit Visualization"}</div>
                <ImageViewer
                  title="Quantum Circuit"
                  imageUrl={circuitUrl}
                  placeholder={
                    isDebugging ? "Updating..." : 
                    isVisualizing ? "Visualizing..." : 
                    "Run 'Visualize' or start 'Debug' to see circuit."
                  }
                />
              </div>
              <div className="panel-container">
                <div className="panel-header">Terminal Console</div>
                <Console logs={logs} />
              </div>
            </Allotment>
          </Allotment.Pane>

          {/* === RIGHT PANE === */}
          <Allotment.Pane>
            <Allotment vertical defaultSizes={[1.2, 0.8, 1.2]}>
              {/* Top Tabbed Panel */}
              <div className="panel-container">
                {isDebugMode ? (
                  <>
                    <div className="panel-header">Quantum Statevector</div>
                    <DebuggerPanel 
                      debugData={debugData} 
                      stepIndex={debugStep} 
                      totalSteps={ir ? ir.instructions.length : 0} 
                    />
                  </>
                ) : (
                  <>
                    <div className="panel-header" style={styles.tabHeader}>
                      <button 
                        onClick={() => setTopTab('ast_ir')}
                        style={{...styles.tabBtn, ...(topTab === 'ast_ir' ? styles.activeTab : {})}}
                      >
                        AST / IR Viewer
                      </button>
                      <button 
                        onClick={() => setTopTab('optimizer')}
                        style={{...styles.tabBtn, ...(topTab === 'optimizer' ? styles.activeTab : {})}}
                      >
                        Circuit Optimizer
                      </button>
                      <button 
                        onClick={() => setTopTab('algorithms')}
                        style={{...styles.tabBtn, ...(topTab === 'algorithms' ? styles.activeTab : {})}}
                      >
                        Algorithm Library
                      </button>
                    </div>
                    {topTab === 'ast_ir' && <AstIrViewer ast={ast} ir={ir} />}
                    {topTab === 'optimizer' && (
                      <OptimizerSuggestions 
                        ir={ir} 
                        onOptimizeAccept={onOptimizeAccept}
                        log={log}
                      />
                    )}
                    {topTab === 'algorithms' && (
                      <AlgorithmLibrary 
                        onLoadCode={setCode}
                        log={log}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Middle Panel - Qiskit Python Transpiler */}
              <div className="panel-container">
                <div className="panel-header">Qiskit Python Transpiler</div>
                <QasmViewer qasm={qiskitCode} placeholder={isTranspiling ? "Transpiling to Qiskit..." : null} />
              </div>

              {/* Bottom Tabbed Panel */}
              <div className="panel-container">
                <div className="panel-header" style={styles.tabHeader}>
                  <button 
                    onClick={() => setBottomTab('histogram')}
                    style={{...styles.tabBtn, ...(bottomTab === 'histogram' ? styles.activeTab : {})}}
                  >
                    Simulation Histogram
                  </button>
                  <button 
                    onClick={() => setBottomTab('comparison')}
                    style={{...styles.tabBtn, ...(bottomTab === 'comparison' ? styles.activeTab : {})}}
                  >
                    Multi-Circuit Comparison
                  </button>
                </div>
                {bottomTab === 'histogram' && (
                  <ImageViewer
                    title="Simulation Histogram"
                    imageUrl={histogramUrl}
                    placeholder={isSimulating ? "Simulating..." : "Run 'Simulate' to see results."}
                  />
                )}
                {bottomTab === 'comparison' && (
                  <MultiCircuitComparison
                    codeA={code}
                    irA={ir}
                    histogramUrlA={histogramUrl}
                    backend={backend}
                    log={log}
                  />
                )}
              </div>
            </Allotment>
          </Allotment.Pane>

        </Allotment>
      </main>
    </div>
  );
}

const styles = {
  tabHeader: {
    display: 'flex',
    gap: '8px',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid var(--border-color)',
    alignItems: 'center',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--primary-color)',
  }
};

export default IdePage;