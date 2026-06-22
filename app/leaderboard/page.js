"use client";

import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("../page"), { ssr: false });

export default function LeaderboardRoute() {
  return <HomePage />;
}
