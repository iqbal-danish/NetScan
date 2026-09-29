pub mod models;
pub mod discovery;
pub mod storage;
pub mod commands;

use std::sync::Arc;
use storage::db::StorageManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let storage_manager = Arc::new(StorageManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(storage_manager)
        .invoke_handler(tauri::generate_handler![
            commands::network::get_network_info,
            commands::scan::start_scan,
            commands::ping::ping_device,
            commands::services::discover_services,
            commands::storage::set_device_custom_name,
            commands::storage::set_device_status_tag,
            commands::storage::get_scan_history,
            commands::storage::get_settings,
            commands::storage::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NetScan application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::discovery::network_interface::{calculate_cidr, get_ips_in_network};
    use crate::discovery::oui::lookup_vendor;
    use crate::discovery::device_classifier::{classify_device, ClassificationInput};
    use crate::models::device::ServiceInfo;

    #[test]
    fn test_network_cidr_calculation() {
        assert_eq!(calculate_cidr("192.168.1.40", "255.255.255.0"), "192.168.1.0/24");
        assert_eq!(calculate_cidr("10.0.0.12", "255.255.255.0"), "10.0.0.0/24");
        assert_eq!(calculate_cidr("172.16.5.1", "255.255.0.0"), "172.16.0.0/16");
    }

    #[test]
    fn test_get_ips_in_network() {
        let ips = get_ips_in_network("192.168.1.0/24");
        assert_eq!(ips.len(), 254);
        assert_eq!(ips.first().unwrap().to_string(), "192.168.1.1");
        assert_eq!(ips.last().unwrap().to_string(), "192.168.1.254");
    }

    #[test]
    fn test_vendor_oui_lookup() {
        assert_eq!(lookup_vendor("3C:22:FB:AA:BB:CC"), Some("Apple"));
        assert_eq!(lookup_vendor("D0:1E:1D:6C:16:77"), Some("Arcadyan"));
        assert_eq!(lookup_vendor("A0:B1:C2:11:22:33"), Some("TP-Link"));
        assert_eq!(lookup_vendor("2C:7B:A0:D9:14:85"), Some("Intel"));
        assert_eq!(lookup_vendor("B8:27:EB:11:22:33"), Some("Raspberry Pi"));
        assert_eq!(lookup_vendor("00:00:00:00:00:00"), None);
    }

    #[test]
    fn test_device_classification() {
        // Router / Gateway
        let input_gw = ClassificationInput {
            ip: "192.168.1.1",
            gateway_ip: Some("192.168.1.1"),
            mac: Some("D0:1E:1D:6C:16:77"),
            manufacturer: Some("Arcadyan"),
            hostname: None,
            netbios_name: None,
            ssdp_hint: None,
            open_ports: &[],
        };
        let (dtype, dname) = classify_device(&input_gw);
        assert_eq!(dtype, "router");
        assert!(dname.contains("Router"));

        // Printer
        let input_printer = ClassificationInput {
            ip: "192.168.1.50",
            gateway_ip: Some("192.168.1.1"),
            mac: Some("00:80:77:11:22:33"),
            manufacturer: Some("Brother"),
            hostname: Some("Brother-HL-L2350DW"),
            netbios_name: None,
            ssdp_hint: None,
            open_ports: &[ServiceInfo { port: 631, protocol: "TCP".to_string(), service_name: "IPP".to_string() }],
        };
        let (dtype, _) = classify_device(&input_printer);
        assert_eq!(dtype, "printer");

        // PC / Desktop
        let input_pc = ClassificationInput {
            ip: "192.168.1.10",
            gateway_ip: Some("192.168.1.1"),
            mac: Some("30:13:8B:F0:E2:68"),
            manufacturer: Some("Dell"),
            hostname: Some("DESKTOP-8F3K2"),
            netbios_name: Some("DANISH-PC"),
            ssdp_hint: None,
            open_ports: &[],
        };
        let (dtype, dname) = classify_device(&input_pc);
        assert_eq!(dtype, "desktop");
        assert_eq!(dname, "DANISH-PC");
    }

    #[test]
    fn test_storage_manager() {
        let storage = StorageManager::new();
        storage.set_custom_name("TEST_MAC_01", "Living Room TV".to_string());
        assert_eq!(storage.get_custom_name("TEST_MAC_01"), Some("Living Room TV".to_string()));

        storage.set_status_tag("TEST_MAC_01", "trusted".to_string());
        assert_eq!(storage.get_status_tag("TEST_MAC_01"), Some("trusted".to_string()));
    }

    #[test]
    fn test_real_network_detection() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            use crate::discovery::network_interface::detect_active_network;
            let net = detect_active_network().await;
            println!("\n=== DETECTED LIVE NETWORK ===");
            println!("Interface: {}", net.interface_name);
            println!("Type: {}", net.interface_type);
            println!("Local IP: {}", net.local_ip);
            println!("Subnet Mask: {}", net.subnet_mask);
            println!("Network CIDR: {}", net.network_cidr);
            println!("Gateway: {:?}", net.gateway_ip);
            println!("DNS Servers: {:?}", net.dns_servers);
            println!("Internet Connected: {}", net.internet_access);
            println!("==============================\n");
            assert!(!net.local_ip.is_empty());
            assert!(net.network_cidr.contains('/'));
        });
    }

    #[test]
    fn test_real_arp_scan() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            use crate::discovery::arp::scan_subnet_arp;
            use crate::discovery::network_interface::{detect_active_network, get_ips_in_network};
            let net = detect_active_network().await;
            let ips = get_ips_in_network(&net.network_cidr);
            println!("Probing {} hosts on {}...", ips.len(), net.network_cidr);
            let start = std::time::Instant::now();
            let devices = scan_subnet_arp(ips, 64, |entry| {
                println!("Live Discovered: IP={} MAC={}", entry.ip, entry.mac);
            }).await;
            println!("ARP Scan finished in {:?}. Total devices found: {}", start.elapsed(), devices.len());
            assert!(!devices.is_empty());
        });
    }
}

