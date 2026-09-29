use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr, UdpSocket};
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct MdnsDeviceInfo {
    pub ip: Ipv4Addr,
    pub hostname: String,
    pub service_type: Option<String>,
}

/// Send mDNS multicast queries and collect responses for 1.2 seconds
pub async fn discover_mdns() -> HashMap<Ipv4Addr, MdnsDeviceInfo> {
    tokio::task::spawn_blocking(move || {
        let mut results = HashMap::new();

        let socket = match UdpSocket::bind("0.0.0.0:0") {
            Ok(s) => s,
            Err(_) => return results,
        };

        let _ = socket.set_read_timeout(Some(Duration::from_millis(300)));
        let _ = socket.set_write_timeout(Some(Duration::from_millis(300)));
        let _ = socket.set_multicast_ttl_v4(2);

        // Standard mDNS query packet for `_services._dns-sd._udp.local` and `_http._tcp.local`
        let query_packets = vec![
            // Query for _services._dns-sd._udp.local
            build_mdns_query(b"_services._dns-sd._udp.local"),
            // Query for _googlecast._tcp.local
            build_mdns_query(b"_googlecast._tcp.local"),
            // Query for _airplay._tcp.local
            build_mdns_query(b"_airplay._tcp.local"),
            // Query for _ipp._tcp.local
            build_mdns_query(b"_ipp._tcp.local"),
        ];

        let target: SocketAddr = "224.0.0.251:5353".parse().unwrap();

        for packet in &query_packets {
            let _ = socket.send_to(packet, target);
        }

        let mut buf = [0u8; 4096];
        let start = std::time::Instant::now();

        // Listen for up to 1 second
        while start.elapsed() < Duration::from_millis(1000) {
            match socket.recv_from(&mut buf) {
                Ok((size, src)) => {
                    if let SocketAddr::V4(v4) = src {
                        let ip = *v4.ip();
                        if let Some((name, service)) = parse_mdns_response(&buf[..size]) {
                            results.insert(
                                ip,
                                MdnsDeviceInfo {
                                    ip,
                                    hostname: name,
                                    service_type: service,
                                },
                            );
                        }
                    }
                }
                Err(_) => {
                    // Timeout hit, continue until elapsed
                }
            }
        }

        results
    })
    .await
    .unwrap_or_default()
}

fn build_mdns_query(qname: &[u8]) -> Vec<u8> {
    let mut packet = Vec::with_capacity(64);
    // Transaction ID: 0x0000
    packet.extend_from_slice(&[0x00, 0x00]);
    // Flags: 0x0000 (Standard Query)
    packet.extend_from_slice(&[0x00, 0x00]);
    // Questions: 1
    packet.extend_from_slice(&[0x00, 0x01]);
    // Answer RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]);
    // Authority RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]);
    // Additional RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]);

    // Encode DNS name
    for part in qname.split(|&b| b == b'.') {
        if !part.is_empty() {
            packet.push(part.len() as u8);
            packet.extend_from_slice(part);
        }
    }
    packet.push(0x00); // End of name

    // QType: PTR (0x000C)
    packet.extend_from_slice(&[0x00, 0x0C]);
    // QClass: IN (0x0001)
    packet.extend_from_slice(&[0x00, 0x01]);

    packet
}

fn parse_mdns_response(data: &[u8]) -> Option<(String, Option<String>)> {
    if data.len() < 12 {
        return None;
    }

    // Convert packet bytes to ASCII strings where printable to find device names
    let mut strings = Vec::new();
    let mut current = Vec::new();

    for &b in data {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b' ' || b == b'.' {
            current.push(b);
        } else {
            if current.len() >= 4 {
                if let Ok(s) = String::from_utf8(current.clone()) {
                    let trimmed = s.trim().to_string();
                    if !trimmed.is_empty() && !trimmed.contains("local") && !trimmed.starts_with('_') {
                        strings.push(trimmed);
                    }
                }
            }
            current.clear();
        }
    }

    if let Some(best) = strings.into_iter().max_by_key(|s| s.len()) {
        return Some((best, None));
    }

    None
}
