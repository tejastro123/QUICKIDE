import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useDebuggerStore } from '../store/debuggerStore';
import { useNavigate } from 'react-router-dom';
import { Command, Search, Sparkles, Terminal, Code2, Cpu, Settings, FolderOpen, Play, HelpCircle } from 'lucide-react';
import './CommandPalette.css';

export default function CommandPalette() {
  const isOpen = useUiStore(s => s.commandPaletteOpen);
  const setOpen = useUiStore.getState().setCommandPaletteOpen;
  const addNotification = useUiStore.getState().addNotification;

  const files = useWorkspaceStore(s => s.files);
  const setActiveFile = useWorkspaceStore.getState().setActiveFile;
  const isDebug = useDebuggerStore(s => s.isDebugMode);
  const setDebugMode = useDebuggerStore.getState().setDebugMode;

  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Command database
  const getCommands = () => {
    const list = [
      { id: 'run.sim', label: 'Run Quantum Simulation', category: 'Execution', icon: Play, action: () => { addNotification('Triggering simulation...', 'info'); } },
      { id: 'toggle.debug', label: isDebug ? 'Disable Debug Mode' : 'Enable Debug Mode', category: 'Debug', icon: Terminal, action: () => { setDebugMode(!isDebug); addNotification(`Debug mode ${!isDebug ? 'enabled' : 'disabled'}`, 'success'); } },
      { id: 'nav.dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: Cpu, action: () => navigate('/') },
      { id: 'nav.resources', label: 'Open Project Library & Tutorials', category: 'Navigation', icon: FolderOpen, action: () => navigate('/resources') },
      { id: 'nav.settings', label: 'Open Account Settings', category: 'Navigation', icon: Settings, action: () => navigate('/settings') },
      { id: 'action.new_file', label: 'Create New QuCPL File', category: 'Workspace', icon: Code2, action: () => {
        const name = prompt('Enter new filename (e.g. state.qucpl):');
        if (name) {
          const success = useWorkspaceStore.getState().createFile(name, '// New QuCPL program\nqubit q0;\n');
          if (success) addNotification(`Created file ${name}`, 'success');
          else addNotification('File already exists!', 'error');
        }
      }},
    ];

    // Add active files to commands for quick jumping
    Object.keys(files).forEach(f => {
      list.push({
        id: `file.${f}`,
        label: `Switch to: ${f}`,
        category: 'Files',
        icon: Code2,
        action: () => {
          setActiveFile(f);
          addNotification(`Switched to file ${f}`, 'success');
        }
      });
    });

    return list;
  };

  const filteredCommands = getCommands().filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  // Listen to keyboard trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen(!isOpen);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Adjust selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside modal
  const handleModalKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setOpen(false);
        setQuery('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-overlay" onClick={() => setOpen(false)}>
      <div className="palette-container" ref={modalRef} onClick={e => e.stopPropagation()} onKeyDown={handleModalKeyDown}>
        <div className="palette-search-wrapper">
          <Search className="palette-search-icon" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command or file to search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="palette-shortcut-badge">ESC</span>
        </div>
        
        <div className="palette-results">
          {filteredCommands.length === 0 ? (
            <div className="palette-empty-state">
              <HelpCircle size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div>No commands found matching "{query}"</div>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const IconComp = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  className={`palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    cmd.action();
                    setOpen(false);
                    setQuery('');
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <IconComp size={16} className="palette-item-icon" />
                  <span className="palette-item-label">{cmd.label}</span>
                  <span className="palette-item-category">{cmd.category}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="palette-footer">
          <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close.</span>
        </div>
      </div>
    </div>
  );
}
