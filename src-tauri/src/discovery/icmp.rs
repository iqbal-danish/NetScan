use std::net::Ipv4Addr;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingDetails {
    pub ip: String,
    pub transmitted: u32,
    pub received: u32,
    pub packet_loss_percent: f32,
    pub min_ms: Option<f32>,
    pub max_ms: Option<f32>,
    pub avg_ms: Option<f32>,
    pub raw_output: String,
}

/// Ping a single IP to measure reachability and round-trip time in ms
pub fn ping_single(ip: Ipv4Addr) -> Option<u32> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("ping")
            .args(["-n", "1", "-w", "400", &ip.to_string()])
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            return parse_ping_latency(&text);
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("ping")
            .args(["-c", "1", "-W", "1", &ip.to_string()])
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            return parse_ping_latency(&text);
        }
    }

    None
}

/// Full 4-packet Ping for the "Ping Device" interactive action
pub fn ping_device_full(ip_str: &str) -> PingDetails {
    #[cfg(target_os = "windows")]
    let output = Command::new("ping")
        .args(["-n", "4", "-w", "1000", ip_str])
        .output();

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("ping")
        .args(["-c", "4", "-W", "2", ip_str])
        .output();

    match output {
        Ok(out) => {
            let raw = String::from_utf8_lossy(&out.stdout).to_string();
            parse_windows_full_ping(ip_str, &raw)
        }
        Err(e) => PingDetails {
            ip: ip_str.to_string(),
            transmitted: 4,
            received: 0,
            packet_loss_percent: 100.0,
            min_ms: None,
            max_ms: None,
            avg_ms: None,
            raw_output: format!("Failed to execute ping: {}", e),
        },
    }
}

fn parse_ping_latency(text: &str) -> Option<u32> {
    for line in text.lines() {
        let lower = line.to_lowercase();
        if lower.contains("time=") || lower.contains("time<") {
            if let Some(pos) = lower.find("time") {
                let rem = &lower[pos + 4..];
                let num_str: String = rem
                    .chars()
                    .skip_while(|c| *c == '=' || *c == '<' || *c == ' ')
                    .take_while(|c| c.is_ascii_digit())
                    .collect();
                if let Ok(val) = num_str.parse::<u32>() {
                    return Some(val.max(1));
                }
            }
        }
    }
    None
}

fn parse_windows_full_ping(ip: &str, text: &str) -> PingDetails {
    let mut transmitted = 4u32;
    let mut received = 0u32;
    let mut loss = 100.0f32;
    let mut min_ms = None;
    let mut max_ms = None;
    let mut avg_ms = None;

    for line in text.lines() {
        let lower = line.to_lowercase();
        // Check for packet stats: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)
        if lower.contains("packets:") && lower.contains("sent") {
            if let Some(sent_idx) = lower.find("sent =") {
                let num: String = lower[sent_idx + 6..].chars().skip_while(|c| *c == ' ').take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(n) = num.parse() { transmitted = n; }
            }
            if let Some(recv_idx) = lower.find("received =") {
                let num: String = lower[recv_idx + 10..].chars().skip_while(|c| *c == ' ').take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(n) = num.parse() { received = n; }
            }
            if let Some(loss_idx) = lower.find("loss") {
                if let Some(paren_idx) = lower[..loss_idx].rfind('(') {
                    let num: String = lower[paren_idx + 1..loss_idx].chars().filter(|c| c.is_ascii_digit() || *c == '.').collect();
                    if let Ok(l) = num.parse() { loss = l; }
                }
            }
        }

        // Check for Minimum = 1ms, Maximum = 4ms, Average = 2ms
        if lower.contains("minimum =") || lower.contains("average =") {
            if let Some(min_idx) = lower.find("minimum =") {
                let num: String = lower[min_idx + 9..].chars().skip_while(|c| *c == ' ').take_while(|c| c.is_ascii_digit() || *c == '.').collect();
                if let Ok(v) = num.parse() { min_ms = Some(v); }
            }
            if let Some(max_idx) = lower.find("maximum =") {
                let num: String = lower[max_idx + 9..].chars().skip_while(|c| *c == ' ').take_while(|c| c.is_ascii_digit() || *c == '.').collect();
                if let Ok(v) = num.parse() { max_ms = Some(v); }
            }
            if let Some(avg_idx) = lower.find("average =") {
                let num: String = lower[avg_idx + 9..].chars().skip_while(|c| *c == ' ').take_while(|c| c.is_ascii_digit() || *c == '.').collect();
                if let Ok(v) = num.parse() { avg_ms = Some(v); }
            }
        }
    }

    if received > 0 && loss == 100.0 {
        loss = ((transmitted.saturating_sub(received)) as f32 / transmitted as f32) * 100.0;
    }

    PingDetails {
        ip: ip.to_string(),
        transmitted,
        received,
        packet_loss_percent: loss,
        min_ms,
        max_ms,
        avg_ms,
        raw_output: text.to_string(),
    }
}
