import { useState, useCallback } from 'react';

/**
 * useToast Hook - Manages toast notifications throughout the app
 * 
 * Usage:
 *   const toast = useToast();
 *   toast.success('Player added successfully');
 *   toast.error('Failed to save player');
 *   toast.info('Loading data...');
 *   toast.warning('This action cannot be undone');
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    
    const newToast = {
      id,
      message,
      type, // 'success' | 'error' | 'info' | 'warning'
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message, duration = 3500) => addToast(message, 'success', duration),
    [addToast]
  );

  const error = useCallback(
    (message, duration = 4000) => addToast(message, 'error', duration),
    [addToast]
  );

  const info = useCallback(
    (message, duration = 3500) => addToast(message, 'info', duration),
    [addToast]
  );

  const warning = useCallback(
    (message, duration = 4000) => addToast(message, 'warning', duration),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
