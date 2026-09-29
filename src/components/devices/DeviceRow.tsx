import React from "react";
import {
  Wifi,
  Network,
  ExternalLink,
  Activity,
  ChevronRight,
  Star,
  Shield,
  Ban,
} from "lucide-react";
import { NetworkDevice } from "../../types";
import { DeviceIcon } from "./DeviceIcon";

interface DeviceRowProps {
  device: NetworkDevice;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPing: () => void;
  onOpenBrowser: () => void;
  onToggleBlacklist: () => void;
}

export const DeviceRow: React.FC<DeviceRowProps> = ({
  device,
  index,
  isSelected,
  onSelect,
  onPing,
  onOpenBrowser,
  onToggleBlacklist,
}) => {
  const isRouter = device.deviceType === "router";
  const hasWeb =
    isRouter || device.openPorts?.some((p) => p.port === 80 || p.port === 443);
  const isWifi = device.connectionType === "wifi";
  const isBlacklisted = device.statusTag === "blacklisted";

  return (
    <tr
      onClick={onSelect}
      className={`border-b border-[#172138] transition-colors cursor-pointer select-none group ${
        isSelected
          ? "bg-blue-600/15 border-blue-500/30"
          : isBlacklisted
          ? "bg-rose-950/20 border-rose-500/30 hover:bg-rose-900/30"
          : "hover:bg-[#131b2e]"
      }`}
    >
      {/* Index */}
      <td className="py-3 px-4 text-xs font-mono text-gray-400 w-12 text-center">
        {index + 1}
      </td>

      {/* Device Name & Icon */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isSelected
                ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30"
                : isBlacklisted
                ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                : "bg-[#18233d] border-[#223154] text-blue-400 group-hover:border-blue-500/40"
            }`}
          >
            <DeviceIcon type={device.deviceType} size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-xs truncate block max-w-xs ${isBlacklisted ? "text-rose-200" : "text-gray-100"}`}>
                {device.customName || device.displayName}
              </span>
              {device.statusTag === "blacklisted" && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded">
                  <Ban size={9} />
                  BLACKLISTED
                </span>
              )}
              {device.isNew && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                  <Star size={9} className="fill-amber-400" />
                  NEW
                </span>
              )}
              {device.statusTag === "trusted" && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                  <Shield size={9} />
                  Trusted
                </span>
              )}
            </div>
            {device.hostname && (
              <span className="text-[11px] text-gray-400 font-mono truncate block max-w-xs">
                {device.hostname}
              </span>
            )}
            {device.openPorts && device.openPorts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {device.openPorts.slice(0, 3).map((p) => (
                  <span
                    key={p.port}
                    className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {p.serviceName}:{p.port}
                  </span>
                ))}
                {device.openPorts.length > 3 && (
                  <span className="text-[9px] font-mono text-gray-400">
                    +{device.openPorts.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* IP Address */}
      <td className="py-3 px-4">
        <span className="text-xs font-mono text-gray-200 bg-[#162035] border border-[#202e4d] px-2 py-1 rounded-md">
          {device.ipAddress}
        </span>
      </td>

      {/* Manufacturer */}
      <td className="py-3 px-4">
        {device.manufacturer?.includes("Private MAC") ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md"
            title="Locally administered randomized MAC address used by modern mobile OSes for Wi-Fi privacy"
          >
            Private MAC (Mobile)
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-200">
            {device.manufacturer || "Unknown"}
          </span>
        )}
      </td>

      {/* Connection Type */}
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
            isWifi
              ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
              : "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
          }`}
        >
          {isWifi ? <Wifi size={12} /> : <Network size={12} />}
          {isWifi ? "Wi-Fi" : "Wired"}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          Online
        </span>
      </td>

      {/* Response Time */}
      <td className="py-3 px-4 text-xs font-mono text-gray-400">
        {device.responseTime !== undefined && device.responseTime !== null ? (
          <span className="text-gray-300">{device.responseTime} ms</span>
        ) : (
          <span className="text-gray-400">&lt; 1 ms</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {hasWeb && (
            <button
              onClick={onOpenBrowser}
              title="Open in Browser"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-[#18233d] transition-colors cursor-pointer"
            >
              <ExternalLink size={14} />
            </button>
          )}

          <button
            onClick={onPing}
            title="Ping Device"
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-[#18233d] transition-colors cursor-pointer"
          >
            <Activity size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBlacklist();
            }}
            title={isBlacklisted ? "Remove from Blacklist" : "Blacklist Device"}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isBlacklisted
                ? "text-rose-400 bg-rose-500/15 hover:bg-rose-500/30"
                : "text-gray-400 hover:text-rose-400 hover:bg-[#18233d]"
            }`}
          >
            <Ban size={14} />
          </button>

          <button
            onClick={onSelect}
            title="Device Details"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-[#18233d] transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};
