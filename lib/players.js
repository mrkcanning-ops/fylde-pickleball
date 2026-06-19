// lib/players.js
import { getViewMode, getLSRaw, getLSJson, setLSJson } from './ls';

const keyFor = () => {
  const vm = getViewMode() || 'league';
  return `${vm}:fylde-pickleball-players`;
};

export const getPlayers = () => {
  if (typeof window === 'undefined') return [];
  try {
    return getLSJson('fylde-pickleball-players', []);
  } catch (e) {
    return [];
  }
};

export const setPlayers = (newPlayers) => {
  if (typeof window === 'undefined') return;
  try {
    setLSJson('fylde-pickleball-players', newPlayers);
  } catch (e) {}
};