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

// This component receives ALL state and handlers from App.js as props
function IdePage({
  code, setCode, ast, ir, logs, circuitUrl, histogramUrl,
  isParsing, isCompiling, isVisualizing, isSimulating,
  handleParse, handleCompile, handleVisualize, handleSimulate,
  handleClear, handleSave, handleOpenFileClick
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
                <div className="panel-header">Circuit Visualization</div>
                <ImageViewer
                  title="Quantum Circuit"
                  imageUrl={circuitUrl}
                  placeholder={isVisualizing ? "Visualizing..." : "Run 'Visualize' to see circuit."}
                />
              </div>
              <div className="panel-container">
                <div className="panel-header">Console Output</div>
                <Console logs={logs} />
              </div>
            </Allotment>
          </Allotment.Pane>

          {/* === RIGHT PANE === */}
          <Allotment.Pane>
            <Allotment vertical defaultSizes={[100, 80]}>
              <div className="panel-container">
                <div className="panel-header">AST / IR Viewer</div>
                <AstIrViewer ast={ast} ir={ir} />
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