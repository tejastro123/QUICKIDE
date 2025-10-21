import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectList from '../components/ProjectList';

function ResourcesPage({ setCode, log }) {
  const navigate = useNavigate();

  // This wrapper function will load the code AND switch back to the IDE
  const handleLoadAndSwitch = (codeToLoad) => {
    setCode(codeToLoad);
    log('Project loaded. Navigating to IDE...', 'success');
    navigate('/'); // Navigate back to the IDE page
  };

  return (
    <div className="resources-page">
      <h2>Projects & Tutorials</h2>
      
      <div className="resource-section">
        <h3>My Projects</h3>
        <p>Click a project to load it in the editor.</p>
        {/* We pass our special wrapper function to ProjectList */}
        <ProjectList setCode={handleLoadAndSwitch} log={log} />
      </div>

      <div className="resource-section">
        <h3>Tutorials</h3>
        <p>Select a .md file to view the tutorial.</p>
        {/* You can add your tutorial viewer logic here */}
      </div>
    </div>
  );
}

export default ResourcesPage;