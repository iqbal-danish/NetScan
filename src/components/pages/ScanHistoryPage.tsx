import { useState } from "react";
import {
  History,
  Clock,
  Star,
  RefreshCw,
} from "lucide-react";
import { ScanHistoryEntry } from "../../types";
import { DeviceIcon } from "../devices/DeviceIcon";

interface ScanHistoryPageProps {
  history: ScanHistoryEntry[];
  onRefreshHistory?: () => void;
}

export const ScanHistoryPage: React.FC<ScanHistoryPageProps> = ({
  history,
  onRefreshHistory,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<ScanHistoryEntry | null>(
    history[0] || null
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex select-none">
      {/* Left: Scan Timeline List */}
      <div className="w-80 border-r border-[#1a233a] bg-[#0c1221] overflow-y-auto flex flex-col shrink-0">
        <div className="p-4 border-b border-[#1a233a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-blue-400" />
            <h3 className="font-bold text-sm text-gray-100">Scan Sessions</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">
              {history.length} saved
            </span>
            {onRefreshHistory && (
              <button
                onClick={onRefreshHistory}
                className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-[#18233d] transition-colors cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="p-3 space-y-2 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              <Clock size={24} className="mx-auto mb-2 text-gray-400" />
              No scans recorded yet. Perform a scan on the Devices page!
            </div>
          ) : (
            history.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/40 shadow-sm"
                      : "bg-[#12192c] border-[#1e2a47] hover:bg-[#162038]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-200">
                      {entry.timestamp}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {entry.networkCidr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="font-medium text-blue-400">
                      {entry.deviceCount} {entry.deviceCount === 1 ? "device" : "devices"}
                    </span>
                    {entry.newDevicesCount > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                        <Star size={9} className="fill-amber-400" />
                        +{entry.newDevicesCount} new
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">No changes</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Selected Scan Snapshot Details */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#090d18]">
        {selectedEntry ? (
          <div>
            {/* Snapshot Header */}
            <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-5 mb-5 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block">
                  Scan Snapshot
                </span>
                <h3 className="text-base font-bold text-gray-100 mt-0.5">
                  {selectedEntry.ssid || "Local Subnet"} ({selectedEntry.networkCidr})
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Recorded on {selectedEntry.timestamp}
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-blue-400 block">
                  {selectedEntry.deviceCount}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  Devices Active
                </span>
              </div>
            </div>

            {/* Devices snapshot table */}
            <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1e2a47] bg-[#0e1424] text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">MAC Address</th>
                    <th className="py-3 px-4">Manufacturer</th>
                    <th className="py-3 px-4">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#172138]">
                  {selectedEntry.devices.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-[#152038] transition-colors">
                      <td className="py-2.5 px-4 text-center font-mono text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#18233d] border border-[#223154] flex items-center justify-center text-blue-400 shrink-0">
                            <DeviceIcon type={d.deviceType} size={14} />
                          </div>
                          <span className="font-semibold text-gray-200">
                            {d.customName || d.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-gray-300">
                        {d.ipAddress}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-gray-400 text-[11px]">
                        {d.macAddress || "Unknown"}
                      </td>
                      <td className="py-2.5 px-4 text-gray-300">
                        {d.manufacturer || "Unknown"}
                      </td>
                      <td className="py-2.5 px-4 capitalize text-gray-400">
                        {d.deviceType.replace("_", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
            <History size={40} className="mb-3 text-gray-400" />
            <p>Select a scan session from the left to view device snapshot.</p>
          </div>
        )}
      </div>
    </div>
  );
};
