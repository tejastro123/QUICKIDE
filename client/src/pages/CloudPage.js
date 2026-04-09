import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

function CloudPage({ log }) {
  const [token, setToken] = useState('');
  const [jobs, setJobs] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchToken = useCallback(async () => {
    try {
      const response = await api.getIbmToken();
      setToken(response.data.ibmToken || '');
    } catch (err) {
      log('Error fetching IBM Token', 'error');
    }
  }, [log]);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await api.getCloudJobs();
      setJobs(response.data);
    } catch (err) {
      log('Error fetching cloud jobs', 'error');
    }
  }, [log]);

  useEffect(() => {
    fetchToken();
    fetchJobs();
  }, [fetchToken, fetchJobs]);

  const handleUpdateToken = async () => {
    setIsUpdating(true);
    try {
      await api.updateIbmToken(token);
      log('IBM Token updated successfully', 'success');
    } catch (err) {
      log('Error updating IBM Token', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      log('Syncing cloud jobs status...', 'info');
      await api.syncCloudJobs();
      await fetchJobs();
      log('Cloud jobs synchronized', 'success');
    } catch (err) {
      log('Error syncing jobs', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="resources-page cloud-page">
      <h2>Cloud & Hardware</h2>
      
      <div className="resource-section">
        <h3>IBM Quantum API Token</h3>
        <p>Your API token is required to submit jobs to real hardware. Get it from <a href="https://quantum-computing.ibm.com/" target="_blank" rel="noreferrer">IBM Quantum</a>.</p>
        <div className="form-group" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <input 
            type="password" 
            value={token} 
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your IBM API Token"
            style={{ marginBottom: 0 }}
          />
          <button 
            onClick={handleUpdateToken}
            disabled={isUpdating}
            className="primary_btn"
            style={{ width: 'auto', padding: '0 24px' }}
          >
            {isUpdating ? 'Saving...' : 'Save Token'}
          </button>
        </div>
      </div>

      <div className="resource-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Hardware Job History</h3>
          <button onClick={handleSync} disabled={isSyncing} className="clear-btn">
            {isSyncing ? 'Syncing...' : '🔄 Sync Status'}
          </button>
        </div>
        
        {jobs.length === 0 ? (
          <p className="empty-msg">No hardware jobs submitted yet.</p>
        ) : (
          <div className="table-container">
            <table className="statevector-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Job ID</th>
                  <th>Backend</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job._id}>
                    <td style={{ fontWeight: 600 }}>{job.projectName}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{job.jobId}</td>
                    <td>{job.backend}</td>
                    <td>
                      <span className={`status-tag ${job.status.toLowerCase()}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                    <td>
                      {job.results && (
                        <button className="accent" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                          View Results
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CloudPage;
