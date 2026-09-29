use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use crate::models::device::NetworkDevice;
use crate::models::history::ScanHistoryEntry;
use crate::models::settings::AppSettings;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PersistentState {
    pub custom_names: HashMap<String, String>, // key: MAC or IP
    pub status_tags: HashMap<String, String>,   // key: MAC or IP -> "trusted", "unknown", "ignored"
    pub first_seen_map: HashMap<String, String>, // key: MAC or IP -> ISO 8601 timestamp
    pub scan_history: Vec<ScanHistoryEntry>,
    pub settings: AppSettings,
}

pub struct StorageManager {
    file_path: PathBuf,
    state: Mutex<PersistentState>,
}

impl StorageManager {
    pub fn new() -> Self {
        let mut path = std::env::var("LOCALAPPDATA")
            .map(PathBuf::from)
            .or_else(|_| std::env::var("APPDATA").map(PathBuf::from))
            .or_else(|_| std::env::var("HOME").map(PathBuf::from))
            .unwrap_or_else(|_| PathBuf::from("."));
        path.push("NetScan");
        let _ = fs::create_dir_all(&path);
        path.push("netscan_data.json");

        let state = if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                serde_json::from_str::<PersistentState>(&content).unwrap_or_default()
            } else {
                PersistentState::default()
            }
        } else {
            PersistentState::default()
        };

        Self {
            file_path: path,
            state: Mutex::new(state),
        }
    }

    pub fn save(&self) {
        if let Ok(state) = self.state.lock() {
            if let Ok(json) = serde_json::to_string_pretty(&*state) {
                let _ = fs::write(&self.file_path, json);
            }
        }
    }

    pub fn get_settings(&self) -> AppSettings {
        self.state.lock().map(|s| s.settings.clone()).unwrap_or_default()
    }

    pub fn update_settings(&self, new_settings: AppSettings) {
        if let Ok(mut s) = self.state.lock() {
            s.settings = new_settings;
        }
        self.save();
    }

    pub fn set_custom_name(&self, key: &str, name: String) {
        if let Ok(mut s) = self.state.lock() {
            if name.trim().is_empty() {
                s.custom_names.remove(key);
            } else {
                s.custom_names.insert(key.to_string(), name);
            }
        }
        self.save();
    }

    pub fn set_status_tag(&self, key: &str, tag: String) {
        if let Ok(mut s) = self.state.lock() {
            s.status_tags.insert(key.to_string(), tag);
        }
        self.save();
    }

    pub fn get_custom_name(&self, key: &str) -> Option<String> {
        self.state.lock().ok()?.custom_names.get(key).cloned()
    }

    pub fn get_status_tag(&self, key: &str) -> Option<String> {
        self.state.lock().ok()?.status_tags.get(key).cloned()
    }

    pub fn process_device_history(&self, device: &mut NetworkDevice, now_str: &str) {
        let key = device.mac_address.clone().unwrap_or_else(|| device.ip_address.clone());

        if let Ok(mut s) = self.state.lock() {
            // Apply custom name if set
            if let Some(custom) = s.custom_names.get(&key) {
                device.custom_name = Some(custom.clone());
            }

            // Apply status tag if set
            if let Some(tag) = s.status_tags.get(&key) {
                device.status_tag = Some(tag.clone());
            }

            // Check if seen before
            if let Some(first_seen) = s.first_seen_map.get(&key) {
                device.first_seen = first_seen.clone();
                device.is_new = false;
            } else {
                device.first_seen = now_str.to_string();
                device.is_new = true;
                s.first_seen_map.insert(key, now_str.to_string());
            }
        }
    }

    pub fn add_scan_history(&self, entry: ScanHistoryEntry) {
        if let Ok(mut s) = self.state.lock() {
            // Keep last 50 scans
            s.scan_history.insert(0, entry);
            if s.scan_history.len() > 50 {
                s.scan_history.truncate(50);
            }
        }
        self.save();
    }

    pub fn get_scan_history(&self) -> Vec<ScanHistoryEntry> {
        self.state.lock().map(|s| s.scan_history.clone()).unwrap_or_default()
    }
}
