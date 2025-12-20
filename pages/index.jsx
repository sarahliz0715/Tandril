import React from "react";
import InfoSections from "@/components/InfoSections";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header / Logo */}
      <header className="flex items-center justify-center py-10 bg-white shadow-md">
        <h1 className="text-4xl font-bold text-indigo-600">Tandril</h1>
      </header>

      {/* Main content */}
      <main className="py-12">
        <InfoSections />
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 py-6 border-t border-gray-300">
        <p>© 2025 Tandril. All rights reserved.</p>
      </footer>
    </div>
  );
}
