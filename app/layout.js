import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load Geist fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Metadata for Next.js 16 app directory
export const metadata = {
  title: "Fylde Pickleball",
  description: "Competitive ladder system",
};

// ✅ Root layout component
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-gray-300`}
      >
        {children}
      </body>
    </html>
  );
}
