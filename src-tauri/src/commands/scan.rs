use std::net::Ipv4Addr;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use chrono::Local;

use crate::discovery::arp::scan_subnet_arp;
use crate::discovery::device_classifier::{classify_device, ClassificationInput};
use crate::discovery::icmp::ping_single;
use crate::discovery::mdns::discover_mdns;
use crate::discovery::nbns::query_netbios_name;
use crate::discovery::network_interface::{detect_active_network, get_ips_in_network};
use crate::discovery::oui::lookup_vendor;
use crate::discovery::port_scan::scan_common_services;
use crate::discovery::ssdp::discover_ssdp;
use crate::models::device::NetworkDevice;
use crate::models::history::ScanHistoryEntry;
use crate::storage::db::StorageManager;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub percentage: usize,
    pub phase: String,
}

#[tauri::command]
pub async fn start_scan(
    app_handle: AppHandle,
    storage: State<'_, Arc<StorageManager>>,
    _refresh: Option<bool>,
) -> Result<Vec<NetworkDevice>, String> {
    let now_str = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 1. Detect Network
    let net_info = detect_active_network().await;
    let ips = get_ips_in_network(&net_info.network_cidr);
    let total_ips = ips.len().max(1);

    let _ = app_handle.emit(
        "netscan://scan-progress",
        ScanProgress {
            current: 0,
            total: total_ips,
            percentage: 5,
            phase: "Discovering network services...".to_string(),
        },
    );

    // 2. Launch mDNS and SSDP concurrently
    let mdns_future = tokio::spawn(async { discover_mdns().await });
    let ssdp_future = tokio::spawn(async { discover_ssdp().await });

    // 3. ARP Discovery
    let _ = app_handle.emit(
        "netscan://scan-progress",
        ScanProgress {
            current: 10,
            total: total_ips,
            percentage: 20,
            phase: "Scanning subnet with ARP...".to_string(),
        },
    );

    let storage_clone = storage.inner().clone();
    let arp_devices = scan_subnet_arp(ips.clone(), 64, move |_entry| {}).await;

    // 4. Wait for mDNS & SSDP results
    let mdns_results = mdns_future.await.unwrap_or_default();
    let ssdp_results = ssdp_future.await.unwrap_or_default();

    let mut discovered_devices: Vec<NetworkDevice> = Vec::new();
    let total_discovered = arp_devices.len().max(1);

    // 5. Enrich each discovered ARP device
    for (idx, entry) in arp_devices.into_iter().enumerate() {
        let ip_str = entry.ip.to_string();
        let mac_str = entry.mac.clone();

        // OUI lookup
        let vendor = lookup_vendor(&mac_str).map(|s| s.to_string());

        // Check mDNS
        let mdns_dev = mdns_results.get(&entry.ip);
        let mdns_name = mdns_dev.map(|m| m.hostname.clone());

        // Check SSDP
        let ssdp_dev = ssdp_results.get(&entry.ip);
        let ssdp_hint = ssdp_dev.and_then(|s| s.device_type_hint.as_deref());

        // Query NetBIOS on UDP 137
        let netbios_name = tokio::task::spawn_blocking(move || query_netbios_name(entry.ip))
            .await
            .unwrap_or(None);

        // Ping for response time
        let latency = tokio::task::spawn_blocking(move || ping_single(entry.ip))
            .await
            .unwrap_or(None);

        let is_gateway = net_info.gateway_ip.as_deref() == Some(&ip_str);
        let is_self = net_info.local_ip == ip_str;

        // Quick service check for gateway/servers
        let open_ports = if is_gateway {
            scan_common_services(&ip_str).await
        } else {
            vec![]
        };

        let hostname_candidate = mdns_name.clone().or_else(|| netbios_name.clone());

        let classification_input = ClassificationInput {
            ip: &ip_str,
            gateway_ip: net_info.gateway_ip.as_deref(),
            mac: Some(&mac_str),
            manufacturer: vendor.as_deref(),
            hostname: hostname_candidate.as_deref(),
            netbios_name: netbios_name.as_deref(),
            ssdp_hint,
            open_ports: &open_ports,
        };

        let (device_type, mut display_name) = classify_device(&classification_input);

        if is_self {
            display_name = format!("{} (This PC)", display_name);
        }

        let connection_type = if net_info.interface_type == "Wi-Fi" {
            "wifi".to_string()
        } else {
            "wired".to_string()
        };

        let mut device = NetworkDevice {
            id: mac_str.clone(),
            ip_address: ip_str,
            mac_address: Some(mac_str),
            hostname: hostname_candidate,
            display_name,
            custom_name: None,
            manufacturer: vendor,
            device_type,
            connection_type,
            status: "online".to_string(),
            response_time: latency,
            first_seen: now_str.clone(),
            last_seen: now_str.clone(),
            is_new: false,
            status_tag: None,
            open_ports,
        };

        // Apply local persistence history and custom names
        storage_clone.process_device_history(&mut device, &now_str);

        let _ = app_handle.emit("netscan://device-discovered", &device);
        discovered_devices.push(device);

        let progress_pct = 40 + ((idx + 1) * 55 / total_discovered);
        let _ = app_handle.emit(
            "netscan://scan-progress",
            ScanProgress {
                current: idx + 1,
                total: total_discovered,
                percentage: progress_pct,
                phase: format!("Enriching devices ({}/{})", idx + 1, total_discovered),
            },
        );
    }

    // Sort devices: Gateway/Router first, then This PC, then sorted by IP address
    discovered_devices.sort_by(|a, b| {
        let a_is_gw = net_info.gateway_ip.as_deref() == Some(&a.ip_address);
        let b_is_gw = net_info.gateway_ip.as_deref() == Some(&b.ip_address);
        if a_is_gw != b_is_gw {
            return b_is_gw.cmp(&a_is_gw);
        }
        let a_ip: Result<Ipv4Addr, _> = a.ip_address.parse();
        let b_ip: Result<Ipv4Addr, _> = b.ip_address.parse();
        match (a_ip, b_ip) {
            (Ok(ip1), Ok(ip2)) => ip1.cmp(&ip2),
            _ => a.ip_address.cmp(&b.ip_address),
        }
    });

    let new_devices_count = discovered_devices.iter().filter(|d| d.is_new).count();

    // Save scan to scan history
    let history_entry = ScanHistoryEntry {
        id: format!("scan_{}", Local::now().timestamp_millis()),
        timestamp: now_str,
        network_cidr: net_info.network_cidr.clone(),
        ssid: net_info.ssid.clone(),
        device_count: discovered_devices.len(),
        new_devices_count,
        devices: discovered_devices.clone(),
    };
    storage_clone.add_scan_history(history_entry);

    let _ = app_handle.emit(
        "netscan://scan-progress",
        ScanProgress {
            current: total_ips,
            total: total_ips,
            percentage: 100,
            phase: "Scan completed".to_string(),
        },
    );

    let _ = app_handle.emit("netscan://scan-completed", &discovered_devices);

    Ok(discovered_devices)
}
