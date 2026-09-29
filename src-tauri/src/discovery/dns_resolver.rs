use std::net::{Ipv4Addr, SocketAddr, UdpSocket};
use std::process::Command;
use std::time::Duration;

/// Resolve PTR hostname by querying the gateway router's internal DNS server (UDP 53)
pub fn resolve_gateway_hostname(ip: Ipv4Addr, gateway_ip: Option<Ipv4Addr>) -> Option<String> {
    // 1. Fast DNS PTR query via UDP 53 to gateway
    if let Some(gw) = gateway_ip {
        if let Some(name) = query_dns_ptr_udp(ip, gw) {
            let clean = clean_hostname(&name);
            if !clean.is_empty() {
                return Some(clean);
            }
        }

        // 2. Fallback using system nslookup against gateway
        #[cfg(target_os = "windows")]
        {
            let output = Command::new("nslookup")
                .args([&ip.to_string(), &gw.to_string()])
                .output();

            if let Ok(out) = output {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("Name:") {
                        let parts: Vec<&str> = trimmed.split_whitespace().collect();
                        if parts.len() >= 2 {
                            let clean = clean_hostname(parts[1]);
                            if !clean.is_empty() {
                                return Some(clean);
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

/// Strip router domain suffixes like `.hgu_lan`, `.lan`, `.local`, `.home`
pub fn clean_hostname(name: &str) -> String {
    let mut clean = name.trim().trim_end_matches('.').to_string();
    let suffixes = [".hgu_lan", ".lan", ".home", ".localdomain", ".local", ".gateway"];
    for suffix in suffixes {
        if clean.to_lowercase().ends_with(suffix) {
            clean = clean[..clean.len() - suffix.len()].to_string();
        }
    }
    clean
}

/// Send a standard DNS PTR query to a specific DNS server (the gateway router)
fn query_dns_ptr_udp(ip: Ipv4Addr, dns_server: Ipv4Addr) -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.set_read_timeout(Some(Duration::from_millis(300))).ok()?;
    socket.set_write_timeout(Some(Duration::from_millis(300))).ok()?;

    // Construct reverse DNS query name: e.g. "34.1.168.192.in-addr.arpa"
    let octets = ip.octets();
    let qname = format!("{}.{}.{}.{}.in-addr.arpa", octets[3], octets[2], octets[1], octets[0]);

    let mut packet = Vec::with_capacity(64);
    // Transaction ID
    packet.extend_from_slice(&[0x12, 0x34]);
    // Flags: standard query, recursion desired (0x0100)
    packet.extend_from_slice(&[0x01, 0x00]);
    // Questions: 1
    packet.extend_from_slice(&[0x00, 0x01]);
    // Answer RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]);
    // Authority RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]);
    // Additional RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]);

    // Encode Question Name
    for label in qname.split('.') {
        if !label.is_empty() {
            packet.push(label.len() as u8);
            packet.extend_from_slice(label.as_bytes());
        }
    }
    packet.push(0x00); // Terminator

    // QType: PTR (12)
    packet.extend_from_slice(&[0x00, 0x0C]);
    // QClass: IN (1)
    packet.extend_from_slice(&[0x00, 0x01]);

    let target = SocketAddr::new(dns_server.into(), 53);
    socket.send_to(&packet, target).ok()?;

    let mut buf = [0u8; 1024];
    let (amt, _) = socket.recv_from(&mut buf).ok()?;

    // Parse DNS response
    if amt > 12 && (buf[2] & 0x80) != 0 {
        let ancount = u16::from_be_bytes([buf[6], buf[7]]);
        if ancount > 0 {
            return parse_ptr_record(&buf[..amt]);
        }
    }

    None
}

fn parse_ptr_record(buf: &[u8]) -> Option<String> {
    if buf.len() < 12 {
        return None;
    }
    // Skip header (12 bytes)
    let mut offset = 12;

    // Skip question section
    while offset < buf.len() {
        let len = buf[offset] as usize;
        if len == 0 {
            offset += 1 + 4; // skip null byte + QType(2) + QClass(2)
            break;
        }
        offset += 1 + len;
    }

    // Now in Answer section
    if offset + 12 > buf.len() {
        return None;
    }

    // Skip name pointer (2 bytes) or name
    if (buf[offset] & 0xC0) == 0xC0 {
        offset += 2;
    } else {
        while offset < buf.len() && buf[offset] != 0 {
            offset += 1 + buf[offset] as usize;
        }
        offset += 1;
    }

    if offset + 10 > buf.len() {
        return None;
    }

    let rtype = u16::from_be_bytes([buf[offset], buf[offset + 1]]);
    let rdlength = u16::from_be_bytes([buf[offset + 8], buf[offset + 9]]) as usize;
    offset += 10;

    if rtype == 12 && offset + rdlength <= buf.len() {
        // Parse PTR domain name
        let mut labels = Vec::new();
        let mut pos = offset;
        let end = offset + rdlength;

        while pos < end {
            let b = buf[pos];
            if b == 0 {
                break;
            }
            if (b & 0xC0) == 0xC0 {
                // Compression pointer
                if pos + 1 < buf.len() {
                    let ptr_offset = (((b & 0x3F) as usize) << 8) | (buf[pos + 1] as usize);
                    if let Some(target) = read_labels_at(buf, ptr_offset) {
                        labels.push(target);
                    }
                }
                break;
            }
            let len = b as usize;
            pos += 1;
            if pos + len <= buf.len() {
                if let Ok(label) = String::from_utf8(buf[pos..pos + len].to_vec()) {
                    labels.push(label);
                }
                pos += len;
            } else {
                break;
            }
        }

        if !labels.is_empty() {
            return Some(labels.join("."));
        }
    }

    None
}

fn read_labels_at(buf: &[u8], mut offset: usize) -> Option<String> {
    let mut parts = Vec::new();
    let mut visited = 0;

    while offset < buf.len() && visited < 10 {
        let b = buf[offset];
        if b == 0 {
            break;
        }
        if (b & 0xC0) == 0xC0 {
            if offset + 1 < buf.len() {
                offset = (((b & 0x3F) as usize) << 8) | (buf[offset + 1] as usize);
                visited += 1;
                continue;
            }
            break;
        }
        let len = b as usize;
        offset += 1;
        if offset + len <= buf.len() {
            if let Ok(s) = String::from_utf8(buf[offset..offset + len].to_vec()) {
                parts.push(s);
            }
            offset += len;
        } else {
            break;
        }
    }

    if !parts.is_empty() {
        Some(parts.join("."))
    } else {
        None
    }
}
