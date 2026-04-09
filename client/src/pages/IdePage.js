import React from 'react';
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

function IdePage({
  code, setCode, ast, ir, qasm, logs, circuitUrl, histogramUrl,
  isDebugMode, debugStep, debugData,
  isParsing, isCompiling, isVisualizing, isSimulating, isTranspiling, isDebugging,
  isSubmittingCloud,
  backend, setBackend,
  handleParse, handleCompile, handleVisualize, handleSimulate,
  handleClear, handleSave, handleOpenFileClick,
  toggleDebugMode, stepForward, stepBackward,
  handleCloudSubmit
}) {
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
            <Allotment vertical defaultSizes={[1, 1, 1]}>
              <div className="panel-container">
                <div className="panel-header">{isDebugMode ? "Quantum Statevector" : "AST / IR Viewer"}</div>
                {isDebugMode ? (
                  <DebuggerPanel 
                    debugData={debugData} 
                    stepIndex={debugStep} 
                    totalSteps={ir ? ir.instructions.length : 0} 
                  />
                ) : (
                  <AstIrViewer ast={ast} ir={ir} />
                )}
              </div>
              <div className="panel-container">
                <div className="panel-header">OpenQASM 3.0 Transpiler</div>
                <QasmViewer qasm={qasm} placeholder={isTranspiling ? "Transpiling..." : null} />
              </div>
              <div className="panel-container">
                <div className="panel-header">Simulation Histogram</div>
                <ImageViewer
                  title="Simulation Histogram"
                  imageUrl={histogramUrl}
                  placeholder={isSimulating ? "Simulating..." : "Run 'Simulate' to see results."}
                />
              </div>
            </Allotment>
          </Allotment.Pane>

        </Allotment>
      </main>
    </div>
  );
}

export default IdePage;