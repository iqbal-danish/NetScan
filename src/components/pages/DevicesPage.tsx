import React, { useState, useMemo } from "react";
import { NetworkDevice, NetworkInfo, ScanProgress } from "../../types";
import { NetworkSummary } from "../devices/NetworkSummary";
import { DeviceFilters, FilterKey } from "../devices/DeviceFilters";
import { DeviceTable } from "../devices/DeviceTable";
import { DeviceDetailsPanel } from "../devices/DeviceDetailsPanel";
import { PingModal } from "../devices/PingModal";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Ban } from "lucide-react";
import { api } from "../../services/api";

interface DevicesPageProps {
  devices: NetworkDevice[];
  networkInfo: NetworkInfo | null;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  lastScanTime: string | null;
  searchQuery: string;
  onScanAgain: () => void;
  onUpdateDevice: (device: NetworkDevice) => void;
}

export const DevicesPage: React.FC<DevicesPageProps> = ({
  devices,
  networkInfo,
  isScanning,
  scanProgress,
  lastScanTime,
  searchQuery,
  onScanAgain,
  onUpdateDevice,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [pingDevice, setPingDevice] = useState<NetworkDevice | null>(null);

  // Synchronize selectedDevice when devices array updates
  const currentSelected = useMemo(() => {
    if (!selectedDevice) return null;
    return devices.find((d) => d.id === selectedDevice.id) || selectedDevice;
  }, [devices, selectedDevice]);

  // Detected active blacklisted devices on network
  const blacklistedOnlineDevices = useMemo(() => {
    return devices.filter((d) => d.statusTag === "blacklisted" && d.status === "online");
  }, [devices]);

  // Instant local filtering across multiple dimensions
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // 1. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (d.customName || d.displayName).toLowerCase().includes(q);
        const matchesIp = d.ipAddress.toLowerCase().includes(q);
        const matchesMac = (d.macAddress || "").toLowerCase().includes(q);
        const matchesVendor = (d.manufacturer || "").toLowerCase().includes(q);
        const matchesHost = (d.hostname || "").toLowerCase().includes(q);
        const matchesType = d.deviceType.toLowerCase().includes(q);

        if (!matchesName && !matchesIp && !matchesMac && !matchesVendor && !matchesHost && !matchesType) {
          return false;
        }
      }

      // 2. Category / Status filter
      switch (activeFilter) {
        case "online":
          return d.status === "online";
        case "wifi":
          return d.connectionType === "wifi";
        case "wired":
          return d.connectionType === "wired";
        case "new":
          return d.isNew;
        case "blacklisted":
          return d.statusTag === "blacklisted";
        case "routers":
          return d.deviceType === "router";
        case "computers":
          return d.deviceType === "desktop" || d.deviceType === "laptop";
        case "phones":
          return d.deviceType === "phone" || d.deviceType === "tablet";
        case "tvs":
          return d.deviceType === "tv";
        case "printers":
          return d.deviceType === "printer";
        case "iot":
          return d.deviceType === "iot" || d.deviceType === "smart_speaker";
        case "all":
        default:
          return true;
      }
    });
  }, [devices, searchQuery, activeFilter]);

  const handleToggleBlacklist = async (device: NetworkDevice) => {
    const newTag = device.statusTag === "blacklisted" ? "trusted" : "blacklisted";
    await api.setDeviceStatusTag(device.id, newTag);
    const updated: NetworkDevice = {
      ...device,
      statusTag: newTag,
    };
    onUpdateDevice(updated);
  };

  const handleOpenBrowser = async (device: NetworkDevice) => {
    const isHttps = device.openPorts?.some((p) => p.port === 443);
    const protocol = isHttps ? "https" : "http";
    const url = `${protocol}://${device.ipAddress}`;
    try {
      await openUrl(url);
    } catch (e) {
      console.warn("Failed to open URL via plugin-opener, falling back to window.open:", e);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Main scrolling table area */}
      <div className="flex-1 overflow-y-auto p-6">
        <NetworkSummary
          networkInfo={networkInfo}
          deviceCount={devices.length}
          isScanning={isScanning}
          scanProgress={scanProgress}
          lastScanTime={lastScanTime}
          onScanAgain={onScanAgain}
        />

        {/* Security Alert Banner for Blacklisted Devices */}
        {blacklistedOnlineDevices.length > 0 && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between gap-4 shadow-lg shadow-rose-950/40">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Ban size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-200">
                  Security Alert: {blacklistedOnlineDevices.length} Blacklisted {blacklistedOnlineDevices.length === 1 ? "Device" : "Devices"} Active on Network
                </h4>
                <p className="text-xs text-rose-300/80 mt-0.5 font-mono">
                  {blacklistedOnlineDevices.map((d) => `${d.customName || d.displayName} (${d.ipAddress})`).join(", ")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveFilter("blacklisted")}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-md transition-all"
            >
              View Blacklisted
            </button>
          </div>
        )}

        <DeviceFilters
          devices={devices}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <DeviceTable
          devices={filteredDevices}
          selectedDeviceId={currentSelected?.id || null}
          onSelectDevice={(device) => {
            if (currentSelected?.id === device.id) {
              setSelectedDevice(null);
            } else {
              setSelectedDevice(device);
            }
          }}
          onPingDevice={(device) => setPingDevice(device)}
          onOpenBrowser={handleOpenBrowser}
          onToggleBlacklist={handleToggleBlacklist}
          onScanAgain={onScanAgain}
          isScanning={isScanning}
        />
      </div>

      {/* Slide-over Right Details Panel */}
      {currentSelected && (
        <DeviceDetailsPanel
          device={currentSelected}
          onClose={() => setSelectedDevice(null)}
          onPing={(d) => setPingDevice(d)}
          onOpenBrowser={handleOpenBrowser}
          onUpdateDevice={onUpdateDevice}
        />
      )}

      {/* Ping Modal */}
      {pingDevice && (
        <PingModal
          device={pingDevice}
          onClose={() => setPingDevice(null)}
        />
      )}
    </div>
  );
};
