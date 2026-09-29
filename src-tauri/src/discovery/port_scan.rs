use std::net::{IpAddr, SocketAddr};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;
use crate::models::device::ServiceInfo;

pub async fn scan_common_services(ip: &str) -> Vec<ServiceInfo> {
    let target_ip: IpAddr = match ip.parse() {
        Ok(ip) => ip,
        Err(_) => return vec![],
    };

    let candidate_ports = vec![
        (80, "HTTP"),
        (443, "HTTPS"),
        (22, "SSH"),
        (53, "DNS"),
        (445, "SMB"),
        (631, "IPP"),
        (3389, "RDP"),
        (5000, "UPnP"),
        (8080, "HTTP-Alt"),
        (8443, "HTTPS-Alt"),
        (9100, "JetDirect"),
    ];

    let mut open_services = Vec::new();
    let mut tasks = Vec::new();

    for (port, name) in candidate_ports {
        let addr = SocketAddr::new(target_ip, port);
        tasks.push(tokio::spawn(async move {
            match timeout(Duration::from_millis(350), TcpStream::connect(addr)).await {
                Ok(Ok(_)) => Some(ServiceInfo {
                    port,
                    protocol: "TCP".to_string(),
                    service_name: name.to_string(),
                }),
                _ => None,
            }
        }));
    }

    for task in tasks {
        if let Ok(Some(service)) = task.await {
            open_services.push(service);
        }
    }

    // Sort by port number
    open_services.sort_by_key(|s| s.port);
    open_services
}
