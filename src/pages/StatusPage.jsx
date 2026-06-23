import { useState, useEffect } from 'react';
import useOnlineStatus from '../hooks/useOnlineStatus';
import buildInfo from '../lib/buildInfo';
import appConfig from '../lib/config';

function getLocalStorageUsage() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += key.length + value.length;
    }
    return (total * 2) / 1024; // Approximate KB (UTF-16)
  } catch {
    return 0;
  }
}

function getServiceWorkerStatus() {
  if (!('serviceWorker' in navigator)) {
    return 'Not supported';
  }
  if (navigator.serviceWorker.controller) {
    return 'Active';
  }
  return 'Registered (no controller)';
}

export default function StatusPage() {
  const { isOnline } = useOnlineStatus();
  const [swStatus, setSwStatus] = useState('Checking...');
  const [storageUsage, setStorageUsage] = useState(0);
  const [lastCheck, setLastCheck] = useState(new Date().toISOString());

  useEffect(() => {
    setSwStatus(getServiceWorkerStatus());
    setStorageUsage(getLocalStorageUsage());
    setLastCheck(new Date().toISOString());
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Status</h1>

      <div className="space-y-4">
        <section className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">Application Info</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-600">Version</dt>
            <dd data-testid="app-version">{buildInfo.version}</dd>

            <dt className="text-gray-600">Build Timestamp</dt>
            <dd data-testid="build-timestamp">{buildInfo.buildTimestamp}</dd>

            <dt className="text-gray-600">Git Commit</dt>
            <dd data-testid="git-commit" className="font-mono text-xs">
              {buildInfo.gitCommit}
            </dd>

            <dt className="text-gray-600">Environment</dt>
            <dd data-testid="environment">{appConfig.environment}</dd>
          </dl>
        </section>

        <section className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">System Health</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-600">Network Status</dt>
            <dd data-testid="online-status">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isOnline
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </dd>

            <dt className="text-gray-600">Service Worker</dt>
            <dd data-testid="sw-status">{swStatus}</dd>

            <dt className="text-gray-600">localStorage Usage</dt>
            <dd data-testid="storage-usage">{storageUsage.toFixed(1)} KB</dd>

            <dt className="text-gray-600">Last Check</dt>
            <dd data-testid="last-check">{lastCheck}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
