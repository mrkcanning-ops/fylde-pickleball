"use client";

export default function HeaderStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          onClick={stat.onClick}
          className={`p-5 rounded-2xl shadow-lg select-none transition-all duration-300 transform hover:-translate-y-1 hover:scale-105
            ${
              stat.label === "Current Leader"
                ? "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white font-bold shadow-[0_0_25px_rgba(255,215,0,0.5)]"
                : stat.highlight === "gold"
                ? "bg-yellow-800 text-yellow-300 hover:bg-yellow-700"
                : stat.highlight === "blue"
                ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                : stat.highlight === "grayButton"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-700 text-gray-300"
            } ${stat.cursorPointer ? "cursor-pointer" : ""} h-32 flex flex-col justify-center`}
        >
          <div className="text-sm">{stat.label}</div>
          <div className="text-2xl mt-2 flex items-center gap-2">
            {stat.label === "Current Leader" && <span className="text-2xl">🏆</span>}
            {stat.value}
          </div>

          {/* Extra info for Highest Win Streak */}
          {stat.label === "Highest Win Streak" && stat.streak && (
            <div className="flex space-x-1 mt-2">
              {Array.from({ length: stat.streak }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-green-500 rounded-full"
                  title={`Win ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}