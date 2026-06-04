import React, { useState, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import '../App.css';
import { useWorkspaceStore } from '../store/workspaceStore';
import FileExplorer from '../components/FileExplorer';

import Toolbar from '../components/Toolbar';
import CodeEditor from '../components/CodeEditor';
import AstIrViewer from '../components/AstIrViewer';
import ImageViewer from '../components/ImageViewer';
import Console from '../components/Console';
import QiskitViewer from '../components/QiskitViewer';
import DebuggerPanel from '../components/DebuggerPanel';
import AlgorithmLibrary from '../components/AlgorithmLibrary';
import OptimizerSuggestions from '../components/OptimizerSuggestions';
import MultiCircuitComparison from '../components/MultiCircuitComparison';

import {
  Code2, Cpu, TerminalSquare,
  FlaskConical, BarChart3, GitCompare,
  GitBranch, Zap
} from 'lucide-react';

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
  onImportQiskit, onOptimizeAccept, onShare,
  log
}) {
  const [topTab, setTopTab]       = useState('ast_ir');
  const [bottomTab, setBottomTab] = useState('histogram');

  const activeFile = useWorkspaceStore(s => s.activeFile);
  const activeFileObj = useWorkspaceStore(s => s.files[activeFile]);
  const fileExplorerOpen = useWorkspaceStore(s => s.fileExplorerOpen);

  useEffect(() => {
    if (activeFileObj) {
      setCode(activeFileObj.content);
    }
  }, [activeFile, setCode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        useWorkspaceStore.getState().toggleFileExplorer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (activeFile) {
      useWorkspaceStore.getState().updateFileContent(activeFile, newCode);
    }
  };

  const TabBtn = ({ id, active, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      className={`panel-tab-btn${active ? ' active' : ''}`}
    >
      {Icon && <Icon size={12} />}
      {label}
    </button>
  );

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
        onImportQiskit={onImportQiskit}
        onShare={onShare}
        backend={backend}
        setBackend={setBackend}
        isDebugMode={isDebugMode}
        toggleDebugMode={toggleDebugMode}
        onStepForward={stepForward}
        onStepBackward={stepBackward}
        onCloudSubmit={handleCloudSubmit}
        isParsing={isParsing}
        isCompiling={isCompiling}
        isVisualizing={isVisualizing}
        isSimulating={isSimulating}
        isTranspiling={isTranspiling}
        isDebugging={isDebugging}
        isSubmittingCloud={isSubmittingCloud}
      />

      <main className="main-content">
        <Allotment defaultSizes={fileExplorerOpen ? [18, 44, 38] : [55, 45]}>

          {fileExplorerOpen && (
            <Allotment.Pane preferredSize="240px" minSize={180} maxSize={350}>
              <FileExplorer />
            </Allotment.Pane>
          )}

          {/* ===================== LEFT PANE ===================== */}
          <Allotment.Pane>
            <Allotment vertical defaultSizes={[55, 28, 17]}>

              {/* Code Editor */}
              <div className="panel-container">
                <div className="panel-header">
                  <Code2 size={13} className="panel-header-icon" />
                  QuCPL Code Editor ({activeFile})
                  {isParsing && <span style={styles.activityDot} />}
                </div>
                <CodeEditor code={code} setCode={handleCodeChange} />
              </div>

              {/* Circuit Visualization */}
              <div className="panel-container">
                <div className="panel-header">
                  <Cpu size={13} className="panel-header-icon" />
                  {isDebugMode ? 'Debug View — Current State' : 'Circuit Visualization'}
                  {(isVisualizing || isDebugging) && <span style={styles.activityDot} />}
                </div>
                <ImageViewer
                  title="Quantum Circuit"
                  imageUrl={circuitUrl}
                  placeholder={
                    isDebugging   ? 'Updating circuit…' :
                    isVisualizing ? 'Visualizing…'       :
                    "Run 'Visualize' or start Debug to see circuit."
                  }
                />
              </div>

              {/* Terminal Console */}
              <div className="panel-container">
                <div className="panel-header">
                  <TerminalSquare size={13} className="panel-header-icon" />
                  Terminal Console
                </div>
                <Console logs={logs} />
              </div>

            </Allotment>
          </Allotment.Pane>

          {/* ===================== RIGHT PANE ===================== */}
          <Allotment.Pane>
            <Allotment vertical defaultSizes={[38, 28, 34]}>

              {/* Top panel — AST/IR | Optimizer | Algorithm Library | Debugger */}
              <div className="panel-container">
                {isDebugMode ? (
                  <>
                    <div className="panel-header">
                      <FlaskConical size={13} className="panel-header-icon" />
                      Quantum Statevector
                      {isDebugging && <span style={styles.activityDot} />}
                    </div>
                    <DebuggerPanel
                      debugData={debugData}
                      stepIndex={debugStep}
                      totalSteps={ir ? ir.instructions.length : 0}
                    />
                  </>
                ) : (
                  <>
                    <div className="panel-tabs">
                      <TabBtn id="ast_ir"    active={topTab==='ast_ir'}    onClick={()=>setTopTab('ast_ir')}    icon={GitBranch}  label="AST / IR" />
                      <TabBtn id="optimizer" active={topTab==='optimizer'} onClick={()=>setTopTab('optimizer')} icon={Zap}        label="Optimizer" />
                      <TabBtn id="algorithms"active={topTab==='algorithms'}onClick={()=>setTopTab('algorithms')}icon={FlaskConical}label="Algorithms" />
                    </div>
                    {topTab === 'ast_ir'     && <AstIrViewer ast={ast} ir={ir} />}
                    {topTab === 'optimizer'  && <OptimizerSuggestions ir={ir} onOptimizeAccept={onOptimizeAccept} log={log} />}
                    {topTab === 'algorithms' && <AlgorithmLibrary onLoadCode={setCode} log={log} />}
                  </>
                )}
              </div>

              {/* Middle panel — Qiskit Transpiler */}
              <div className="panel-container">
                <div className="panel-header">
                  <Code2 size={13} className="panel-header-icon" />
                  Qiskit Python Transpiler
                  {isTranspiling && <span style={styles.activityDot} />}
                </div>
                <QiskitViewer
                  qiskitCode={qiskitCode}
                  placeholder={isTranspiling ? 'Transpiling to Qiskit…' : null}
                />
              </div>

              {/* Bottom panel — Histogram | Multi-Circuit Comparison */}
              <div className="panel-container">
                <div className="panel-tabs">
                  <TabBtn id="histogram"  active={bottomTab==='histogram'}  onClick={()=>setBottomTab('histogram')}  icon={BarChart3}  label="Histogram" />
                  <TabBtn id="comparison" active={bottomTab==='comparison'} onClick={()=>setBottomTab('comparison')} icon={GitCompare} label="Compare Circuits" />
                </div>
                {bottomTab === 'histogram' && (
                  <ImageViewer
                    title="Simulation Histogram"
                    imageUrl={histogramUrl}
                    placeholder={isSimulating ? 'Simulating…' : "Run 'Simulate' to see results."}
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
  activityDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--quantum-green)',
    boxShadow: '0 0 6px var(--quantum-green)',
    animation: 'pulseGlow 1.5s ease-in-out infinite',
    marginLeft: '6px',
    flexShrink: 0,
  }
};

export default IdePage;