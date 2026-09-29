use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceInfo {
    pub port: u16,
    pub protocol: String,
    pub service_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkDevice {
    pub id: String,
    pub ip_address: String,
    pub mac_address: Option<String>,
    pub hostname: Option<String>,
    pub display_name: String,
    pub custom_name: Option<String>,
    pub manufacturer: Option<String>,
    pub device_type: String, // "router", "desktop", "laptop", "phone", "tablet", "printer", "tv", "game_console", "smart_speaker", "iot", "camera", "server", "unknown"
    pub connection_type: String, // "wifi", "wired", "unknown"
    pub status: String, // "online", "offline", "unknown"
    pub response_time: Option<u32>, // in ms
    pub first_seen: String,
    pub last_seen: String,
    pub is_new: bool,
    pub status_tag: Option<String>, // "trusted", "unknown", "ignored"
    pub open_ports: Vec<ServiceInfo>,
}
