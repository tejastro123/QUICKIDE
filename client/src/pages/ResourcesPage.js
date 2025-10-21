import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectList from '../components/ProjectList';
import TutorialViewer from '../components/TutorialViewer'; // 1. Import the new component

function ResourcesPage({ setCode, log }) {
  const navigate = useNavigate();

  const handleLoadAndSwitch = (codeToLoad) => {
    setCode(codeToLoad);
    log('Project loaded. Navigating to IDE...', 'success');
    navigate('/'); 
  };

  return (
    <div className="resources-page">
      <h2>Projects & Tutorials</h2>
      
      <div className="resource-section">
        <h3>My Projects</h3>
        <p>Click a project to load it in the editor.</p>
        <ProjectList setCode={handleLoadAndSwitch} log={log} />
      </div>

      <div className="resource-section">
        <h3>Tutorials</h3>
        {/* 2. Replace the old <p> tag with the new component */}
        <TutorialViewer />
      </div>
    </div>
  );
}

export default ResourcesPage;