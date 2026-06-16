import React, { useEffect, useState } from 'react';

const asciiArt = `
+-----------------------------------------------------------------+
|                                                                 |
|   _       __   _____   __       _____   ____     __  __   _____ |
|  | |     / /  |  ___| | |      / ___/  / __ \\   /  |/  | |  ___||
|  | | /| / /   | |__   | |     | |     | /  \\ | | /| /| | | |__  |
|  | |/ |/ /    |  __|  | |     | |     | |  | | | |/ |/ | |  __| |
|  |   /| /     | |___  | |___  | |___  | \\__/ | | |  |  | | |___ |
|  |__/ |/      |_____| |_____|  \\____/  \\____/  |_|  |__| |_____||
|                                                                 |
|                      _____    ____                              |
|                     |_   _|  / __ \\                             |
|                       | |   | /  \\ |                            |
|                       | |   | |  | |                            |
|                       | |   | \\__/ |                            |
|                       |_|    \\____/                             |
|                                                                 |
|   _____     _____   _    _   ____     _____   _____             |
|  |  __ \\   |  ___| | \\  | | |  _ \\   |  ___| |  __ \\            |
|  | |__) |  | |__   |  \\ | | | | \\ \\  | |__   | |__) |           |
|  |  _  /   |  __|  | . \`  | | |  | | |  __|  |  _  /            |
|  | | \\ \\   | |___  | |\\   | | |_/ /  | |___  | | \\ \\            |
|  |_|  \\_\\  |_____| |_| \\__| |____/   |_____| |_|  \\_\\           |
|                                                                 |
+-----------------------------------------------------------------+
`;

export default function RenderLoadingScreen() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0')
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-[#8b949e] font-mono text-xs sm:text-sm md:text-base flex flex-col relative overflow-hidden">
      
      {/* Background Grid simulating the Render screen */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
        <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(#30363d 1px, transparent 1px), linear-gradient(90deg, #30363d 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      </div>

      {/* Header */}
      <div className="flex items-center p-6 sm:p-8 z-10 text-white font-semibold text-lg tracking-wide">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-3">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
        </svg>
        Render
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 sm:px-12 flex flex-col justify-start mt-8 sm:mt-16 z-10">
        
        <div className="space-y-4 mb-8 text-[#58a6ff]">
          <p>{currentTime} <span className="text-[#8b949e]">INCOMING HTTP REQUEST DETECTED ...</span></p>
          <p className="animate-pulse">{currentTime} <span className="text-[#8b949e]">SERVICE WAKING UP ...</span></p>
        </div>

        <div className="hidden sm:block whitespace-pre opacity-80" style={{ lineHeight: '1.1' }}>
          {asciiArt}
        </div>
        <div className="sm:hidden whitespace-pre opacity-80 text-[8px] leading-tight">
          {asciiArt}
        </div>

      </div>

      {/* Footer */}
      <div className="p-6 sm:p-8 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] sm:text-xs tracking-[0.15em] uppercase border-t border-[#30363d]">
        <div className="text-[#d2a8ff] mb-4 sm:mb-0 cursor-pointer hover:underline">
          Start building on Render today &rarr;
        </div>
        <div className="flex items-center text-[#8b949e]">
          <div className="w-3 h-3 border border-[#8b949e] border-t-transparent rounded-full animate-spin mr-3" />
          Application Loading
        </div>
      </div>

    </div>
  );
}
