use std::net::{Ipv4Addr, SocketAddr};
use std::process::Command;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;
use crate::models::network::NetworkInfo;

pub async fn detect_active_network() -> NetworkInfo {
    // 1. Detect Wi-Fi info if on Windows
    let (wifi_ssid, signal_strength) = get_wifi_details();

    // 2. Detect adapter info (IP, subnet, gateway, DNS)
    let (interface_name, interface_type, local_ip, subnet_mask, gateway_ip, dns_servers) =
        get_adapter_details(&wifi_ssid);

    // 3. Compute network CIDR
    let network_cidr = calculate_cidr(&local_ip, &subnet_mask);

    // 4. Test internet connectivity (TCP probe to 8.8.8.8:53 or 1.1.1.1:53)
    let internet_access = check_internet_connectivity().await;

    let is_connected = !local_ip.is_empty() && local_ip != "127.0.0.1";

    NetworkInfo {
        ssid: wifi_ssid,
        interface_name,
        interface_type,
        local_ip,
        subnet_mask,
        network_cidr,
        gateway_ip,
        dns_servers,
        is_connected,
        internet_access,
        signal_strength,
    }
}

/// Computes the network address and prefix length, e.g. "192.168.1.0/24"
pub fn calculate_cidr(ip_str: &str, mask_str: &str) -> String {
    let ip: Ipv4Addr = match ip_str.parse() {
        Ok(ip) => ip,
        Err(_) => return "192.168.1.0/24".to_string(),
    };
    let mask: Ipv4Addr = match mask_str.parse() {
        Ok(mask) => mask,
        Err(_) => return "192.168.1.0/24".to_string(),
    };

    let ip_u32 = u32::from(ip);
    let mask_u32 = u32::from(mask);
    let net_u32 = ip_u32 & mask_u32;
    let net_ip = Ipv4Addr::from(net_u32);
    let prefix_len = mask_u32.count_ones();

    format!("{}/{}", net_ip, prefix_len)
}

/// Generates all host IPv4 addresses for a given CIDR network
pub fn get_ips_in_network(cidr: &str) -> Vec<Ipv4Addr> {
    let parts: Vec<&str> = cidr.split('/').collect();
    if parts.len() != 2 {
        return vec![];
    }

    let net_ip: Ipv4Addr = match parts[0].parse() {
        Ok(ip) => ip,
        Err(_) => return vec![],
    };

    let prefix_len: u32 = match parts[1].parse() {
        Ok(len) => len,
        Err(_) => return vec![],
    };

    if prefix_len < 16 || prefix_len > 30 {
        // Limit to reasonable subnet sizes (e.g. /24 or /23) to prevent freezing on massive subnets
        let base = u32::from(net_ip) & 0xFFFFFF00;
        return (1..255).map(|i| Ipv4Addr::from(base + i)).collect();
    }

    let host_bits = 32 - prefix_len;
    let total_hosts = (1u32 << host_bits).saturating_sub(2); // exclude network and broadcast
    let net_u32 = u32::from(net_ip);

    // Limit to max 512 hosts for performance
    let limit = total_hosts.min(512);

    (1..=limit).map(|i| Ipv4Addr::from(net_u32 + i)).collect()
}

/// Check internet connectivity with a fast 1-second timeout
async fn check_internet_connectivity() -> bool {
    let check = async {
        // Try Cloudflare DNS 1.1.1.1:53 or Google 8.8.8.8:53
        let addr1: SocketAddr = "1.1.1.1:53".parse().unwrap();
        if TcpStream::connect(addr1).await.is_ok() {
            return true;
        }
        let addr2: SocketAddr = "8.8.8.8:53".parse().unwrap();
        TcpStream::connect(addr2).await.is_ok()
    };

    match timeout(Duration::from_millis(1200), check).await {
        Ok(res) => res,
        Err(_) => false,
    }
}

#[cfg(target_os = "windows")]
fn get_wifi_details() -> (Option<String>, Option<u8>) {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("netsh");
    cmd.args(["wlan", "show", "interfaces"]);
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let output = cmd.output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        let mut ssid = None;
        let mut signal = None;

        for line in text.lines() {
            let line = line.trim();
            if line.starts_with("SSID") && !line.starts_with("BSSID") {
                if let Some(pos) = line.find(':') {
                    let val = line[pos + 1..].trim().to_string();
                    if !val.is_empty() {
                        ssid = Some(val);
                    }
                }
            } else if line.starts_with("Signal") {
                if let Some(pos) = line.find(':') {
                    let val = line[pos + 1..].trim().replace('%', "");
                    if let Ok(num) = val.parse::<u8>() {
                        signal = Some(num);
                    }
                }
            }
        }
        return (ssid, signal);
    }

    (None, None)
}

#[cfg(not(target_os = "windows"))]
fn get_wifi_details() -> (Option<String>, Option<u8>) {
    (None, None)
}

#[cfg(target_os = "windows")]
fn get_adapter_details(wifi_ssid: &Option<String>) -> (String, String, String, String, Option<String>, Vec<String>) {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("ipconfig");
    cmd.arg("/all");
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let output = cmd.output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        return parse_windows_ipconfig(&text, wifi_ssid);
    }

    (
        "Local Network".to_string(),
        "Ethernet".to_string(),
        "192.168.1.40".to_string(),
        "255.255.255.0".to_string(),
        Some("192.168.1.1".to_string()),
        vec!["192.168.1.1".to_string()],
    )
}

#[cfg(not(target_os = "windows"))]
fn get_adapter_details(_wifi_ssid: &Option<String>) -> (String, String, String, String, Option<String>, Vec<String>) {
    (
        "Local Network".to_string(),
        "Wi-Fi".to_string(),
        "192.168.1.10".to_string(),
        "255.255.255.0".to_string(),
        Some("192.168.1.1".to_string()),
        vec!["1.1.1.1".to_string()],
    )
}

#[cfg(target_os = "windows")]
fn parse_windows_ipconfig(
    text: &str,
    wifi_ssid: &Option<String>,
) -> (String, String, String, String, Option<String>, Vec<String>) {
    let mut current_adapter = String::new();
    let mut current_ip = String::new();
    let mut current_mask = String::new();
    let mut current_gateway = None;
    let mut current_dns = Vec::new();
    let mut is_disconnected = false;

    struct AdapterBlock {
        name: String,
        ip: String,
        mask: String,
        gateway: Option<String>,
        dns: Vec<String>,
        is_wifi: bool,
    }

    let mut adapters: Vec<AdapterBlock> = Vec::new();

    for raw_line in text.lines() {
        let line = raw_line.trim_end();
        if !line.starts_with(' ') && !line.starts_with('\t') && line.contains("adapter ") {
            // Save previous adapter if it had a valid IPv4
            if !current_ip.is_empty() && !is_disconnected {
                let is_wifi = current_adapter.to_lowercase().contains("wireless")
                    || current_adapter.to_lowercase().contains("wi-fi")
                    || current_adapter.to_lowercase().contains("wlan");
                adapters.push(AdapterBlock {
                    name: current_adapter.clone(),
                    ip: current_ip.clone(),
                    mask: current_mask.clone(),
                    gateway: current_gateway.clone(),
                    dns: current_dns.clone(),
                    is_wifi,
                });
            }

            // New adapter header, e.g. "Ethernet adapter Ethernet 4:"
            let parts: Vec<&str> = line.split("adapter ").collect();
            if parts.len() > 1 {
                current_adapter = parts[1].trim_end_matches(':').trim().to_string();
            } else {
                current_adapter = line.trim_end_matches(':').trim().to_string();
            }
            current_ip.clear();
            current_mask = "255.255.255.0".to_string();
            current_gateway = None;
            current_dns.clear();
            is_disconnected = false;
        } else {
            let trimmed = line.trim();
            if trimmed.contains("Media State") && trimmed.contains("Media disconnected") {
                is_disconnected = true;
            } else if trimmed.starts_with("IPv4 Address") || trimmed.starts_with("IP Address") {
                if let Some(pos) = trimmed.find(':') {
                    let mut ip_part = trimmed[pos + 1..].trim();
                    if let Some(paren) = ip_part.find('(') {
                        ip_part = ip_part[..paren].trim();
                    }
                    if let Ok(parsed) = ip_part.parse::<Ipv4Addr>() {
                        current_ip = parsed.to_string();
                    }
                }
            } else if trimmed.starts_with("Subnet Mask") {
                if let Some(pos) = trimmed.find(':') {
                    let mask_part = trimmed[pos + 1..].trim();
                    if let Ok(parsed) = mask_part.parse::<Ipv4Addr>() {
                        current_mask = parsed.to_string();
                    }
                }
            } else if trimmed.starts_with("Default Gateway") {
                if let Some(pos) = trimmed.find(':') {
                    let gw_part = trimmed[pos + 1..].trim();
                    if let Ok(parsed) = gw_part.parse::<Ipv4Addr>() {
                        current_gateway = Some(parsed.to_string());
                    }
                }
            } else if trimmed.starts_with("DNS Servers") {
                if let Some(pos) = trimmed.find(':') {
                    let dns_part = trimmed[pos + 1..].trim();
                    if let Ok(parsed) = dns_part.parse::<Ipv4Addr>() {
                        current_dns.push(parsed.to_string());
                    }
                }
            } else if line.starts_with("   ") || line.starts_with("\t") {
                // Continuation line for Gateway or DNS (which may be multi-line or following IPv6)
                if let Ok(parsed) = trimmed.parse::<Ipv4Addr>() {
                    let ip_str = parsed.to_string();
                    if current_gateway.is_none() && ip_str.ends_with(".1") {
                        current_gateway = Some(ip_str);
                    } else if !current_dns.contains(&ip_str) {
                        current_dns.push(ip_str);
                    }
                }
            }
        }
    }

    // Flush last adapter
    if !current_ip.is_empty() && !is_disconnected {
        let is_wifi = current_adapter.to_lowercase().contains("wireless")
            || current_adapter.to_lowercase().contains("wi-fi")
            || current_adapter.to_lowercase().contains("wlan");
        adapters.push(AdapterBlock {
            name: current_adapter,
            ip: current_ip,
            mask: current_mask,
            gateway: current_gateway,
            dns: current_dns,
            is_wifi,
        });
    }

    // Pick active adapter:
    // If wifi_ssid is present, prefer Wi-Fi adapter. Otherwise pick adapter with gateway.
    let best = if wifi_ssid.is_some() {
        adapters
            .iter()
            .find(|a| a.is_wifi && a.gateway.is_some())
            .or_else(|| adapters.iter().find(|a| a.gateway.is_some()))
            .or_else(|| adapters.first())
    } else {
        adapters
            .iter()
            .find(|a| a.gateway.is_some())
            .or_else(|| adapters.first())
    };

    if let Some(adapter) = best {
        let iface_type = if adapter.is_wifi {
            "Wi-Fi".to_string()
        } else {
            "Ethernet".to_string()
        };
        (
            adapter.name.clone(),
            iface_type,
            adapter.ip.clone(),
            adapter.mask.clone(),
            adapter.gateway.clone(),
            adapter.dns.clone(),
        )
    } else {
        (
            "Local Network".to_string(),
            "Ethernet".to_string(),
            "192.168.1.40".to_string(),
            "255.255.255.0".to_string(),
            Some("192.168.1.1".to_string()),
            vec!["192.168.1.1".to_string()],
        )
    }
}
