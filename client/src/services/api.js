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
 * Registers a global response interceptor to handle automated JWT refresh rotation.
 * If an API request fails with a 401 Unauthorized, it attempts to exchange the stored
 * refresh token for a new token pair and retries the original request.
 */
export const setupInterceptors = (logout, updateTokens, onQuotaExceeded) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 429 Too Many Requests (Quota limit hit)
      if (error.response?.status === 429) {
        if (error.response.data && error.response.data.limitExceeded) {
          onQuotaExceeded?.(error.response.data);
        }
        return Promise.reject(error);
      }

      // If unauthorized and we haven't retried this request yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            logout();
            return Promise.reject(error);
          }

          // Request new tokens from auth backend (use base axios to avoid infinite loops)
          const response = await axios.post('http://localhost:5000/api/auth/refresh', {
            refreshToken,
          });
          const { token: newToken, refreshToken: newRefreshToken } = response.data;

          // Save and propagate new tokens to AuthContext and common headers
          updateTokens(newToken, newRefreshToken);

          // Retry original request with the new access token
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          logout();
          return Promise.reject(refreshError);
        }
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

export const getDebugStep = (ir, index, sessionId = null) => {
  return api.post('/run/debug/step', { ir, index, theme: getTheme(), sessionId });
};

export const getSimulation = async (ir, backend = 'ideal') => {
  const res = await api.post(
    '/run/simulate',
    { ir, backend, theme: getTheme() },
    { responseType: 'blob' }
  );
  const blob = res.data;

  // Check if response is JSON (meaning it's queued or failed)
  if (blob.type === 'application/json') {
    const text = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    });
    const json = JSON.parse(text);
    if (json.jobId) {
      // Poll the job status
      return new Promise((resolve, reject) => {
        const poll = async () => {
          try {
            const statusRes = await api.get(`/run/simulate/status/${json.jobId}`, {
              responseType: 'blob',
            });
            const statusBlob = statusRes.data;
            if (statusBlob.type === 'application/json') {
              const statusText = await new Promise((resolveText) => {
                const reader = new FileReader();
                reader.onload = () => resolveText(reader.result);
                reader.readAsText(statusBlob);
              });
              const statusJson = JSON.parse(statusText);
              if (statusJson.status === 'failed') {
                reject(new Error(statusJson.error || 'Simulation job failed'));
              } else {
                setTimeout(poll, 1000);
              }
            } else {
              resolve({ data: statusBlob });
            }
          } catch (err) {
            reject(err);
          }
        };
        setTimeout(poll, 500);
      });
    } else {
      throw new Error(json.error || 'Simulation failed');
    }
  }

  // If it's already an image/png blob, return it directly!
  return { data: blob };
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

export const reverseTranspile = (qiskit) => {
  return api.post('/run/transpile/reverse', { qasm: qiskit });
};

export const optimizeIr = (ir) => {
  return api.post('/run/optimize', { ir });
};

export const getAlgorithms = (query = '', category = '') => {
  return api.get('/run/algorithms', {
    params: { q: query, category },
  });
};

export const getBlochSphere = (statevector, num_qubits, title = 'Bloch Sphere') => {
  return api.post(
    '/run/bloch',
    { statevector, num_qubits, title, theme: getTheme() },
    { responseType: 'blob' }
  );
};

export const shareCode = (code) => {
  return api.post('/share', { code });
};

export const getSharedCode = (id) => {
  return api.get(`/share/${id}`);
};

export const logoutUser = () => {
  const refreshToken = localStorage.getItem('refreshToken');
  return api.post('/auth/logout', { refreshToken });
};

export const getUserQuota = () => {
  return api.get('/user/quota');
};
