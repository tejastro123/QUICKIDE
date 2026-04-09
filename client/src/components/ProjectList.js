import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

function ProjectList({ setCode, log }) {
  const [projects, setProjects] = useState([]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.getAllProjects();
      setProjects(response.data);
    } catch (err) {
      log('Error fetching projects', 'error');
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

  const handleRename = async (e, id, currentName) => {
    e.stopPropagation();
    const newName = prompt('Enter new project name:', currentName);
    if (!newName || newName === currentName) return;

    try {
      await api.renameProject(id, newName);
      log(`Project renamed to: ${newName}`, 'success');
      fetchProjects();
    } catch (err) {
      log('Error renaming project', 'error');
    }
  };

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.deleteProject(id);
      log(`Project "${name}" deleted.`, 'success');
      fetchProjects();
    } catch (err) {
      log('Error deleting project', 'error');
    }
  };

  return (
    <div className="project-list-container">
      {projects.length === 0 && <p className="empty-msg">No projects saved yet.</p>}
      <ul className="project-items">
        {projects.map(p => (
          <li key={p._id} className="project-item" onClick={() => handleLoad(p._id)}>
            <div className="project-info">
              <span className="project-name">{p.name}</span>
              <span className="project-date">{new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="project-actions">
              <button 
                onClick={(e) => handleRename(e, p._id, p.name)}
                className="action-btn rename"
                title="Rename"
              >
                ✎
              </button>
              <button 
                onClick={(e) => handleDelete(e, p._id, p.name)}
                className="action-btn delete"
                title="Delete"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="refresh-btn" onClick={fetchProjects}>Refresh List</button>
    </div>
  );
}

export default ProjectList;