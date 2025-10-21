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

export const getSimulation = (ir) => {
  return api.post('/run/simulate', { ir }, { responseType: 'blob' });
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