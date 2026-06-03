import axios from 'axios';

// Create an Axios instance pointing to your Node.js server
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

/**
 * Sets (or clears) the Authorization header on the shared Axios instance.
 * Called by AuthContext on every login / logout.
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Registers a global 401 response interceptor.
 * Must be called once, from AuthContext, with the live `logout` function.
 * Any API call that receives a 401 (invalid / expired token) automatically
 * calls logout() — the user is signed out immediately with clear feedback
 * instead of every action silently failing.
 */
export const setupInterceptors = (logout) => {
  api.interceptors.response.use(
    // Pass successful responses straight through
    (response) => response,
    // On error, check for 401 and auto-logout
    (error) => {
      if (error.response?.status === 401) {
        logout();
      }
      return Promise.reject(error);
    }
  );
};


// --- Compiler Functions ---

export const parseCode = (code) => {
  return api.post('/run/parse', { code });
};

export const compileAst = (ast) => {
  return api.post('/run/compile', { ast });
};

const getTheme = () => localStorage.getItem('theme') || 'dark';

// We expect image data (a 'blob') back from these
export const getVisualization = (ir) => {
  return api.post('/run/visualize', { ir, theme: getTheme() }, { responseType: 'blob' });
};

export const transpileAst = (ir) => {
  return api.post('/run/transpile', { ir });
};

export const getDebugStep = (ir, index) => {
  return api.post('/run/debug/step', { ir, index, theme: getTheme() });
};

export const getSimulation = (ir, backend = 'ideal') => {
  return api.post('/run/simulate', { ir, backend, theme: getTheme() }, { responseType: 'blob' });
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

// --- Phase 2 Functions ---

export const reverseTranspile = (qasm) => {
  return api.post('/run/transpile/reverse', { qasm });
};

export const optimizeIr = (ir) => {
  return api.post('/run/optimize', { ir });
};

export const getAlgorithms = (query = '', category = '') => {
  return api.get('/run/algorithms', {
    params: { q: query, category }
  });
};

export const getBlochSphere = (statevector, num_qubits, title = 'Bloch Sphere') => {
  return api.post('/run/bloch', { statevector, num_qubits, title, theme: getTheme() }, { responseType: 'blob' });
};

export const shareCode = (code) => {
  return api.post('/share', { code });
};

export const getSharedCode = (id) => {
  return api.get(`/share/${id}`);
};