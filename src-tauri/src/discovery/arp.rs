use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::process::Command;
use std::sync::Arc;
use tokio::sync::Semaphore;

#[cfg(target_os = "windows")]
#[link(name = "iphlpapi")]
extern "system" {
    fn SendARP(
        DestIP: u32,
        SrcIP: u32,
        pMacAddr: *mut u8,
        PhyAddrLen: *mut u32,
    ) -> u32;
}

#[derive(Debug, Clone)]
pub struct ArpEntry {
    pub ip: Ipv4Addr,
    pub mac: String,
}

/// Perform a Windows SendARP probe to a single IP address
pub fn probe_arp(ip: Ipv4Addr) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let ip_u32 = u32::from_ne_bytes(ip.octets());
        let mut mac_buf = [0u8; 6];
        let mut mac_len = 6u32;

        let res = unsafe {
            SendARP(
                ip_u32,
                0,
                mac_buf.as_mut_ptr(),
                &mut mac_len as *mut u32,
            )
        };

        if res == 0 && mac_len == 6 {
            let mac_str = format!(
                "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                mac_buf[0], mac_buf[1], mac_buf[2], mac_buf[3], mac_buf[4], mac_buf[5]
            );
            return Some(mac_str);
        }
    }

    None
}

/// Read the existing system ARP cache (from `arp -a`)
pub fn read_system_arp_table() -> HashMap<Ipv4Addr, String> {
    let mut table = HashMap::new();

    let mut cmd = Command::new("arp");
    cmd.arg("-a");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    let output = cmd.output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                if let Ok(ip) = parts[0].parse::<Ipv4Addr>() {
                    let mac_candidate = parts[1].replace('-', ":").to_ascii_uppercase();
                    // Validate candidate MAC
                    if is_valid_unicast_mac(&mac_candidate) {
                        table.insert(ip, mac_candidate);
                    }
                }
            }
        }
    }

    table
}

fn is_valid_unicast_mac(mac: &str) -> bool {
    let clean: String = mac.chars().filter(|c| c.is_ascii_hexdigit()).collect();
    if clean.len() != 12 {
        return false;
    }
    // Filter out broadcast and multicast
    if clean == "FFFFFFFFFFFF" || clean.starts_with("01005E") {
        return false;
    }
    true
}

/// Concurrent ARP scan of all given IPs with a concurrency semaphore
pub async fn scan_subnet_arp<F>(
    ips: Vec<Ipv4Addr>,
    max_concurrency: usize,
    mut on_device_found: F,
) -> Vec<ArpEntry>
where
    F: FnMut(ArpEntry) + Send + 'static,
{
    // First, merge with existing ARP table
    let existing_arp = read_system_arp_table();
    let mut discovered = HashMap::new();

    for (ip, mac) in existing_arp {
        if ips.contains(&ip) {
            let entry = ArpEntry { ip, mac };
            on_device_found(entry.clone());
            discovered.insert(ip, entry);
        }
    }

    // Now actively probe all remaining IPs concurrently
    let semaphore = Arc::new(Semaphore::new(max_concurrency.max(128)));
    let mut tasks = Vec::new();

    for ip in ips {
        if discovered.contains_key(&ip) {
            continue;
        }

        let sem = semaphore.clone();
        tasks.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.ok();
            let probe_task = tokio::task::spawn_blocking(move || {
                probe_arp(ip).map(|mac| ArpEntry { ip, mac })
            });
            match tokio::time::timeout(std::time::Duration::from_millis(700), probe_task).await {
                Ok(Ok(res)) => res,
                _ => None,
            }
        }));
    }

    for task in tasks {
        if let Ok(Some(entry)) = task.await {
            if !discovered.contains_key(&entry.ip) {
                on_device_found(entry.clone());
                discovered.insert(entry.ip, entry);
            }
        }
    }

    discovered.into_values().collect()
}
