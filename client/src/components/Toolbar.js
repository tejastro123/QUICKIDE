import React from 'react';
import './Toolbar.css';
import { useWorkspaceStore } from '../store/workspaceStore';
import {
  FolderOpen, Save, Share2, Download,
  GitBranch, Cpu, Eye, Play,
  ChevronLeft, ChevronRight,
  Server, Rocket, Bug,
  Trash2, Columns
} from 'lucide-react';

function Toolbar({
  onParse, onCompile, onVisualize, onSimulate,
  onClear, onSave, onOpenFile, onImportQiskit, onShare,
  backend, setBackend,
  isDebugMode, toggleDebugMode, onStepForward, onStepBackward,
  onCloudSubmit,
  isParsing, isCompiling, isVisualizing, isSimulating,
  isTranspiling, isDebugging, isSubmittingCloud,
}) {
  const Spinner = () => <span className="btn-spinner" />;
  const fileExplorerOpen = useWorkspaceStore(s => s.fileExplorerOpen);
  const toggleFileExplorer = useWorkspaceStore.getState().toggleFileExplorer;

  return (
    <div className="toolbar">

      {/* --- Group 1: File Operations --- */}
      <div className="toolbar-group">
        <button onClick={toggleFileExplorer} title="Toggle Workspace Sidebar (Ctrl+B)">
          <Columns size={14} style={{ color: fileExplorerOpen ? 'var(--quantum-cyan)' : 'inherit' }} />
          {fileExplorerOpen ? 'Hide Workspace' : 'Show Workspace'}
        </button>
        <button onClick={onOpenFile} title="Open file (Ctrl+O)">
          <FolderOpen size={14} />
          Open
        </button>
        <button onClick={onSave} className="btn-success" title="Save project (Ctrl+S)">
          <Save size={14} />
          Save
        </button>
        <button
          onClick={onShare}
          title="Generate shareable link"
          style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}
        >
          <Share2 size={14} />
          Share
        </button>
        <button
          onClick={onImportQiskit}
          className="btn-success"
          title="Import Qiskit Python script"
          style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: 'var(--quantum-green)' }}
        >
          <Download size={14} />
          Import Qiskit
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* --- Group 2: Compile Pipeline --- */}
      <div className="toolbar-group">
        {!isDebugMode ? (
          <>
            <button
              onClick={onParse}
              className="btn-primary"
              disabled={isParsing}
              title="Parse code to AST"
            >
              {isParsing ? <Spinner /> : <GitBranch size={14} />}
              {isParsing ? 'Parsing…' : 'Parse AST'}
            </button>
            <button
              onClick={onCompile}
              className="btn-primary"
              disabled={isCompiling}
              title="Compile AST to IR"
            >
              {isCompiling ? <Spinner /> : <Cpu size={14} />}
              {isCompiling ? 'Compiling…' : 'Compile IR'}
            </button>
            <button
              onClick={onVisualize}
              className="btn-accent"
              disabled={isVisualizing}
              title="Visualize circuit"
            >
              {isVisualizing ? <Spinner /> : <Eye size={14} />}
              {isVisualizing ? 'Visualizing…' : 'Visualize'}
            </button>
          </>
        ) : (
          <>
            <button onClick={onStepBackward} className="btn-primary" title="Step backward">
              <ChevronLeft size={14} />
              Step Back
            </button>
            <button onClick={onStepForward} className="btn-primary" title="Step forward">
              Step Forward
              <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* --- Group 3: Simulation & Cloud --- */}
      <div className="toolbar-group">
        {!isDebugMode && (
          <>
            <select
              value={backend}
              onChange={e => setBackend(e.target.value)}
              className="backend-select"
              title="Select simulation backend"
            >
              <option value="ideal">Ideal Simulator</option>
              <option value="fake_manila">Manila (Noisy)</option>
              <option value="fake_nairobi">Nairobi (Noisy)</option>
            </select>

            <button
              onClick={onSimulate}
              className="btn-primary"
              disabled={isSimulating}
              title="Run simulation (F5)"
            >
              {isSimulating ? <Spinner /> : <Play size={14} />}
              {isSimulating ? 'Simulating…' : 'Simulate'}
              {!isSimulating && <span className="btn-shortcut">F5</span>}
            </button>

            <button
              onClick={onCloudSubmit}
              className="btn-cloud"
              disabled={isSubmittingCloud}
              title="Submit to IBM Quantum hardware"
            >
              {isSubmittingCloud ? <Spinner /> : <Rocket size={14} />}
              {isSubmittingCloud ? 'Submitting…' : 'Run on HW'}
            </button>
          </>
        )}

        <button
          onClick={toggleDebugMode}
          className={`btn-debug${isDebugMode ? ' active' : ''}`}
          title="Toggle debug mode (F9)"
        >
          <Bug size={14} />
          {isDebugMode ? 'Stop Debug' : 'Debug'}
          {!isDebugMode && <span className="btn-shortcut">F9</span>}
        </button>
      </div>

      {/* --- Group 4: Utilities (right-aligned) --- */}
      <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
        <button onClick={onClear} className="btn-danger" title="Clear console logs">
          <Trash2 size={13} />
          Clear Logs
        </button>
      </div>

    </div>
  );
}

export default Toolbar;