import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '../search/CommandPalette';
import OnboardingWizard from '../help/OnboardingWizard';

export default function Layout() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const openSearch = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
        <Header onOpenSearch={openSearch} />
        <main className="flex-1 bg-propela-bg">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeSearch} />
      <OnboardingWizard />
    </div>
  );
}
