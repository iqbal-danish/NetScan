use serde::{Deserialize, Serialize};
use crate::models::device::NetworkDevice;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanHistoryEntry {
    pub id: String,
    pub timestamp: String,
    pub network_cidr: String,
    pub ssid: Option<String>,
    pub device_count: usize,
    pub new_devices_count: usize,
    pub devices: Vec<NetworkDevice>,
}
