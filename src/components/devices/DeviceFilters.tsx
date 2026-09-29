import { Star, Wifi, Network, CheckCircle2 } from "lucide-react";
import { NetworkDevice } from "../../types";

export type FilterKey = "all" | "online" | "wifi" | "wired" | "new" | "computers" | "phones" | "tvs" | "printers" | "iot" | "routers";

interface DeviceFiltersProps {
  devices: NetworkDevice[];
  activeFilter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
}

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  devices,
  activeFilter,
  onFilterChange,
}) => {
  const counts = {
    all: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    wifi: devices.filter((d) => d.connectionType === "wifi").length,
    wired: devices.filter((d) => d.connectionType === "wired").length,
    new: devices.filter((d) => d.isNew).length,
    computers: devices.filter((d) => d.deviceType === "desktop" || d.deviceType === "laptop").length,
    phones: devices.filter((d) => d.deviceType === "phone" || d.deviceType === "tablet").length,
    tvs: devices.filter((d) => d.deviceType === "tv").length,
    printers: devices.filter((d) => d.deviceType === "printer").length,
    iot: devices.filter((d) => d.deviceType === "iot" || d.deviceType === "smart_speaker").length,
    routers: devices.filter((d) => d.deviceType === "router").length,
  };

  const primaryFilters: { key: FilterKey; label: string; icon?: React.ReactNode; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    {
      key: "online",
      label: "Online",
      icon: <CheckCircle2 size={13} className="text-emerald-400" />,
      count: counts.online,
    },
    {
      key: "wifi",
      label: "Wi-Fi",
      icon: <Wifi size={13} className="text-blue-400" />,
      count: counts.wifi,
    },
    {
      key: "wired",
      label: "Wired",
      icon: <Network size={13} className="text-indigo-400" />,
      count: counts.wired,
    },
    {
      key: "new",
      label: "New",
      icon: <Star size={13} className="text-amber-400 fill-amber-400" />,
      count: counts.new,
    },
  ];

  const categoryFilters: { key: FilterKey; label: string; count: number }[] = [
    { key: "routers", label: "Routers", count: counts.routers },
    { key: "computers", label: "Computers", count: counts.computers },
    { key: "phones", label: "Phones & Tablets", count: counts.phones },
    { key: "tvs", label: "TVs", count: counts.tvs },
    { key: "printers", label: "Printers", count: counts.printers },
    { key: "iot", label: "Smart Home & IoT", count: counts.iot },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 select-none">
      {/* Primary quick filters */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#12192c] border border-[#1e2a47] rounded-xl">
        {primaryFilters.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#18233d]"
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "bg-[#18233d] text-gray-400"
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        {categoryFilters
          .filter((c) => c.count > 0)
          .map((c) => {
            const isActive = activeFilter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => onFilterChange(isActive ? "all" : c.key)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold"
                    : "bg-[#12192c] border-[#1e2a47] text-gray-400 hover:text-gray-200 hover:border-[#2d3e66]"
                }`}
              >
                {c.label} ({c.count})
              </button>
            );
          })}
      </div>
    </div>
  );
};
