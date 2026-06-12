import React from 'react';

interface FilterBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = ['All', 'Energy', 'Metals', 'Forex', 'Equities', 'High Risk'];

export default function FilterBar({
  selectedCategory,
  onSelectCategory,
}: FilterBarProps) {
  return (
    <div className="w-full border-b border-zinc-800 bg-[#0D0D0D] py-3 sticky top-0 z-10">
      <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide whitespace-nowrap">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition duration-150 uppercase border ${
                isActive
                  ? 'bg-white text-black border-white'
                  : 'bg-[#1A1A1A] text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {category === 'High Risk' ? '⚠️ High Risk' : category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
