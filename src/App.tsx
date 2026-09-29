import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { DevicesPage } from "./components/pages/DevicesPage";
import { NetworkInfoPage } from "./components/pages/NetworkInfoPage";
import { ScanHistoryPage } from "./components/pages/ScanHistoryPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import {
  NetworkDevice,
  NetworkInfo,
  ScanHistoryEntry,
  AppSettings,
  ScanProgress,
  PageId,
} from "./types";
import { api } from "./services/api";

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>("devices");
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: "dark",
    scanOnStartup: true,
    autoRefresh: false,
    scanIntervalMinutes: 5,
    pingDevices: true,
    notifyNewDevice: true,
    discoveryTimeoutMs: 1500,
    maxConcurrency: 64,
  });

  // Load Initial Settings & Network Info
  const loadInitialData = async () => {
    try {
      const net = await api.getNetworkInfo();
      setNetworkInfo(net);

      const savedSettings = await api.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }

      const savedHistory = await api.getScanHistory();
      if (savedHistory) {
        setHistory(savedHistory);
        // If history has a previous scan, load it initially
        if (savedHistory.length > 0 && devices.length === 0) {
          setDevices(savedHistory[0].devices);
          setLastScanTime(savedHistory[0].timestamp);
        }
      }

      // Automatically scan on startup if configured
      if (savedSettings?.scanOnStartup !== false) {
        executeScan();
      }
    } catch (e) {
      console.error("Initial load failed:", e);
    }
  };

  // Scan executor
  const executeScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress({ current: 0, total: 254, percentage: 5, phase: "Initializing network scan..." });

    try {
      // Re-check network adapter
      const net = await api.getNetworkInfo();
      setNetworkInfo(net);

      // Start actual discovery scan
      const results = await api.startScan(true);
      setDevices(results);
      setLastScanTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Reload scan history
      const updatedHistory = await api.getScanHistory();
      setHistory(updatedHistory);
    } catch (e) {
      console.error("Scan error:", e);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, [isScanning]);

  // Setup Event Listeners
  useEffect(() => {
    loadInitialData();

    // Listen to real-time scan progress
    const unlistenProgress = api.onScanProgress((prog) => {
      setScanProgress(prog);
    });

    // Listen to progressive device discoveries
    const unlistenDiscovered = api.onDeviceDiscovered((newDevice) => {
      setDevices((prev) => {
        const index = prev.findIndex((d) => d.id === newDevice.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newDevice;
          return updated;
        } else {
          return [...prev, newDevice];
        }
      });
    });

    // Listen to scan completion
    const unlistenCompleted = api.onScanCompleted((completedDevices) => {
      setDevices(completedDevices);
      setIsScanning(false);
      setScanProgress(null);
    });

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenDiscovered.then((fn) => fn());
      unlistenCompleted.then((fn) => fn());
    };
  }, []);

  // Keyboard Shortcuts (Section 35)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        executeScan();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeScan]);

  const handleUpdateDevice = (updated: NetworkDevice) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await api.saveSettings(newSettings);
  };

  const handleRefreshNetwork = async () => {
    const net = await api.getNetworkInfo();
    setNetworkInfo(net);
  };

  return (
    <div className="flex h-screen bg-[#0b0f19] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        networkInfo={networkInfo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar with Global Search */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => setCurrentPage("settings")}
          currentPage={currentPage}
          isScanning={isScanning}
        />

        {/* View Switcher */}
        <main className="flex-1 overflow-hidden bg-[#0a0e17]">
          {currentPage === "devices" && (
            <DevicesPage
              devices={devices}
              networkInfo={networkInfo}
              isScanning={isScanning}
              scanProgress={scanProgress}
              lastScanTime={lastScanTime}
              searchQuery={searchQuery}
              onScanAgain={executeScan}
              onUpdateDevice={handleUpdateDevice}
            />
          )}

          {currentPage === "network-info" && (
            <NetworkInfoPage
              networkInfo={networkInfo}
              onRefresh={handleRefreshNetwork}
              isRefreshing={false}
            />
          )}

          {currentPage === "history" && (
            <ScanHistoryPage
              history={history}
              onRefreshHistory={async () => {
                const h = await api.getScanHistory();
                setHistory(h);
              }}
            />
          )}

          {currentPage === "settings" && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
