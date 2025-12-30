"use client";

import { useEffect, useState } from "react";

export function ElectronTitleBar() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Detect if running in Electron
    const userAgent = navigator.userAgent.toLowerCase();
    setIsElectron(userAgent.includes('electron'));
  }, []);

  // Only render in Electron
  if (!isElectron) {
    return null;
  }

  return (
    <div
      className="electron-drag-region fixed top-0 left-0 right-0 h-14 z-[9999] bg-[#FDFBF7]/95 backdrop-blur-sm border-b border-[#E8DCC4]/50"
    >
      {/* Left spacing for macOS traffic lights */}
      <div className="absolute left-0 top-0 bottom-0 w-[80px]" />

      {/* Centered title - draggable */}
      <div className="flex items-center justify-center h-full px-20">
        <span className="text-sm font-medium text-[#5C7A6B] tracking-wide">
          Chrononaut
        </span>
      </div>
    </div>
  );
}
