import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

// Pass setCode as a prop so this component can load code into the editor
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

  // Fetch all projects when the component loads
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleLoad = async (id) => {
    try {
      const response = await api.getProject(id);
      const { code, name } = response.data;
      setCode(code); // This is the key part!
      log(`Loaded project: ${name}`, 'success');
    } catch (err) {
      log('Error loading project', 'error');
    }
  };

  return (
    <div className="panel-content scrollable">
      <h3>Saved Projects</h3>
      {projects.length === 0 && <p>No projects saved.</p>}
      <ul>
        {projects.map(p => (
          <li key={p._id} onClick={() => handleLoad(p._id)} style={{cursor: 'pointer'}}>
            {p.name} - <small>{new Date(p.createdAt).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>
      <button onClick={fetchProjects}>Refresh List</button>
    </div>
  );
}

export default ProjectList;