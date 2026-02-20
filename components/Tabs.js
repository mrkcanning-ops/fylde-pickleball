"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Tabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/" },
    { name: "Players", href: "/players" },
    { name: "Matches", href: "/matches" },
    { name: "Previous Matches", href: "/previous-matches" },
  ];

  return (
    <div className="flex space-x-4 mb-8">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href}>
          <span
            className={`px-4 py-2 rounded font-medium cursor-pointer ${
              pathname === tab.href
                ? "bg-yellow-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {tab.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
