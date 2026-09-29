import { RefreshCw, Wifi, Network, CheckCircle2, Clock } from "lucide-react";
import { NetworkInfo, ScanProgress } from "../../types";

interface NetworkSummaryProps {
  networkInfo: NetworkInfo | null;
  deviceCount: number;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  lastScanTime: string | null;
  onScanAgain: () => void;
}

export const NetworkSummary: React.FC<NetworkSummaryProps> = ({
  networkInfo,
  deviceCount,
  isScanning,
  scanProgress,
  lastScanTime,
  onScanAgain,
}) => {
  const isWifi = networkInfo?.interfaceType === "Wi-Fi";
  const networkTitle =
    networkInfo?.ssid || networkInfo?.interfaceName || "Local Network";

  return (
    <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-5 mb-5 shadow-lg shadow-black/20 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Network Identity */}
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            {isWifi ? <Wifi size={28} /> : <Network size={28} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100 tracking-tight">
                {networkTitle}
              </h2>
              {networkInfo?.internetAccess && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 font-mono">
              <span>{networkInfo?.networkCidr || "192.168.1.0/24"}</span>
              <span className="text-gray-600">•</span>
              <span>
                Gateway: {networkInfo?.gatewayIp ? networkInfo.gatewayIp : "None"}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Device Count Pill */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-[#172138] border border-[#213052] shrink-0 self-start md:self-auto">
          <div className="text-2xl font-black text-blue-400 font-mono">
            {deviceCount}
          </div>
          <div className="text-xs">
            <span className="block font-semibold text-gray-200">
              {deviceCount === 1 ? "Device" : "Devices"}
            </span>
            <span className="text-[11px] text-gray-400">Discovered</span>
          </div>
        </div>

        {/* Right: Scan Status & Button */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            {isScanning ? (
              <div>
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Scanning network...
                </span>
                <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                  {scanProgress
                    ? `${scanProgress.current} / ${scanProgress.total}`
                    : "Initializing..."}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 justify-end">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Scan completed
                </span>
                <span className="text-[11px] text-gray-400 block mt-0.5 flex items-center gap-1 justify-end">
                  <Clock size={11} />
                  {lastScanTime || "Just now"}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onScanAgain}
            disabled={isScanning}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${
              isScanning
                ? "bg-blue-600/50 text-blue-200 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-97"
            }`}
          >
            <RefreshCw
              size={15}
              className={isScanning ? "animate-spin" : ""}
            />
            <span>{isScanning ? "Scanning..." : "Scan Again"}</span>
          </button>
        </div>
      </div>

      {/* Animated scan progress bar */}
      {isScanning && (
        <div className="mt-4 pt-3 border-t border-[#1e2a47]/70">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-medium text-blue-300">
              {scanProgress?.phase || "Scanning subnet..."}
            </span>
            <span className="font-mono text-gray-300">
              {scanProgress?.percentage || 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#172138] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(5, scanProgress?.percentage || 0)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
