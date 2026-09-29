import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  NetworkDevice,
  NetworkInfo,
  ScanHistoryEntry,
  AppSettings,
  ScanProgress,
  PingDetails,
  ServiceInfo,
} from "../types";

export const api = {
  getNetworkInfo: async (): Promise<NetworkInfo> => {
    try {
      return await invoke<NetworkInfo>("get_network_info");
    } catch (e) {
      console.error("Failed to get network info:", e);
      return {
        interfaceName: "Ethernet",
        interfaceType: "Ethernet",
        localIp: "192.168.1.40",
        subnetMask: "255.255.255.0",
        networkCidr: "192.168.1.0/24",
        gatewayIp: "192.168.1.1",
        dnsServers: ["192.168.1.1"],
        isConnected: true,
        internetAccess: true,
      };
    }
  },

  startScan: async (refresh = false): Promise<NetworkDevice[]> => {
    return await invoke<NetworkDevice[]>("start_scan", { refresh });
  },

  pingDevice: async (ip: string): Promise<PingDetails> => {
    return await invoke<PingDetails>("ping_device", { ip });
  },

  discoverServices: async (ip: string): Promise<ServiceInfo[]> => {
    return await invoke<ServiceInfo[]>("discover_services", { ip });
  },

  setDeviceCustomName: async (id: string, customName: string): Promise<void> => {
    return await invoke<void>("set_device_custom_name", { id, customName });
  },

  setDeviceStatusTag: async (id: string, tag: string): Promise<void> => {
    return await invoke<void>("set_device_status_tag", { id, tag });
  },

  getScanHistory: async (): Promise<ScanHistoryEntry[]> => {
    return await invoke<ScanHistoryEntry[]>("get_scan_history");
  },

  getSettings: async (): Promise<AppSettings> => {
    return await invoke<AppSettings>("get_settings");
  },

  saveSettings: async (settings: AppSettings): Promise<void> => {
    return await invoke<void>("save_settings", { settings });
  },

  onScanProgress: async (callback: (progress: ScanProgress) => void): Promise<UnlistenFn> => {
    return await listen<ScanProgress>("netscan://scan-progress", (event) => {
      callback(event.payload);
    });
  },

  onDeviceDiscovered: async (callback: (device: NetworkDevice) => void): Promise<UnlistenFn> => {
    return await listen<NetworkDevice>("netscan://device-discovered", (event) => {
      callback(event.payload);
    });
  },

  onScanCompleted: async (callback: (devices: NetworkDevice[]) => void): Promise<UnlistenFn> => {
    return await listen<NetworkDevice[]>("netscan://scan-completed", (event) => {
      callback(event.payload);
    });
  },
};
