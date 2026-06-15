import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MacroPulse OSINT Terminal",
  description: "Institutional geopolitical and macroeconomic trading terminal",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MacroPulse"
  }
};

export const viewport: Viewport = {
  themeColor: "#020617", // slate-950
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-mono text-xs leading-tight">
        <Navigation />
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </main>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
