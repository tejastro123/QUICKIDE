import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useUiStore } from '../store/uiStore';
import { Folder, FileCode, Plus, Trash2, Edit3, Circle, Command, Cpu } from 'lucide-react';
import './FileExplorer.css';

export default function FileExplorer() {
  const files = useWorkspaceStore(s => s.files);
  const activeFile = useWorkspaceStore(s => s.activeFile);
  
  const setActiveFile = useWorkspaceStore.getState().setActiveFile;
  const createFile = useWorkspaceStore.getState().createFile;
  const renameFile = useWorkspaceStore.getState().renameFile;
  const deleteFile = useWorkspaceStore.getState().deleteFile;
  const addNotification = useUiStore.getState().addNotification;

  const [editingPath, setEditingPath] = useState(null);
  const [editingVal, setEditingVal] = useState('');

  const handleCreateFile = () => {
    const name = prompt('Enter filename (e.g. circuit.qucpl):');
    if (!name) return;
    const success = createFile(name, '// Quantum program\nqubit q0;\n');
    if (success) {
      addNotification(`Created ${name}`, 'success');
    } else {
      addNotification('File already exists!', 'error');
    }
  };

  const handleDeleteFile = (e, path) => {
    e.stopPropagation();
    if (Object.keys(files).length <= 1) {
      addNotification('Cannot delete the last remaining file in workspace.', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${path}?`)) {
      deleteFile(path);
      addNotification(`Deleted ${path}`, 'success');
    }
  };

  const handleStartRename = (e, path) => {
    e.stopPropagation();
    setEditingPath(path);
    setEditingVal(path);
  };

  const handleSaveRename = (oldPath) => {
    if (!editingVal.trim() || editingVal === oldPath) {
      setEditingPath(null);
      return;
    }
    const success = renameFile(oldPath, editingVal);
    if (success) {
      addNotification('File renamed successfully', 'success');
    } else {
      addNotification('Name already taken!', 'error');
    }
    setEditingPath(null);
  };

  return (
    <div className="file-explorer-container">
      <div className="file-explorer-header">
        <span className="file-explorer-title">
          <Folder size={14} className="folder-icon" />
          Workspace
        </span>
        <button className="create-file-btn" onClick={handleCreateFile} title="New File">
          <Plus size={14} />
        </button>
      </div>

      <div className="file-list">
        {Object.entries(files).map(([path, info]) => {
          const isActive = path === activeFile;
          const isDirty = info.isDirty;

          return (
            <div
              key={path}
              className={`file-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveFile(path)}
            >
              <FileCode size={14} className="file-icon" />
              
              {editingPath === path ? (
                <input
                  type="text"
                  className="file-rename-input"
                  value={editingVal}
                  autoFocus
                  onChange={e => setEditingVal(e.target.value)}
                  onBlur={() => handleSaveRename(path)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveRename(path);
                    if (e.key === 'Escape') setEditingPath(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="file-name-text">
                  {path}
                  {isDirty && <span className="dirty-dot" title="Unsaved changes">•</span>}
                </span>
              )}

              {editingPath !== path && (
                <div className="file-actions">
                  <button onClick={(e) => handleStartRename(e, path)} title="Rename">
                    <Edit3 size={12} />
                  </button>
                  <button onClick={(e) => handleDeleteFile(e, path)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="file-explorer-help">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.6 }}>
          <Command size={11} /> <span>+ Shift + P</span>
        </div>
        <span>Command Palette</span>
      </div>
    </div>
  );
}
