import { WifiOff } from 'lucide-react';
import useOnlineStatus from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top duration-300">
      <WifiOff className="w-4 h-4" />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}
