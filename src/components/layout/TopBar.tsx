import React from "react";
import { Search, X, Settings as SettingsIcon } from "lucide-react";
import { PageId } from "../../types";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
  currentPage: PageId;
  isScanning: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  currentPage,
  isScanning,
}) => {
  return (
    <header className="h-14 bg-[#0d1322] border-b border-[#1a233a] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search devices (name, IP, MAC, manufacturer, type)..."
          className="w-full bg-[#131b2e] border border-[#1e2a47] rounded-lg pl-9 pr-9 py-1.5 text-xs text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-200 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 ml-4">
        {isScanning && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="font-medium text-[11px]">Scanning active...</span>
          </div>
        )}

        <button
          onClick={onOpenSettings}
          title="Settings"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            currentPage === "settings"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-100 hover:bg-[#161f36]"
          }`}
        >
          <SettingsIcon size={17} />
        </button>
      </div>
    </header>
  );
};
