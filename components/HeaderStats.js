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
            } ${stat.onClick ? "cursor-pointer ring-2 ring-yellow-400/30 hover:ring-yellow-300" : ""} h-32 flex flex-col justify-center`}
        >
          <div className="text-sm">{stat.label}</div>
          {stat.renderCustom ? (
            <div className="mt-3">{stat.renderCustom()}</div>
          ) : (
            <div className="text-2xl mt-2 flex items-center gap-2">
              {stat.label === "Current Leader" && <span className="text-2xl">🏆</span>}
              {stat.value}
            </div>
          )}

          {/* Extra info for Highest Win Streak */}
          {stat.label === "Highest Win Streak" && stat.streak !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-semibold text-green-500">
                {stat.streak} win{stat.streak !== 1 ? "s" : ""}
              </span>
              <div className="flex space-x-1">
                {Array.from({ length: stat.streak }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 bg-green-500"
                    title={`Win ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Extra info for Most Improved */}
          {stat.label === "Most Improved" && stat.improvementValue !== undefined && stat.improvementValue > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl text-green-500">↑</span>
              <span className="text-sm font-semibold text-green-500">
                {stat.improvementValue} {stat.improvementType}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}