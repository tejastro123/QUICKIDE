import { useState, useEffect } from 'react';

/**
 * Creates a lightweight, zero-dependency centralized state store mimicking Zustand.
 * @param {Function} config - A function (set, get) returning the initial state.
 * @returns {Function} A React hook to select state slices, and store methods.
 */
export const createStore = (config) => {
  let state;
  const listeners = new Set();

  const get = () => state;

  const set = (nextStateOrFn) => {
    const nextState = typeof nextStateOrFn === 'function' ? nextStateOrFn(state) : nextStateOrFn;
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener(state));
  };

  state = config(set, get);

  // The custom selector hook
  const useStore = (selector = (s) => s) => {
    const [slice, setSlice] = useState(() => selector(state));

    useEffect(() => {
      const listener = (currentState) => {
        const nextSlice = selector(currentState);
        setSlice((prevSlice) => {
          // Shallow equality check to avoid re-renders if the slice hasn't changed
          if (prevSlice === nextSlice) return prevSlice;
          if (
            typeof prevSlice === 'object' &&
            typeof nextSlice === 'object' &&
            prevSlice !== null &&
            nextSlice !== null &&
            Object.keys(prevSlice).length === Object.keys(nextSlice).length &&
            Object.keys(prevSlice).every((k) => prevSlice[k] === nextSlice[k])
          ) {
            return prevSlice;
          }
          return nextSlice;
        });
      };

      listeners.add(listener);
      // Run once in case state changed before listener was registered
      listener(state);

      return () => {
        listeners.delete(listener);
      };
    }, [selector]);

    return slice;
  };

  // Attach getState/setState to the hook object for external usage
  useStore.getState = get;
  useStore.setState = set;
  useStore.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return useStore;
};
