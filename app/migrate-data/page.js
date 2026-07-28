"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

export default function MigrateDataPage() {
  const router = useRouter();
  const { user, userType, isLoading } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({
    divisions: 0,
    divisions_doubles: 0,
    divisions_5champ: 0,
    divisions_roundrobin: 0,
    players: 0,
    players_doubles: 0,
    players_5champ: 0,
    players_roundrobin: 0,
  });

  useEffect(() => {
    if (!isLoading && userType !== "club-member") {
      router.push("/welcome");
      return;
    }
  }, [isLoading, userType, router]);

  if (isLoading || userType !== "club-member") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  const checkOrphanedData = async () => {
    setMessage("Scanning for unowned data...");
    try {
      const tables = [
        "divisions",
        "divisions_doubles",
        "divisions_5champ",
        "divisions_roundrobin",
        "players",
        "players_doubles",
        "players_5champ",
        "players_roundrobin",
      ];

      const newStats = { ...stats };

      for (const table of tables) {
        // Query for rows where owner_id is NULL (orphaned data)
        const { data, error } = await supabase
          .from(table)
          .select("*", { count: "exact" })
          .is("owner_id", null);

        if (!error && data) {
          newStats[table] = data.length;
        } else if (error) {
          console.warn(`Could not check ${table}:`, error.message);
        }
      }

      setStats(newStats);
      const totalOrphaned = Object.values(newStats).reduce((a, b) => a + b, 0);
      if (totalOrphaned === 0) {
        setMessage("✅ No unowned data found. All your data is already claimed!");
      } else {
        setMessage(`Found ${totalOrphaned} unowned records ready to claim.`);
      }
    } catch (err) {
      setMessage(`❌ Error scanning: ${err.message}`);
    }
  };

  const migrateAllData = async () => {
    if (!user?.id) {
      setMessage("❌ Error: User ID not found.");
      return;
    }

    setMigrating(true);
    setMessage("Starting migration...");

    try {
      const tables = [
        "divisions",
        "divisions_doubles",
        "divisions_5champ",
        "divisions_roundrobin",
        "players",
        "players_doubles",
        "players_5champ",
        "players_roundrobin",
        "matches",
        "matches_doubles",
        "matches_5champ",
        "matches_roundrobin",
        "previous_matches",
        "previous_matches_doubles",
        "previous_matches_5champ",
        "previous_matches_roundrobin",
        "season_summaries",
        "season_summaries_doubles",
        "season_summaries_5champ",
        "season_summaries_roundrobin",
        "running_seasons",
        "running_seasons_doubles",
        "running_seasons_5champ",
        "running_seasons_roundrobin",
        "pending_fixtures",
        "pending_fixtures_doubles",
        "pending_fixtures_5champ",
        "pending_fixtures_roundrobin",
      ];

      let totalMigrated = 0;

      for (const table of tables) {
        try {
          // Update all rows with NULL owner_id to current user
          const { error, count } = await supabase
            .from(table)
            .update({ owner_id: user.id })
            .is("owner_id", null);

          if (error) {
            console.warn(`Could not migrate ${table}:`, error.message);
          } else {
            totalMigrated += count || 0;
          }
        } catch (err) {
          console.warn(`Error migrating ${table}:`, err.message);
        }
      }

      setMessage(
        `✅ Migration complete! ${totalMigrated} records claimed to your account. Refreshing...`
      );

      // Refresh page after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setMessage(`❌ Migration error: ${err.message}`);
      setMigrating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4 py-6 sm:p-8 text-gray-300 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Claim Existing Leagues</h1>
          <p className="text-gray-400 mb-8">
            If you created leagues before setting up your club member account, migrate them here.
          </p>

          {/* Status Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded ${
                message.includes("✅")
                  ? "bg-green-900 text-green-200 border border-green-700"
                  : message.includes("❌")
                  ? "bg-red-900 text-red-200 border border-red-700"
                  : "bg-blue-900 text-blue-200 border border-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Stats */}
          <div className="mb-8 bg-gray-700 rounded p-6">
            <h3 className="text-lg font-semibold mb-4">Unowned Records Found:</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats).map(([table, count]) => (
                <div key={table} className="flex justify-between text-sm">
                  <span className="text-gray-300">{table}:</span>
                  <span className={count > 0 ? "text-yellow-400 font-bold" : "text-gray-500"}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600 font-semibold text-lg">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className={Object.values(stats).reduce((a, b) => a + b, 0) > 0 ? "text-yellow-400" : "text-gray-500"}>
                  {Object.values(stats).reduce((a, b) => a + b, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={checkOrphanedData}
              disabled={migrating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {migrating ? "Scanning..." : "Scan for Old Data"}
            </button>
            <button
              onClick={migrateAllData}
              disabled={migrating || Object.values(stats).reduce((a, b) => a + b, 0) === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {migrating ? "Migrating..." : "Claim All Leagues"}
            </button>
            <button
              onClick={() => router.push("/")}
              disabled={migrating}
              className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              Back to App
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-6">
            💡 <strong>How it works:</strong> Click "Scan for Old Data" first to see what can be claimed. Then click "Claim All Leagues" to associate all unowned leagues with your account. This is a one-time migration.
          </p>
        </div>
      </div>
    </main>
  );
}
