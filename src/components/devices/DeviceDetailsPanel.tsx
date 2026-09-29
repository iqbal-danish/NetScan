import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Activity,
  Copy,
  Check,
  Edit2,
  Shield,
  ShieldAlert,
  ShieldOff,
  Wifi,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { NetworkDevice, ServiceInfo, StatusTag } from "../../types";
import { DeviceIcon } from "./DeviceIcon";
import { api } from "../../services/api";

interface DeviceDetailsPanelProps {
  device: NetworkDevice;
  onClose: () => void;
  onPing: (device: NetworkDevice) => void;
  onOpenBrowser: (device: NetworkDevice) => void;
  onUpdateDevice: (updated: NetworkDevice) => void;
}

export const DeviceDetailsPanel: React.FC<DeviceDetailsPanelProps> = ({
  device,
  onClose,
  onPing,
  onOpenBrowser,
  onUpdateDevice,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(device.customName || device.displayName);
  const [isDiscoveringServices, setIsDiscoveringServices] = useState(false);
  const [services, setServices] = useState<ServiceInfo[]>(device.openPorts || []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSaveCustomName = async () => {
    const trimmed = nameInput.trim();
    await api.setDeviceCustomName(device.id, trimmed);
    const updated = {
      ...device,
      customName: trimmed.length > 0 ? trimmed : undefined,
    };
    onUpdateDevice(updated);
    setIsEditingName(false);
  };

  const handleSetStatusTag = async (tag: StatusTag) => {
    await api.setDeviceStatusTag(device.id, tag);
    const updated = {
      ...device,
      statusTag: tag,
    };
    onUpdateDevice(updated);
  };

  const handleDiscoverServices = async () => {
    setIsDiscoveringServices(true);
    try {
      const found = await api.discoverServices(device.ipAddress);
      setServices(found);
      const updated = {
        ...device,
        openPorts: found,
      };
      onUpdateDevice(updated);
    } catch (e) {
      console.error("Failed to discover services:", e);
    } finally {
      setIsDiscoveringServices(false);
    }
  };

  const isRouter = device.deviceType === "router";
  const hasWeb =
    isRouter || services.some((p) => p.port === 80 || p.port === 443);
  const isWifi = device.connectionType === "wifi";

  return (
    <aside className="w-96 bg-[#0f1628] border-l border-[#1c2742] flex flex-col h-full shrink-0 select-none shadow-2xl z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-[#1c2742] flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            <DeviceIcon type={device.deviceType} size={24} />
          </div>
          <div className="min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="bg-[#18233d] border border-blue-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-36"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCustomName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <button
                  onClick={handleSaveCustomName}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="px-2 py-1 rounded bg-[#1e2a47] text-gray-300 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-100 truncate block">
                  {device.customName || device.displayName}
                </h3>
                <button
                  onClick={() => {
                    setNameInput(device.customName || device.displayName);
                    setIsEditingName(true);
                  }}
                  title="Rename device locally"
                  className="text-gray-400 hover:text-blue-400 cursor-pointer p-0.5"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 capitalize">
                {device.deviceType.replace("_", " ")}
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-[#18233d] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Trust Status Tag Selector */}
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-2">
            Device Trust Status
          </span>
          <div className="grid grid-cols-3 gap-1.5 bg-[#141c30] p-1 rounded-xl border border-[#1e2a47]">
            <button
              onClick={() => handleSetStatusTag("trusted")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                device.statusTag === "trusted"
                  ? "bg-emerald-600 text-white font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Shield size={13} />
              <span>Trusted</span>
            </button>

            <button
              onClick={() => handleSetStatusTag("unknown")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                device.statusTag === "unknown" || !device.statusTag
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <ShieldAlert size={13} />
              <span>Unknown</span>
            </button>

            <button
              onClick={() => handleSetStatusTag("ignored")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                device.statusTag === "ignored"
                  ? "bg-gray-700 text-white font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <ShieldOff size={13} />
              <span>Ignore</span>
            </button>
          </div>
        </div>

        {/* Device Information Card */}
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-2">
            Device Information
          </span>
          <div className="bg-[#141c30] border border-[#1e2a47] rounded-xl divide-y divide-[#1e2a47] text-xs">
            {/* IP Address */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">IP Address</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200">{device.ipAddress}</span>
                <button
                  onClick={() => copyToClipboard(device.ipAddress, "ip")}
                  className="text-gray-400 hover:text-blue-400 cursor-pointer"
                  title="Copy IP"
                >
                  {copiedField === "ip" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* MAC Address */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">MAC Address</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200">
                  {device.macAddress || "Unknown"}
                </span>
                {device.macAddress && (
                  <button
                    onClick={() => copyToClipboard(device.macAddress!, "mac")}
                    className="text-gray-400 hover:text-blue-400 cursor-pointer"
                    title="Copy MAC"
                  >
                    {copiedField === "mac" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            {/* Manufacturer */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">Manufacturer</span>
              <span className="font-medium text-gray-200">
                {device.manufacturer || "Unknown"}
              </span>
            </div>

            {/* Connection */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">Connection</span>
              <span className="flex items-center gap-1 text-gray-200 font-medium">
                {isWifi ? <Wifi size={13} className="text-blue-400" /> : <Network size={13} className="text-indigo-400" />}
                {isWifi ? "Wi-Fi" : "Wired"}
              </span>
            </div>

            {/* Hostname */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">Hostname</span>
              <span className="font-mono text-gray-200 truncate max-w-[180px]" title={device.hostname}>
                {device.hostname || "None"}
              </span>
            </div>

            {/* Response Time */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">Response Time</span>
              <span className="font-mono text-gray-200">
                {device.responseTime !== undefined ? `${device.responseTime} ms` : "< 1 ms"}
              </span>
            </div>

            {/* First Seen */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-gray-400">First Seen</span>
              <span className="text-gray-300 font-mono text-[11px]">
                {device.firstSeen || "Just now"}
              </span>
            </div>
          </div>
        </div>

        {/* Open Services Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block">
              Open Services
            </span>
            <button
              onClick={handleDiscoverServices}
              disabled={isDiscoveringServices}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
            >
              <Search size={12} className={isDiscoveringServices ? "animate-spin" : ""} />
              <span>{isDiscoveringServices ? "Probing..." : "Scan Services"}</span>
            </button>
          </div>

          <div className="bg-[#141c30] border border-[#1e2a47] rounded-xl overflow-hidden divide-y divide-[#1e2a47] text-xs">
            {services.length > 0 ? (
              services.map((svc) => (
                <div
                  key={svc.port}
                  className="p-3 flex items-center justify-between hover:bg-[#19243d] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-blue-400 w-12">
                      {svc.port}
                    </span>
                    <span className="text-gray-200 font-medium">
                      {svc.serviceName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {svc.protocol}
                    </span>
                  </div>
                  {(svc.port === 80 || svc.port === 443 || svc.port === 8080 || svc.port === 8443) && (
                    <button
                      onClick={() => onOpenBrowser(device)}
                      className="text-gray-400 hover:text-blue-400 cursor-pointer"
                      title="Open in Browser"
                    >
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400">
                <p className="text-xs">No open services probed yet.</p>
                <button
                  onClick={handleDiscoverServices}
                  disabled={isDiscoveringServices}
                  className="mt-2 text-xs text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Discover services on this device</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 border-t border-[#1c2742] space-y-2 bg-[#0d1322]">
        {hasWeb && (
          <button
            onClick={() => onOpenBrowser(device)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>Open in Browser</span>
          </button>
        )}

        <button
          onClick={() => onPing(device)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#172138] hover:bg-[#1e2a47] border border-[#233254] text-gray-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Activity size={14} className="text-emerald-400" />
          <span>Ping Device</span>
        </button>
      </div>
    </aside>
  );
};
