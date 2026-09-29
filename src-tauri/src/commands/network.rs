use crate::discovery::network_interface::detect_active_network;
use crate::models::network::NetworkInfo;

#[tauri::command]
pub async fn get_network_info() -> Result<NetworkInfo, String> {
    Ok(detect_active_network().await)
}
