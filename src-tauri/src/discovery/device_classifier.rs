use crate::models::device::ServiceInfo;

pub struct ClassificationInput<'a> {
    pub ip: &'a str,
    pub gateway_ip: Option<&'a str>,
    pub mac: Option<&'a str>,
    pub manufacturer: Option<&'a str>,
    pub hostname: Option<&'a str>,
    pub netbios_name: Option<&'a str>,
    pub ssdp_hint: Option<&'a str>,
    pub open_ports: &'a [ServiceInfo],
}

pub fn classify_device(input: &ClassificationInput) -> (String, String) {
    // Returns (device_type, suggested_display_name)
    // Device types: "router", "desktop", "laptop", "phone", "tablet", "printer", "tv", "game_console", "smart_speaker", "iot", "camera", "server", "unknown"

    let is_gateway = match input.gateway_ip {
        Some(gw) => gw == input.ip,
        None => input.ip.ends_with(".1"),
    };

    let host_lower = input.hostname.unwrap_or("").to_lowercase();
    let netbios_lower = input.netbios_name.unwrap_or("").to_lowercase();
    let vendor = input.manufacturer.unwrap_or("");
    let vendor_lower = vendor.to_lowercase();

    // 1. Check Gateway / Router
    if is_gateway || input.ssdp_hint == Some("router") || host_lower.contains("router") || host_lower.contains("gateway") {
        let name = if !vendor.is_empty() && vendor != "Unknown" {
            format!("{} Router", vendor)
        } else {
            "Gateway Router".to_string()
        };
        return ("router".to_string(), name);
    }

    if vendor_lower.contains("arcadyan") || vendor_lower.contains("tp-link") || vendor_lower.contains("netgear") || vendor_lower.contains("cisco") {
        if is_gateway || host_lower.contains("router") || input.open_ports.iter().any(|p| p.port == 53) {
            return ("router".to_string(), format!("{} Router", vendor));
        }
    }

    // 2. Printer check
    if input.open_ports.iter().any(|p| p.port == 631 || p.port == 9100)
        || host_lower.contains("printer")
        || host_lower.contains("print")
        || vendor_lower.contains("brother")
        || vendor_lower.contains("epson")
        || vendor_lower.contains("canon")
    {
        let name = if let Some(h) = input.hostname {
            h.to_string()
        } else if !vendor.is_empty() {
            format!("{} Printer", vendor)
        } else {
            "Network Printer".to_string()
        };
        return ("printer".to_string(), name);
    }

    // 3. TV / Media
    if input.ssdp_hint == Some("tv")
        || host_lower.contains("tv")
        || host_lower.contains("roku")
        || host_lower.contains("bravia")
        || host_lower.contains("chromecast")
        || host_lower.contains("firetv")
        || vendor_lower.contains("roku")
        || (vendor_lower.contains("lg") && host_lower.contains("webos"))
    {
        let name = if let Some(h) = input.hostname {
            h.to_string()
        } else if !vendor.is_empty() {
            format!("{} Smart TV", vendor)
        } else {
            "Smart TV".to_string()
        };
        return ("tv".to_string(), name);
    }

    // 4. Smart Speaker
    if vendor_lower.contains("sonos") || host_lower.contains("sonos") || host_lower.contains("echo") || host_lower.contains("homepod") {
        let name = if let Some(h) = input.hostname {
            h.to_string()
        } else {
            format!("{} Speaker", vendor)
        };
        return ("smart_speaker".to_string(), name);
    }

    // 5. Game Console
    if vendor_lower.contains("sony") && (host_lower.contains("playstation") || host_lower.contains("ps4") || host_lower.contains("ps5"))
        || host_lower.contains("xbox")
        || host_lower.contains("nintendo")
    {
        return ("game_console".to_string(), "Gaming Console".to_string());
    }

    // 6. Camera
    if input.open_ports.iter().any(|p| p.port == 554) || host_lower.contains("cam") || host_lower.contains("camera") {
        return ("camera".to_string(), "IP Camera".to_string());
    }

    // 7. IoT / Smart Home
    if vendor_lower.contains("espressif") || vendor_lower.contains("philips") || host_lower.contains("esp_") || host_lower.contains("tuya") {
        let name = if !vendor.is_empty() {
            format!("{} IoT Device", vendor)
        } else {
            "Smart Home Device".to_string()
        };
        return ("iot".to_string(), name);
    }

    // 8. Desktop / Laptop / PC
    let is_pc_hostname = host_lower.contains("desktop-")
        || host_lower.contains("laptop-")
        || host_lower.contains("-pc")
        || host_lower.contains("win-")
        || host_lower.contains("macbook")
        || host_lower.contains("imac");

    let is_pc_vendor = vendor_lower.contains("dell")
        || vendor_lower.contains("lenovo")
        || vendor_lower.contains("hp")
        || vendor_lower.contains("microsoft")
        || vendor_lower.contains("asus");

    let has_pc_ports = input.open_ports.iter().any(|p| p.port == 445 || p.port == 3389);

    if !netbios_lower.is_empty() || is_pc_hostname || (is_pc_vendor && has_pc_ports) {
        let disp_name = if let Some(nb) = input.netbios_name {
            nb.to_string()
        } else if let Some(h) = input.hostname {
            h.to_string()
        } else if !vendor.is_empty() {
            format!("{} PC", vendor)
        } else {
            "Computer".to_string()
        };

        let dev_type = if host_lower.contains("laptop") || host_lower.contains("macbook") {
            "laptop".to_string()
        } else {
            "desktop".to_string()
        };

        return (dev_type, disp_name);
    }

    // 9. Phone / Tablet
    if host_lower.contains("iphone") || host_lower.contains("galaxy") || host_lower.contains("pixel") || host_lower.contains("android") {
        let dev_type = if host_lower.contains("ipad") || host_lower.contains("tab") {
            "tablet".to_string()
        } else {
            "phone".to_string()
        };
        let disp_name = if let Some(h) = input.hostname {
            h.to_string()
        } else {
            format!("{} Phone", vendor)
        };
        return (dev_type, disp_name);
    }

    // 10. Apple / Samsung / Xiaomi fallback
    if vendor_lower == "apple" {
        return ("phone".to_string(), "Apple Device".to_string());
    }
    if vendor_lower == "samsung" {
        return ("phone".to_string(), "Samsung Device".to_string());
    }
    if vendor_lower == "xiaomi" {
        return ("phone".to_string(), "Xiaomi Device".to_string());
    }

    // 11. Generic fallback
    if let Some(h) = input.hostname {
        if !h.is_empty() {
            return ("unknown".to_string(), h.to_string());
        }
    }

    if !vendor.is_empty() && vendor != "Unknown" {
        return ("unknown".to_string(), format!("{} Device", vendor));
    }

    ("unknown".to_string(), format!("Device {}", input.ip))
}
