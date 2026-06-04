import { createStore } from './store';

export const useWorkspaceStore = createStore((set, get) => ({
  workspaceId: 'default-workspace',
  files: {
    'main.qucpl': {
      content: 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;',
      isDirty: false
    },
    'bell.qucpl': {
      content: 'qubit q0, q1;\nqop h q0;\nqop cx q0, q1;\nmeasure q0, q1 -> c0, c1;',
      isDirty: false
    },
    'teleportation.qucpl': {
      content: 'qubit q0, q1, q2;\nqop h q1;\nqop cx q1, q2;\nqop cx q0, q1;\nqop h q0;\nmeasure q0 -> c0;\nmeasure q1 -> c1;',
      isDirty: false
    }
  },
  activeFile: 'main.qucpl',
  fileExplorerOpen: true,

  setActiveFile: (activeFile) => set({ activeFile }),
  
  updateFileContent: (path, content) => {
    const { files } = get();
    if (!files[path]) return;
    set({
      files: {
        ...files,
        [path]: {
          ...files[path],
          content,
          isDirty: true
        }
      }
    });
  },

  saveFile: (path) => {
    const { files } = get();
    if (!files[path]) return;
    set({
      files: {
        ...files,
        [path]: {
          ...files[path],
          isDirty: false
        }
      }
    });
  },

  createFile: (path, initialContent = '') => {
    const { files } = get();
    if (files[path]) return false; // Already exists
    set({
      files: {
        ...files,
        [path]: {
          content: initialContent,
          isDirty: false
        }
      },
      activeFile: path
    });
    return true;
  },

  deleteFile: (path) => {
    const { files, activeFile } = get();
    if (!files[path]) return;
    const newFiles = { ...files };
    delete newFiles[path];
    
    let newActive = activeFile;
    if (activeFile === path) {
      const keys = Object.keys(newFiles);
      newActive = keys.length > 0 ? keys[0] : null;
    }

    set({
      files: newFiles,
      activeFile: newActive
    });
  },

  renameFile: (oldPath, newPath) => {
    const { files, activeFile } = get();
    if (!files[oldPath] || files[newPath]) return false;
    
    const newFiles = { ...files };
    newFiles[newPath] = newFiles[oldPath];
    delete newFiles[oldPath];

    set({
      files: newFiles,
      activeFile: activeFile === oldPath ? newPath : activeFile
    });
    return true;
  },

  toggleFileExplorer: () => set({ fileExplorerOpen: !get().fileExplorerOpen })
}));
