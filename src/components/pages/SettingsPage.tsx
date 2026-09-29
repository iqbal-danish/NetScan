import {
  Moon,
  Sun,
  Laptop,
  ShieldCheck,
  Bell,
  Zap,
} from "lucide-react";
import { AppSettings } from "../../types";

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto p-8 max-w-3xl mx-auto select-none">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-100 tracking-tight">
          Application Settings
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Configure scanning behavior, appearance, and local privacy options
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <Moon size={14} className="text-blue-400" />
            Appearance
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "dark", label: "Dark Theme", icon: <Moon size={15} /> },
              { id: "light", label: "Light Theme", icon: <Sun size={15} /> },
              { id: "system", label: "System Default", icon: <Laptop size={15} /> },
            ].map((theme) => {
              const isSelected = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => update("theme", theme.id as any)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 text-blue-300 font-semibold shadow-sm"
                      : "bg-[#162035] border-[#202e4d] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {theme.icon}
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scanning Preferences */}
        <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-5 shadow-lg divide-y divide-[#1b2640]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 pb-3 flex items-center gap-2">
            <Zap size={14} className="text-blue-400" />
            Scanning Engine
          </h3>

          {/* Scan on Startup */}
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-100 block">
                Scan on Startup
              </span>
              <span className="text-[11px] text-gray-400">
                Automatically start discovery when NetScan is launched
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scanOnStartup}
                onChange={(e) => update("scanOnStartup", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#1b2640] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Ping Discovered Devices */}
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-100 block">
                Measure Response Time (Ping)
              </span>
              <span className="text-[11px] text-gray-400">
                Send lightweight ICMP echo probes to compute device response latency
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pingDevices}
                onChange={(e) => update("pingDevices", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#1b2640] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Auto Refresh */}
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-100 block">
                Periodic Auto Refresh
              </span>
              <span className="text-[11px] text-gray-400">
                Rescan network in the background at regular intervals
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) => update("autoRefresh", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#1b2640] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Interval dropdown */}
          {settings.autoRefresh && (
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-100 block">
                  Scan Interval
                </span>
                <span className="text-[11px] text-gray-400">
                  Time between background refreshes
                </span>
              </div>
              <select
                value={settings.scanIntervalMinutes}
                onChange={(e) => update("scanIntervalMinutes", Number(e.target.value))}
                className="bg-[#18233d] border border-[#223154] text-xs text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value={2}>Every 2 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
              </select>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-[#12192c] border border-[#1e2a47] rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <Bell size={14} className="text-blue-400" />
            Notifications
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-100 block">
                New Device Alert
              </span>
              <span className="text-[11px] text-gray-400">
                Highlight newly discovered devices with a ★ New badge
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyNewDevice}
                onChange={(e) => update("notifyNewDevice", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#1b2640] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Local-First Privacy Guarantee (Section 24) */}
        <div className="bg-[#0f1729] border border-blue-500/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2.5 text-blue-400 mb-2">
            <ShieldCheck size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Local-First &amp; Privacy Guarantee
            </h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Your network information stays on this device. NetScan does not require an account, cloud connection, or telemetry. All discovery (ARP, ICMP, mDNS, SSDP) happens completely locally on your current machine.
          </p>
        </div>
      </div>
    </div>
  );
};
