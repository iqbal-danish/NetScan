import React from "react";
import {
  Monitor,
  Globe,
  History,
  Settings,
  Wifi,
  Radio,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { NetworkInfo, PageId } from "../../types";

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  networkInfo: NetworkInfo | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  networkInfo,
}) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: "devices", label: "Devices", icon: <Monitor size={18} /> },
    { id: "network-info", label: "Network Info", icon: <Globe size={18} /> },
    { id: "history", label: "Scan History", icon: <History size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const networkName =
    networkInfo?.ssid || networkInfo?.interfaceName || "Local Network";
  const isWifi = networkInfo?.interfaceType === "Wi-Fi";
  const isOnline = networkInfo?.internetAccess;

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-[#1a233a] flex flex-col justify-between shrink-0 h-screen select-none">
      {/* Brand & Logo */}
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-[#1a233a]/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              NetScan
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Network Device Scanner
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                    : "text-gray-400 hover:text-gray-100 hover:bg-[#161f36]"
                }`}
              >
                <span
                  className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Network Status Card at the Bottom */}
      <div className="p-3 m-3 rounded-xl bg-[#131b2e] border border-[#1e2a47] text-xs">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            {isWifi ? <Wifi size={16} /> : <Globe size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
              Connected to
            </span>
            <span
              className="text-gray-100 font-semibold truncate block text-xs"
              title={networkName}
            >
              {networkName}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#1a233a] font-mono text-[11px] text-gray-400">
          <div className="flex justify-between">
            <span className="text-gray-400">Subnet:</span>
            <span className="text-gray-200">{networkInfo?.networkCidr || "Detecting..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Local IP:</span>
            <span className="text-gray-200">{networkInfo?.localIp || "..."}</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#1a233a] flex items-center gap-1.5 text-[11px]">
          {isOnline ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-medium">Internet Access</span>
            </>
          ) : networkInfo?.isConnected ? (
            <>
              <AlertCircle size={13} className="text-amber-400 shrink-0" />
              <span className="text-amber-400 font-medium">Local Network Only</span>
            </>
          ) : (
            <>
              <XCircle size={13} className="text-rose-400 shrink-0" />
              <span className="text-rose-400 font-medium">Disconnected</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
