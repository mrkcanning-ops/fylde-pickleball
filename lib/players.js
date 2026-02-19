// lib/players.js
const STORAGE_KEY = 'fylde-pickleball-players';

export const getPlayers = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const setPlayers = (newPlayers) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlayers));
};