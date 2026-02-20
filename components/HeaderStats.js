"use client";

export default function HeaderStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          onClick={stat.onClick}
          className={`p-4 rounded shadow select-none transition-colors duration-200 ${
            stat.highlight === "gold"
              ? "bg-yellow-800 text-yellow-300 hover:bg-yellow-700"
              : stat.highlight === "blue"
              ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
              : stat.highlight === "grayButton"
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-700 text-gray-300"
          } ${stat.cursorPointer ? "cursor-pointer" : ""}`}
        >
          <div className="text-sm font-semibold">{stat.label}</div>
          <div className="text-2xl mt-1">{stat.value}</div>

          {/* Extra info for Highest Win Streak */}
          {stat.label === "Highest Win Streak" && stat.streak && (
            <div className="flex space-x-1 mt-2">
              {Array.from({ length: stat.streak }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-green-500 rounded"
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
