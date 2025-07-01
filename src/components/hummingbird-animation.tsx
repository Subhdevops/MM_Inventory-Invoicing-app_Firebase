'use client';

import { useState, useEffect } from 'react';

export default function HummingbirdAnimation() {
  const [visible, setVisible] = useState(true);

  // The animation duration is 15s. Hide the component after 16s.
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 16000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="hummingbird">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="h-20 w-20"
        >
          <defs>
            <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#8A2BE2' }} />
              <stop offset="100%" style={{ stopColor: '#FF1493' }} />
            </linearGradient>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#00BFFF' }} />
              <stop offset="100%" style={{ stopColor: '#32CD32' }} />
            </linearGradient>
             <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
          </defs>
          {/* Left Wing */}
          <path
            className="wing left-wing"
            d="M 50,50 C 10,30 20,0 50,20 Z"
            fill="url(#wingGradient)"
            filter="url(#glow)"
          />
          {/* Right Wing */}
          <path
            className="wing right-wing"
            d="M 50,50 C 90,30 80,0 50,20 Z"
            fill="url(#wingGradient)"
            filter="url(#glow)"
          />
          {/* Body */}
          <path
            d="M 50,20 C 60,30 70,60 50,90 C 30,60 40,30 50,20 Z"
            fill="url(#bodyGradient)"
            filter="url(#glow)"
          />
          {/* Beak */}
          <path d="M 50,20 L 70,10 L 52,18 Z" fill="#333" />
        </svg>
      </div>
    </div>
  );
}
