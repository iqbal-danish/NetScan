import { useState } from "react";
import {
  Wifi,
  Network,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { NetworkInfo } from "../../types";

interface NetworkInfoPageProps {
  networkInfo: NetworkInfo | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const NetworkInfoPage: React.FC<NetworkInfoPageProps> = ({
  networkInfo,
  onRefresh,
  isRefreshing,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const isWifi = networkInfo?.interfaceType === "Wi-Fi";
  const ssid = networkInfo?.ssid || "N/A (Ethernet)";

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto p-8 max-w-4xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 tracking-tight">
            Network Information
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Active interface configuration and network gateway telemetry
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#152038] hover:bg-[#1d2c4d] border border-[#233355] text-gray-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? "animate-spin text-blue-400" : ""}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Status"}</span>
        </button>
      </div>

      {/* Main Network Hero Card */}
      <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-6 mb-6 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            {isWifi ? <Wifi size={30} /> : <Network size={30} />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-gray-100">
                {networkInfo?.ssid || networkInfo?.interfaceName || "Local Network"}
              </h3>
              <span
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  networkInfo?.internetAccess
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                {networkInfo?.internetAccess ? (
                  <>
                    <CheckCircle2 size={12} />
                    Internet Connected
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    No Internet
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Active Adapter: <span className="text-gray-200 font-medium">{networkInfo?.interfaceName || "Unknown"}</span> ({networkInfo?.interfaceType || "Local"})
            </p>
          </div>
        </div>

        {/* Network Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* SSID */}
          <div className="bg-[#162035] border border-[#202e4d] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[11px]">Wi-Fi SSID</span>
              <span className="font-semibold text-gray-100 font-mono mt-0.5 block">
                {ssid}
              </span>
            </div>
            {networkInfo?.ssid && (
              <button
                onClick={() => copyText(networkInfo.ssid!, "ssid")}
                className="text-gray-400 hover:text-blue-400 cursor-pointer"
              >
                {copiedField === "ssid" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          {/* Interface Type */}
          <div className="bg-[#162035] border border-[#202e4d] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[11px]">Interface Type</span>
              <span className="font-semibold text-gray-100 mt-0.5 block flex items-center gap-1.5">
                {isWifi ? <Wifi size={14} className="text-blue-400" /> : <Network size={14} className="text-indigo-400" />}
                {networkInfo?.interfaceType || "Ethernet"}
              </span>
            </div>
            {networkInfo?.signalStrength !== undefined && (
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                Signal: {networkInfo.signalStrength}%
              </span>
            )}
          </div>

          {/* Local IP */}
          <div className="bg-[#162035] border border-[#202e4d] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[11px]">Local IP Address</span>
              <span className="font-semibold text-blue-400 font-mono mt-0.5 block">
                {networkInfo?.localIp || "192.168.1.40"}
              </span>
            </div>
            <button
              onClick={() => copyText(networkInfo?.localIp || "", "ip")}
              className="text-gray-400 hover:text-blue-400 cursor-pointer"
            >
              {copiedField === "ip" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Subnet Mask */}
          <div className="bg-[#162035] border border-[#202e4d] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[11px]">Subnet Mask</span>
              <span className="font-semibold text-gray-200 font-mono mt-0.5 block">
                {networkInfo?.subnetMask || "255.255.255.0"}
              </span>
            </div>
            <button
              onClick={() => copyText(networkInfo?.subnetMask || "", "mask")}
              className="text-gray-400 hover:text-blue-400 cursor-pointer"
            >
              {copiedField === "mask" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Network CIDR */}
          <div className="bg-[#162035] border border-[#202e4d] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[11px]">Network CIDR Subnet</span>
              <span className="font-semibold text-indigo-400 font-mono mt-0.5 block">
                {networkInfo?.networkCidr || "192.168.1.0/24"}
              </span>
            </div>
            <button
              onClick={() => copyText(networkInfo?.networkCidr || "", "cidr")}
              className="text-gray-400 hover:text-blue-400 cursor-pointer"
            >
              {copiedField === "cidr" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Gateway */}
          <div className="bg-[#162035] border border-[#202e4d] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[11px]">Default Gateway</span>
              <span className="font-semibold text-emerald-400 font-mono mt-0.5 block">
                {networkInfo?.gatewayIp || "192.168.1.1"}
              </span>
            </div>
            <button
              onClick={() => copyText(networkInfo?.gatewayIp || "", "gw")}
              className="text-gray-400 hover:text-blue-400 cursor-pointer"
            >
              {copiedField === "gw" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* DNS Servers List */}
        <div className="mt-4 p-4 rounded-xl bg-[#162035] border border-[#202e4d]">
          <span className="text-gray-400 block text-[11px] mb-2 font-medium uppercase tracking-wider">
            DNS Servers
          </span>
          <div className="flex flex-wrap gap-2">
            {networkInfo?.dnsServers && networkInfo.dnsServers.length > 0 ? (
              networkInfo.dnsServers.map((dns, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#11192a] border border-[#1e2c4a] font-mono text-xs text-gray-200"
                >
                  <Server size={13} className="text-blue-400" />
                  <span>{dns}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-400">192.168.1.1</span>
            )}
          </div>
        </div>
      </div>

      {/* Network Accuracy Notice */}
      <div className="p-4 rounded-xl bg-[#10172a] border border-[#1b2640] flex items-start gap-3 text-xs text-gray-400">
        <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-gray-200">Local-First Transparency:</strong> NetScan inspects local network telemetry without transmitting any network configuration, SSIDs, or MAC addresses to external servers. Signal strength and SSID are fetched directly from your operating system's network driver.
        </p>
      </div>
    </div>
  );
};
