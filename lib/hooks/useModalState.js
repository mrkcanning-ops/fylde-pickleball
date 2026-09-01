import { useState } from 'react';

/**
 * Generic hook for managing modal visibility states
 * Eliminates repetitive useState patterns for modals
 * 
 * Usage:
 *   const { isOpen, open, close } = useModalState();
 */
export function useModalState() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}

/**
 * Hook for managing multiple modals at once
 * 
 * Usage:
 *   const modals = useModals(['addPlayer', 'removePlayer', 'addDivision']);
 *   modals.addPlayer.open()
 */
export function useModals(modalNames) {
  const modals = {};
  
  modalNames.forEach(name => {
    modals[name] = useModalState();
  });

  return modals;
}

/**
 * Hook for managing a modal with associated data
 * Useful for edit/delete modals that need context
 * 
 * Usage:
 *   const { isOpen, data, open, close, setData } = useModalData();
 *   open({ name: 'John', id: 123 })
 */
export function useModalData() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  return {
    isOpen,
    data,
    open: (modalData) => {
      setData(modalData);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setData(null);
    },
    setData,
  };
}
