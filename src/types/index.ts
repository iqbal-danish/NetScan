export type DeviceType =
  | "router"
  | "desktop"
  | "laptop"
  | "phone"
  | "tablet"
  | "printer"
  | "tv"
  | "game_console"
  | "smart_speaker"
  | "iot"
  | "camera"
  | "server"
  | "unknown";

export type ConnectionType = "wifi" | "wired" | "unknown";
export type DeviceStatus = "online" | "offline" | "unknown";
export type StatusTag = "trusted" | "unknown" | "ignored";

export interface ServiceInfo {
  port: number;
  protocol: string;
  serviceName: string;
}

export interface NetworkDevice {
  id: string;
  ipAddress: string;
  macAddress?: string;
  hostname?: string;
  displayName: string;
  customName?: string;
  manufacturer?: string;
  deviceType: DeviceType;
  connectionType: ConnectionType;
  status: DeviceStatus;
  responseTime?: number; // ms
  firstSeen: string;
  lastSeen: string;
  isNew: boolean;
  statusTag?: StatusTag;
  openPorts: ServiceInfo[];
}

export interface NetworkInfo {
  ssid?: string;
  interfaceName: string;
  interfaceType: string;
  localIp: string;
  subnetMask: string;
  networkCidr: string;
  gatewayIp?: string;
  dnsServers: string[];
  isConnected: boolean;
  internetAccess: boolean;
  signalStrength?: number;
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  networkCidr: string;
  ssid?: string;
  deviceCount: number;
  newDevicesCount: number;
  devices: NetworkDevice[];
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  scanOnStartup: boolean;
  autoRefresh: boolean;
  scanIntervalMinutes: number;
  pingDevices: boolean;
  notifyNewDevice: boolean;
  discoveryTimeoutMs: number;
  maxConcurrency: number;
}

export interface ScanProgress {
  current: number;
  total: number;
  percentage: number;
  phase: string;
}

export interface PingDetails {
  ip: string;
  transmitted: number;
  received: number;
  packetLossPercent: number;
  minMs?: number;
  maxMs?: number;
  avgMs?: number;
  rawOutput: string;
}

export type PageId = "devices" | "network-info" | "history" | "settings";
