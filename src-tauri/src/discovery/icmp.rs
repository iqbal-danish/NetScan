use std::net::Ipv4Addr;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

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

#[cfg(target_os = "windows")]
mod win_icmp {
    use std::net::Ipv4Addr;
    use std::os::raw::c_void;

    #[repr(C)]
    struct IpOptionInformation {
        ttl: u8,
        tos: u8,
        flags: u8,
        options_size: u8,
        options_data: *mut u8,
    }

    #[repr(C)]
    struct IcmpEchoReply {
        address: u32,
        status: u32,
        round_trip_time: u32,
        data_size: u16,
        reserved: u16,
        data: *mut c_void,
        options: IpOptionInformation,
    }

    #[link(name = "iphlpapi")]
    extern "system" {
        fn IcmpCreateFile() -> isize;
        fn IcmpCloseHandle(handle: isize) -> i32;
        fn IcmpSendEcho(
            handle: isize,
            destination_address: u32,
            request_data: *const c_void,
            request_size: u16,
            request_options: *const c_void,
            reply_buffer: *mut c_void,
            reply_size: u32,
            timeout: u32,
        ) -> u32;
    }

    pub fn ping_native(ip: Ipv4Addr, timeout_ms: u32) -> Option<u32> {
        unsafe {
            let handle = IcmpCreateFile();
            if handle == -1 || handle == 0 {
                return None;
            }

            let dest = u32::from_ne_bytes(ip.octets());
            let send_data = b"NetScan";
            let reply_size = std::mem::size_of::<IcmpEchoReply>() + 32;
            let mut reply_buf = vec![0u8; reply_size];

            let replies = IcmpSendEcho(
                handle,
                dest,
                send_data.as_ptr() as *const c_void,
                send_data.len() as u16,
                std::ptr::null(),
                reply_buf.as_mut_ptr() as *mut c_void,
                reply_size as u32,
                timeout_ms,
            );

            IcmpCloseHandle(handle);

            if replies > 0 {
                let reply = &*(reply_buf.as_ptr() as *const IcmpEchoReply);
                if reply.status == 0 {
                    return Some(reply.round_trip_time.max(1));
                }
            }
        }
        None
    }
}

/// Ping a single IP to measure reachability and round-trip time in ms.
/// Uses native Win32 IcmpSendEcho API (zero subprocess creation, completely silent)
pub fn ping_single(ip: Ipv4Addr) -> Option<u32> {
    #[cfg(target_os = "windows")]
    {
        if let Some(ms) = win_icmp::ping_native(ip, 400) {
            return Some(ms);
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
    let mut cmd = Command::new("ping");
    #[cfg(target_os = "windows")]
    {
        cmd.args(["-n", "4", "-w", "1000", ip_str]);
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new("ping");
    #[cfg(not(target_os = "windows"))]
    cmd.args(["-c", "4", "-W", "2", ip_str]);

    match cmd.output() {
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

#[allow(dead_code)]
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
