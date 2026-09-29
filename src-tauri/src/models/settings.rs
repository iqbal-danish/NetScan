use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String, // "dark", "light", "system"
    pub scan_on_startup: bool,
    pub auto_refresh: bool,
    pub scan_interval_minutes: u32,
    pub ping_devices: bool,
    pub notify_new_device: bool,
    pub discovery_timeout_ms: u64,
    pub max_concurrency: usize,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            scan_on_startup: true,
            auto_refresh: false,
            scan_interval_minutes: 5,
            ping_devices: true,
            notify_new_device: true,
            discovery_timeout_ms: 1500,
            max_concurrency: 64,
        }
    }
}
