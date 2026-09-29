use crate::discovery::icmp::{ping_device_full, PingDetails};

#[tauri::command]
pub async fn ping_device(ip: String) -> Result<PingDetails, String> {
    tokio::task::spawn_blocking(move || ping_device_full(&ip))
        .await
        .map_err(|e| e.to_string())
}
