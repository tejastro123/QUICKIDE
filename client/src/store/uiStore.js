import { createStore } from './store';

export const useUiStore = createStore((set, get) => ({
  commandPaletteOpen: false,
  activeSidebarTab: 'explorer', // 'explorer' | 'copilot' | 'history'
  activePanelLayout: 'default',
  notifications: [], // array of { id, message, type: 'success' | 'error' | 'info' }

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  setActivePanelLayout: (layout) => set({ activePanelLayout: layout }),
  
  addNotification: (message, type = 'info') => {
    const id = Date.now().toString();
    const newNotif = { id, message, type };
    set({ notifications: [...get().notifications, newNotif] });
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set({ notifications: get().notifications.filter(n => n.id !== id) });
    }, 4000);
  },

  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) });
  }
}));
