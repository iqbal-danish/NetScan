import React, { useState, useMemo } from "react";
import { NetworkDevice, NetworkInfo, ScanProgress } from "../../types";
import { NetworkSummary } from "../devices/NetworkSummary";
import { DeviceFilters, FilterKey } from "../devices/DeviceFilters";
import { DeviceTable } from "../devices/DeviceTable";
import { DeviceDetailsPanel } from "../devices/DeviceDetailsPanel";
import { PingModal } from "../devices/PingModal";
import { openUrl } from "@tauri-apps/plugin-opener";

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
