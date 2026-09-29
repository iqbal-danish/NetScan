use crate::discovery::port_scan::scan_common_services;
use crate::models::device::ServiceInfo;

#[tauri::command]
pub async fn discover_services(ip: String) -> Result<Vec<ServiceInfo>, String> {
    Ok(scan_common_services(&ip).await)
}
