import axios from 'axios';

// Create an Axios instance pointing to your Node.js server
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const setAuthToken = (token) => {
  if (token) {
    // Apply token to every request
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    // Delete the auth header
    delete api.defaults.headers.common['Authorization'];
  }
};


// --- Compiler Functions ---

export const parseCode = (code) => {
  return api.post('/run/parse', { code });
};

export const compileAst = (ast) => {
  return api.post('/run/compile', { ast });
};

// We expect image data (a 'blob') back from these
export const getVisualization = (ir) => {
  return api.post('/run/visualize', { ir }, { responseType: 'blob' });
};

export const transpileAst = (ir) => {
  return api.post('/run/transpile', { ir });
};

export const getDebugStep = (ir, index) => {
  return api.post('/run/debug/step', { ir, index });
};

export const getSimulation = (ir, backend = 'ideal') => {
  return api.post('/run/simulate', { ir, backend }, { responseType: 'blob' });
};

// --- Project Functions ---

export const saveProject = (name, code) => {
  return api.post('/projects', { name, code });
};

export const getProject = (id) => {
  return api.get(`/projects/${id}`);
};

export const getAllProjects = () => {
  return api.get('/projects');
};

// --- Cloud & Job Functions ---

export const getIbmToken = () => {
  return api.get('/user/token');
};

export const updateIbmToken = (ibmToken) => {
  return api.post('/user/token', { ibmToken });
};

export const submitCloudJob = (ir, backend, projectName) => {
  return api.post('/cloud/submit', { ir, backend, projectName });
};

export const getCloudJobs = () => {
  return api.get('/cloud/jobs');
};

export const syncCloudJobs = () => {
  return api.post('/cloud/sync');
};

export const renameProject = (id, name) => {
  return api.put(`/projects/${id}`, { name });
};

export const deleteProject = (id) => {
  return api.delete(`/projects/${id}`);
};