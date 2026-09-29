use std::net::{IpAddr, SocketAddr};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;

#[derive(Debug, Clone, Default)]
pub struct HttpBanner {
    pub server: Option<String>,
    pub title: Option<String>,
    pub location: Option<String>,
}

/// Quickly probe port 80 or 8080 for HTTP Server header and <title>
pub async fn fetch_http_banner(ip_str: &str, port: u16) -> Option<HttpBanner> {
    let ip: IpAddr = ip_str.parse().ok()?;
    let addr = SocketAddr::new(ip, port);

    let connect_and_read = async {
        let mut stream = TcpStream::connect(addr).await.ok()?;
        let req = format!(
            "GET / HTTP/1.0\r\nHost: {}\r\nUser-Agent: NetScan/1.0\r\nConnection: close\r\n\r\n",
            ip_str
        );
        stream.write_all(req.as_bytes()).await.ok()?;

        let mut buf = [0u8; 4096];
        let n = stream.read(&mut buf).await.ok()?;
        let text = String::from_utf8_lossy(&buf[..n]).to_string();

        let mut banner = HttpBanner::default();

        for line in text.lines() {
            let lower = line.to_lowercase();
            if lower.starts_with("server:") {
                banner.server = Some(line[7..].trim().to_string());
            } else if lower.starts_with("location:") {
                banner.location = Some(line[9..].trim().to_string());
            }
        }

        // Extract <title>...</title>
        let lower_text = text.to_lowercase();
        if let Some(start) = lower_text.find("<title>") {
            if let Some(end) = lower_text[start + 7..].find("</title>") {
                let title_val = text[start + 7..start + 7 + end].trim().to_string();
                let lower_title = title_val.to_lowercase();
                let is_http_status = lower_title.contains("301")
                    || lower_title.contains("302")
                    || lower_title.contains("303")
                    || lower_title.contains("307")
                    || lower_title.contains("400")
                    || lower_title.contains("401")
                    || lower_title.contains("403")
                    || lower_title.contains("404")
                    || lower_title.contains("500")
                    || lower_title.contains("502")
                    || lower_title.contains("503")
                    || lower_title.contains("moved temporarily")
                    || lower_title.contains("moved permanently")
                    || lower_title.contains("not found")
                    || lower_title.contains("forbidden")
                    || lower_title.contains("unauthorized")
                    || lower_title.contains("bad request")
                    || lower_title.contains("document has moved")
                    || lower_title.contains("redirect");

                if !title_val.is_empty() && !is_http_status {
                    banner.title = Some(title_val);
                }
            }
        }

        Some(banner)
    };

    match timeout(Duration::from_millis(500), connect_and_read).await {
        Ok(res) => res,
        Err(_) => None,
    }
}
