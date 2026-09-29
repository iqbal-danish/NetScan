use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr, UdpSocket};
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct SsdpDeviceInfo {
    pub ip: Ipv4Addr,
    pub server: Option<String>,
    pub location: Option<String>,
    pub device_type_hint: Option<String>,
}

/// Send SSDP M-SEARCH broadcast and gather device responses
pub async fn discover_ssdp() -> HashMap<Ipv4Addr, SsdpDeviceInfo> {
    tokio::task::spawn_blocking(move || {
        let mut results = HashMap::new();

        let socket = match UdpSocket::bind("0.0.0.0:0") {
            Ok(s) => s,
            Err(_) => return results,
        };

        let _ = socket.set_read_timeout(Some(Duration::from_millis(300)));
        let _ = socket.set_write_timeout(Some(Duration::from_millis(300)));
        let _ = socket.set_multicast_ttl_v4(2);

        let search_msg = "M-SEARCH * HTTP/1.1\r\n\
                          HOST: 239.255.255.250:1900\r\n\
                          MAN: \"ssdp:discover\"\r\n\
                          MX: 2\r\n\
                          ST: ssdp:all\r\n\
                          \r\n";

        let target: SocketAddr = "239.255.255.250:1900".parse().unwrap();
        let _ = socket.send_to(search_msg.as_bytes(), target);

        let mut buf = [0u8; 4096];
        let start = std::time::Instant::now();

        while start.elapsed() < Duration::from_millis(1200) {
            match socket.recv_from(&mut buf) {
                Ok((size, src)) => {
                    if let SocketAddr::V4(v4) = src {
                        let ip = *v4.ip();
                        let text = String::from_utf8_lossy(&buf[..size]);
                        let (server, location, hint) = parse_ssdp_headers(&text);

                        results.entry(ip).or_insert(SsdpDeviceInfo {
                            ip,
                            server,
                            location,
                            device_type_hint: hint,
                        });
                    }
                }
                Err(_) => {}
            }
        }

        results
    })
    .await
    .unwrap_or_default()
}

fn parse_ssdp_headers(text: &str) -> (Option<String>, Option<String>, Option<String>) {
    let mut server = None;
    let mut location = None;
    let mut hint = None;

    for line in text.lines() {
        let line = line.trim();
        let lower = line.to_lowercase();

        if lower.starts_with("server:") {
            server = Some(line[7..].trim().to_string());
        } else if lower.starts_with("location:") {
            location = Some(line[9..].trim().to_string());
        } else if lower.starts_with("st:") {
            let st = line[3..].trim().to_string();
            if st.contains("InternetGatewayDevice") || st.contains("WANConnection") {
                hint = Some("router".to_string());
            } else if st.contains("MediaRenderer") || st.contains("Dial") {
                hint = Some("tv".to_string());
            }
        }
    }

    (server, location, hint)
}
