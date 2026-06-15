'use client';

import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // Detect Android / Chrome PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-full duration-300">
      <div className="bg-slate-900 border-2 border-emerald-500/50 shadow-2xl rounded-sm p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
            Install MacroPulse OSINT
          </h3>
          <button onClick={() => setShowPrompt(false)} className="text-slate-500 font-bold px-2 py-1">
            ✕
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-mono leading-tight">
          {isIOS 
            ? "Install to Home Screen for full screen mode and zero-latency background syncing. Tap the Share icon, then 'Add to Home Screen'."
            : "Install as a native application for full screen layout and zero-latency background syncing."}
        </p>
        {!isIOS && (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-widest text-[10px] py-2 rounded-sm transition-colors mt-1"
          >
            INSTALL TO HOME SCREEN
          </button>
        )}
      </div>
    </div>
  );
}
