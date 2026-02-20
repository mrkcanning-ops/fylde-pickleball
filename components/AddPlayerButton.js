"use client";

export default function AddPlayerButton({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      className="mb-6 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
    >
      Add Player
    </button>
  );
}
