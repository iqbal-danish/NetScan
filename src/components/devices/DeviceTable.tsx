import React from "react";
import { NetworkDevice } from "../../types";
import { DeviceRow } from "./DeviceRow";
import { SearchX, Radio } from "lucide-react";

interface DeviceTableProps {
  devices: NetworkDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (device: NetworkDevice) => void;
  onPingDevice: (device: NetworkDevice) => void;
  onOpenBrowser: (device: NetworkDevice) => void;
  onScanAgain: () => void;
  isScanning: boolean;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onPingDevice,
  onOpenBrowser,
  onScanAgain,
  isScanning,
}) => {
  if (devices.length === 0) {
    return (
      <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-12 text-center select-none shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-4">
          <SearchX size={32} />
        </div>
        <h3 className="text-base font-bold text-gray-100 mb-1">
          No devices found
        </h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5 leading-relaxed">
          Make sure you're connected to the Wi-Fi or Ethernet network and try scanning again.
        </p>
        <button
          onClick={onScanAgain}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Radio size={16} className={isScanning ? "animate-spin" : ""} />
          <span>{isScanning ? "Scanning Network..." : "Start Scan"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1e2a47] bg-[#0f1526]/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider select-none">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Device Name</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Manufacturer</th>
              <th className="py-3 px-4">Connection</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Response</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device, index) => (
              <DeviceRow
                key={device.id}
                device={device}
                index={index}
                isSelected={selectedDeviceId === device.id}
                onSelect={() => onSelectDevice(device)}
                onPing={() => onPingDevice(device)}
                onOpenBrowser={() => onOpenBrowser(device)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      <div className="p-3 bg-[#0f1526]/80 border-t border-[#1e2a47] flex items-center justify-between text-xs text-gray-400 select-none px-4">
        <span>Showing {devices.length} {devices.length === 1 ? "device" : "devices"}</span>
        <span className="text-[11px] text-gray-400">
          Some devices may not respond due to local firewall or client isolation
        </span>
      </div>
    </div>
  );
};
