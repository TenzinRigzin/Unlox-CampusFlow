'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark as requested by standard campusflow aesthetics

  useEffect(() => {
    // Check local storage or system preferences on mount
    const savedTheme = localStorage.getItem('campusflow_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark'; // default to dark if nothing saved
    setTheme(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('campusflow_theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-[99] p-3 rounded-full border border-purple-500/25 bg-[#121624]/80 backdrop-blur-md shadow-2xl hover:scale-110 active:scale-95 transition-all text-lg flex items-center justify-center cursor-pointer text-purple-300 hover:text-purple-200"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
