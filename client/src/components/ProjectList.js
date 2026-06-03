import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import Modal from './Modal';

function ProjectList({ setCode, log }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Rename modal states
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState('');
  const [renameCurrentName, setRenameCurrentName] = useState('');
  const [renameNewName, setRenameNewName] = useState('');

  // Delete modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getAllProjects();
      setProjects(response.data);
    } catch (err) {
      log('Error fetching projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [log]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleLoad = async (id) => {
    try {
      const response = await api.getProject(id);
      const { code, name } = response.data;
      setCode(code);
      log(`Loaded project: ${name}`, 'success');
    } catch (err) {
      log('Error loading project', 'error');
    }
  };

  const handleRenameClick = (e, id, currentName) => {
    e.stopPropagation();
    setRenameId(id);
    setRenameCurrentName(currentName);
    setRenameNewName(currentName);
    setIsRenameOpen(true);
  };

  const submitRename = async () => {
    if (!renameNewName.trim() || renameNewName.trim() === renameCurrentName) {
      setIsRenameOpen(false);
      return;
    }
    try {
      await api.renameProject(renameId, renameNewName.trim());
      log(`Project renamed to: ${renameNewName.trim()}`, 'success');
      fetchProjects();
    } catch (err) {
      log('Error renaming project', 'error');
    } finally {
      setIsRenameOpen(false);
    }
  };

  const handleDeleteClick = (e, id, name) => {
    e.stopPropagation();
    setDeleteId(id);
    setDeleteName(name);
    setIsDeleteOpen(true);
  };

  const submitDelete = async () => {
    try {
      await api.deleteProject(deleteId);
      log(`Project "${deleteName}" deleted.`, 'success');
      fetchProjects();
    } catch (err) {
      log('Error deleting project', 'error');
    } finally {
      setIsDeleteOpen(false);
    }
  };

  return (
    <div className="project-list-container">
      {isLoading ? (
        <div className="skeleton-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-item animate-pulse" style={{ height: '42px', marginBottom: '8px', background: 'var(--border-color)', borderRadius: '6px' }}></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="empty-msg">No projects saved yet.</p>
      ) : (
        <ul className="project-items">
          {projects.map(p => (
            <li key={p._id} className="project-item" onClick={() => handleLoad(p._id)}>
              <div className="project-info">
                <span className="project-name">{p.name}</span>
                <span className="project-date">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="project-actions">
                <button 
                  onClick={(e) => handleRenameClick(e, p._id, p.name)}
                  className="action-btn rename"
                  title="Rename"
                >
                  ✎
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(e, p._id, p.name)}
                  className="action-btn delete"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="refresh-btn" onClick={fetchProjects}>Refresh List</button>

      {/* Rename Modal */}
      <Modal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Project"
        actions={
          <>
            <button className="modal-btn-secondary" onClick={() => setIsRenameOpen(false)}>Cancel</button>
            <button className="modal-btn-primary" onClick={submitRename}>Rename</button>
          </>
        }
      >
        <div className="form-group">
          <label>New Project Name</label>
          <input 
            type="text" 
            value={renameNewName} 
            onChange={(e) => setRenameNewName(e.target.value)} 
            placeholder="Enter new name"
            onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Project"
        actions={
          <>
            <button className="modal-btn-secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
            <button className="modal-btn-danger" onClick={submitDelete}>Delete</button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong>{deleteName}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

export default ProjectList;