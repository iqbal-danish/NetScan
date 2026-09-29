import { useState, useEffect } from "react";
import { X, Activity, RefreshCw, AlertTriangle, Terminal } from "lucide-react";
import { NetworkDevice, PingDetails } from "../../types";
import { api } from "../../services/api";

interface PingModalProps {
  device: NetworkDevice;
  onClose: () => void;
}

export const PingModal: React.FC<PingModalProps> = ({ device, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PingDetails | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const runPing = async () => {
    setLoading(true);
    try {
      const data = await api.pingDevice(device.ipAddress);
      setResult(data);
    } catch (e) {
      console.error("Ping error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPing();
  }, [device.ipAddress]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#10172a] border border-[#1f2c4c] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1f2c4c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity size={17} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-100">
                Ping Results
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {device.displayName} ({device.ipAddress})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-[#18233d] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="py-10 text-center">
              <RefreshCw
                size={28}
                className="animate-spin text-emerald-400 mx-auto mb-3"
              />
              <p className="text-xs text-gray-300 font-medium">
                Sending 4 ICMP echo packets to {device.ipAddress}...
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Measuring round-trip latency and packet loss
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-[#152038] border border-[#213155] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider font-sans">
                    Transmitted
                  </span>
                  <span className="text-lg font-bold text-gray-100 mt-0.5 block">
                    {result.transmitted}
                  </span>
                </div>

                <div className="bg-[#152038] border border-[#213155] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider font-sans">
                    Received
                  </span>
                  <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                    {result.received}
                  </span>
                </div>

                <div className="bg-[#152038] border border-[#213155] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider font-sans">
                    Packet Loss
                  </span>
                  <span
                    className={`text-lg font-bold mt-0.5 block ${
                      result.packetLossPercent === 0
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {result.packetLossPercent}%
                  </span>
                </div>
              </div>

              {/* Latency Stats */}
              <div className="bg-[#152038] border border-[#213155] p-3.5 rounded-xl font-mono text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Average Latency:</span>
                  <span className="text-emerald-400 font-bold">
                    {result.avgMs !== undefined && result.avgMs !== null ? `${result.avgMs} ms` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Minimum Latency:</span>
                  <span className="text-gray-200">
                    {result.minMs !== undefined && result.minMs !== null ? `${result.minMs} ms` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Maximum Latency:</span>
                  <span className="text-gray-200">
                    {result.maxMs !== undefined && result.maxMs !== null ? `${result.maxMs} ms` : "N/A"}
                  </span>
                </div>
              </div>

              {/* Raw Terminal Output Toggle */}
              <div>
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  <Terminal size={13} />
                  <span>{showRaw ? "Hide terminal output" : "Show terminal output"}</span>
                </button>

                {showRaw && (
                  <pre className="mt-2 p-3 bg-black/60 border border-[#213155] rounded-xl text-[11px] font-mono text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {result.rawOutput}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-rose-400 text-xs">
              <AlertTriangle size={24} className="mx-auto mb-2" />
              Failed to get ping response from device.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1f2c4c] bg-[#0c1221] flex justify-end gap-2">
          <button
            onClick={runPing}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233d] hover:bg-[#202e4d] text-gray-200 text-xs font-medium cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Ping Again</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
