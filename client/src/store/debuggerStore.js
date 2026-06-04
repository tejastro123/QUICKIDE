import { createStore } from './store';

export const useDebuggerStore = createStore((set, get) => ({
  isDebugMode: false,
  debugStep: 0,
  debugData: null,
  debugLogs: [],
  isDebugging: false,

  setDebugMode: (isDebugMode) => set({ isDebugMode }),
  setDebugStep: (debugStep) => set({ debugStep }),
  setDebugData: (debugData) => set({ debugData }),
  setIsDebugging: (isDebugging) => set({ isDebugging }),
  
  addDebugLog: (log) => set({ debugLogs: [...get().debugLogs, log] }),
  clearDebugLogs: () => set({ debugLogs: [] }),

  resetDebugger: () => set({
    isDebugMode: false,
    debugStep: 0,
    debugData: null,
    isDebugging: false,
    debugLogs: []
  })
}));
