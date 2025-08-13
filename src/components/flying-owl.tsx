
'use client';

import { useState, useEffect } from 'react';
import OwlIcon from './icons/owl-icon';
import { cn } from '@/lib/utils';

const FlyingOwl = () => {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState({});

  useEffect(() => {
    const showOwl = () => {
      const direction = Math.random() > 0.5 ? 'left' : 'right';
      const top = Math.random() * 60 + 10; // 10% to 70% from top
      const duration = Math.random() * 10 + 10; // 10s to 20s

      setStyle({
        top: `${top}%`,
        animationDuration: `${duration}s`,
        transform: direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
        left: direction === 'left' ? '0' : 'auto',
        right: direction === 'right' ? '0' : 'auto',
      });
      setShow(true);

      setTimeout(() => {
        setShow(false);
      }, duration * 1000);
    };

    let timeoutId: NodeJS.Timeout;
    const scheduleNextOwl = () => {
      const delay = Math.random() * 20000 + 10000; // 10s to 30s
      timeoutId = setTimeout(() => {
        showOwl();
        scheduleNextOwl();
      }, delay);
    };
    
    // Start the first owl after a short delay
    const initialTimeoutId = setTimeout(scheduleNextOwl, 5000);

    return () => {
      clearTimeout(initialTimeoutId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      className={cn(
        'fixed z-50 pointer-events-none transition-opacity duration-500',
        show ? 'opacity-100' : 'opacity-0',
        show && 'animate-fly-across'
      )}
      style={style}
    >
      <OwlIcon className="w-16 h-16 text-primary/80" />
    </div>
  );
};

export default FlyingOwl;
