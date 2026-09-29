use tauri::State;
use std::sync::Arc;
use crate::models::history::ScanHistoryEntry;
use crate::models::settings::AppSettings;
use crate::storage::db::StorageManager;

#[tauri::command]
pub fn set_device_custom_name(
    storage: State<'_, Arc<StorageManager>>,
    id: String,
    custom_name: String,
) -> Result<(), String> {
    storage.set_custom_name(&id, custom_name);
    Ok(())
}

#[tauri::command]
pub fn set_device_status_tag(
    storage: State<'_, Arc<StorageManager>>,
    id: String,
    tag: String,
) -> Result<(), String> {
    storage.set_status_tag(&id, tag);
    Ok(())
}

#[tauri::command]
pub fn get_scan_history(
    storage: State<'_, Arc<StorageManager>>,
) -> Result<Vec<ScanHistoryEntry>, String> {
    Ok(storage.get_scan_history())
}

#[tauri::command]
pub fn get_settings(
    storage: State<'_, Arc<StorageManager>>,
) -> Result<AppSettings, String> {
    Ok(storage.get_settings())
}

#[tauri::command]
pub fn save_settings(
    storage: State<'_, Arc<StorageManager>>,
    settings: AppSettings,
) -> Result<(), String> {
    storage.update_settings(settings);
    Ok(())
}
