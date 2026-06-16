import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function RenderLoadingScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="flex flex-col items-center z-10 space-y-6">
        
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{ 
            borderColor: 'var(--muted)', 
            borderTopColor: 'var(--primary)' 
          }}
        />

        {/* Text */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold tracking-wide" style={{ color: 'var(--foreground)' }}>
            Waking up servers{dots}
          </h2>
          <p className="text-sm max-w-sm px-4" style={{ color: 'var(--muted-foreground)' }}>
            Please hold on while we spin up the backend infrastructure. This usually takes about 30 seconds on the first load.
          </p>
        </div>

      </div>
    </div>
  );
}
