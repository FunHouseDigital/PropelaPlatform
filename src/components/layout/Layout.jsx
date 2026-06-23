import { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from '../search/CommandPalette';
import OnboardingWizard from '../help/OnboardingWizard';
import OfflineBanner from './OfflineBanner';
import InstallPrompt from './InstallPrompt';
import LoadingSpinner from './LoadingSpinner';
import KeyboardShortcutsPanel from '../accessibility/KeyboardShortcutsPanel';
import useMediaQuery from '../../hooks/useMediaQuery';

export default function Layout() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsPanelOpen, setIsShortcutsPanelOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  // null means "use default" (closed on mobile, open on desktop)
  const [sidebarOverride, setSidebarOverride] = useState(null);

  // Reset override when viewport changes
  const sidebarOpen = sidebarOverride !== null ? sidebarOverride : !isMobile;

  const openSearch = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOverride((prev) => {
      const current = prev !== null ? prev : !isMobile;
      return !current;
    });
  }, [isMobile]);

  const closeSidebar = useCallback(() => {
    setSidebarOverride(false);
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K and Shift+?
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsShortcutsPanelOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} isMobile={isMobile} />

      {/* Backdrop for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className={`flex-1 flex flex-col min-h-screen ${isMobile ? 'ml-0' : 'ml-[220px]'}`}>
        <OfflineBanner />
        <Header onOpenSearch={openSearch} onToggleSidebar={toggleSidebar} isMobile={isMobile} />
        <InstallPrompt />
        <main id="main-content" className="flex-1 bg-propela-bg">
          <div className={`p-4 md:p-8 ${isMobile ? 'pb-20' : ''}`}>
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav onOpenSidebar={toggleSidebar} />}

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeSearch} />
      <KeyboardShortcutsPanel isOpen={isShortcutsPanelOpen} onClose={() => setIsShortcutsPanelOpen(false)} />
      <OnboardingWizard />
    </div>
  );
}
