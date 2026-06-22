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
            className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-200 cursor-pointer ${
              pathname === tab.href
                ? "bg-yellow-500 text-white shadow-md"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
          >
            {tab.name}
          </span>
        </Link>
      ))}
    </div>
  );
}