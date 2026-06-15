import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CommandPaletteProps {
  onSelect: (symbol: string) => void;
}

export default function CommandPalette({ onSelect }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSelect(query.trim().toUpperCase());
      setIsOpen(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0d0d10] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit} className="flex items-center px-4 border-b border-zinc-800">
          <span className="text-cyan-500 mr-3 font-mono font-bold">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol (e.g. AAPL, RELIANCE, ^NSEI)..."
            className="w-full bg-transparent border-none outline-none text-white py-4 font-mono text-sm placeholder-zinc-600"
          />
          <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded ml-2">ESC</span>
        </form>
        <div className="p-4 bg-[#09090b]">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center">
            Press Enter to switch active timeline
          </p>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
