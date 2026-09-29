use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    pub ssid: Option<String>,
    pub interface_name: String,
    pub interface_type: String, // "Wi-Fi", "Ethernet", etc.
    pub local_ip: String,
    pub subnet_mask: String,
    pub network_cidr: String,
    pub gateway_ip: Option<String>,
    pub dns_servers: Vec<String>,
    pub is_connected: bool,
    pub internet_access: bool,
    pub signal_strength: Option<u8>,
}
