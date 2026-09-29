use crate::models::device::ServiceInfo;
use crate::discovery::oui::is_randomized_mac;

pub struct ClassificationInput<'a> {
    pub ip: &'a str,
    pub gateway_ip: Option<&'a str>,
    pub mac: Option<&'a str>,
    pub manufacturer: Option<&'a str>,
    pub hostname: Option<&'a str>,
    pub netbios_name: Option<&'a str>,
    pub ssdp_hint: Option<&'a str>,
    pub http_title: Option<&'a str>,
    pub http_server: Option<&'a str>,
    pub open_ports: &'a [ServiceInfo],
}

pub struct ClassificationResult {
    pub device_type: String,
    pub display_name: String,
    pub manufacturer: Option<String>,
}

pub fn classify_device(input: &ClassificationInput) -> ClassificationResult {
    let is_gateway = match input.gateway_ip {
        Some(gw) => gw == input.ip,
        None => input.ip.ends_with(".1"),
    };

    let host_raw = input.hostname.unwrap_or("");
    let host_lower = host_raw.to_lowercase();
    let netbios_raw = input.netbios_name.unwrap_or("");
    let netbios_lower = netbios_raw.to_lowercase();
    let mut vendor = input.manufacturer.unwrap_or("").to_string();
    let title_lower = input.http_title.unwrap_or("").to_lowercase();
    let _server_lower = input.http_server.unwrap_or("").to_lowercase();

    // 0. Infer vendor from hostname if missing
    if vendor.is_empty() || vendor == "Unknown" {
        if host_lower.contains("oneplus") {
            vendor = "OnePlus".to_string();
        } else if host_lower.contains("oppo") {
            vendor = "OPPO".to_string();
        } else if host_lower.contains("iphone") || host_lower.contains("ipad") || host_lower.contains("apple") {
            vendor = "Apple".to_string();
        } else if host_lower.contains("galaxy") || host_lower.contains("samsung") {
            vendor = "Samsung".to_string();
        } else if host_lower.contains("pixel") {
            vendor = "Google".to_string();
        } else if host_lower.contains("xiaomi") || host_lower.contains("redmi") || host_lower.contains("poco") {
            vendor = "Xiaomi".to_string();
        } else if host_lower.contains("realme") {
            vendor = "Realme".to_string();
        } else if host_lower.contains("vivo") || host_lower.contains("iqoo") {
            vendor = "Vivo".to_string();
        } else if host_lower.contains("rtk_gw") || title_lower.contains("realtek") {
            vendor = "Realtek".to_string();
        } else if host_lower.contains("arcadyan") || title_lower.contains("arcadyan") {
            vendor = "Arcadyan".to_string();
        } else if host_lower.contains("brother") {
            vendor = "Brother".to_string();
        } else if host_lower.contains("epson") {
            vendor = "Epson".to_string();
        } else if host_lower.contains("canon") {
            vendor = "Canon".to_string();
        } else if host_lower.contains("hp") || host_lower.contains("laserjet") || host_lower.contains("deskjet") {
            vendor = "HP".to_string();
        } else if input.mac.map_or(false, |m| is_randomized_mac(m)) {
            vendor = "Private MAC (Mobile Privacy)".to_string();
        }
    }

    let vendor_lower = vendor.to_lowercase();

    // 1. Gateway / Router Check
    if is_gateway || host_lower.contains("rtk_gw") || host_lower.contains("router") || host_lower.contains("gateway") || input.ssdp_hint == Some("router") {
        let name = if let Some(title) = input.http_title {
            if !title.is_empty() && !title.to_lowercase().contains("login") {
                title.to_string()
            } else if !vendor.is_empty() && !vendor.starts_with("Private") {
                format!("{} Router", vendor)
            } else {
                "Gateway Router".to_string()
            }
        } else if host_raw == "RTK_GW" {
            "Realtek Home Gateway".to_string()
        } else if !vendor.is_empty() && !vendor.starts_with("Private") {
            format!("{} Router", vendor)
        } else {
            "Gateway Router".to_string()
        };

        return ClassificationResult {
            device_type: "router".to_string(),
            display_name: name,
            manufacturer: if !vendor.is_empty() { Some(vendor) } else { None },
        };
    }

    // 2. Specific Smartphone / Tablet detection (e.g. OnePlus-13, OPPO-K12x-5G)
    if host_lower.contains("oneplus")
        || host_lower.contains("oppo")
        || host_lower.contains("iphone")
        || host_lower.contains("galaxy")
        || host_lower.contains("pixel")
        || host_lower.contains("redmi")
        || host_lower.contains("xiaomi")
        || host_lower.contains("realme")
        || host_lower.contains("vivo")
    {
        let is_tablet = host_lower.contains("pad") || host_lower.contains("tab");
        let dev_type = if is_tablet { "tablet" } else { "phone" };
        let formatted_name = host_raw.replace('-', " ");

        return ClassificationResult {
            device_type: dev_type.to_string(),
            display_name: formatted_name,
            manufacturer: if !vendor.is_empty() { Some(vendor) } else { None },
        };
    }

    // 3. Printer Check
    if input.open_ports.iter().any(|p| p.port == 631 || p.port == 9100)
        || host_lower.contains("printer")
        || host_lower.contains("print")
        || vendor_lower.contains("brother")
        || vendor_lower.contains("epson")
        || vendor_lower.contains("canon")
    {
        let name = if !host_raw.is_empty() {
            host_raw.replace('-', " ")
        } else if !vendor.is_empty() {
            format!("{} Printer", vendor)
        } else {
            "Network Printer".to_string()
        };

        return ClassificationResult {
            device_type: "printer".to_string(),
            display_name: name,
            manufacturer: if !vendor.is_empty() { Some(vendor) } else { None },
        };
    }

    // 4. TV / Media
    if input.ssdp_hint == Some("tv")
        || host_lower.contains("tv")
        || host_lower.contains("roku")
        || host_lower.contains("bravia")
        || host_lower.contains("chromecast")
        || host_lower.contains("firetv")
        || vendor_lower.contains("roku")
        || (vendor_lower.contains("lg") && host_lower.contains("webos"))
        || input.open_ports.iter().any(|p| p.port == 8008 || p.port == 8009)
    {
        let name = if !host_raw.is_empty() {
            host_raw.replace('-', " ")
        } else if !vendor.is_empty() {
            format!("{} Smart TV", vendor)
        } else {
            "Smart TV".to_string()
        };

        return ClassificationResult {
            device_type: "tv".to_string(),
            display_name: name,
            manufacturer: if !vendor.is_empty() { Some(vendor) } else { None },
        };
    }

    // 5. Desktop / Laptop / PC Check
    let is_pc_hostname = host_lower.contains("desktop-")
        || host_lower.contains("laptop-")
        || host_lower.contains("-pc")
        || host_lower.contains("win-")
        || host_lower.contains("macbook")
        || host_lower.contains("imac")
        || host_lower.contains("cb-5cg");

    let is_pc_vendor = vendor_lower.contains("dell")
        || vendor_lower.contains("lenovo")
        || vendor_lower.contains("hp")
        || vendor_lower.contains("microsoft")
        || vendor_lower.contains("asus")
        || vendor_lower.contains("intel")
        || vendor_lower.contains("realtek");

    let has_pc_ports = input.open_ports.iter().any(|p| p.port == 445 || p.port == 3389 || p.port == 139);

    if !netbios_lower.is_empty() || is_pc_hostname || (is_pc_vendor && has_pc_ports) {
        let disp_name = if !netbios_raw.is_empty() {
            netbios_raw.to_string()
        } else if !host_raw.is_empty() {
            host_raw.to_string()
        } else if !vendor.is_empty() && !vendor.starts_with("Private") {
            format!("{} PC", vendor)
        } else {
            "Personal Computer".to_string()
        };

        let dev_type = if host_lower.contains("laptop") || host_lower.contains("macbook") {
            "laptop"
        } else {
            "desktop"
        };

        return ClassificationResult {
            device_type: dev_type.to_string(),
            display_name: disp_name,
            manufacturer: if !vendor.is_empty() { Some(vendor) } else { None },
        };
    }

    // 6. Generic Mobile Device if MAC is randomized
    if input.mac.map_or(false, |m| is_randomized_mac(m)) {
        let name = if !host_raw.is_empty() {
            host_raw.replace('-', " ")
        } else {
            "Mobile Device (Private Wi-Fi)".to_string()
        };

        return ClassificationResult {
            device_type: "phone".to_string(),
            display_name: name,
            manufacturer: Some("Private MAC (Mobile Privacy)".to_string()),
        };
    }

    // 7. General vendor fallback
    if vendor_lower == "apple" {
        return ClassificationResult {
            device_type: "phone".to_string(),
            display_name: if !host_raw.is_empty() { host_raw.to_string() } else { "Apple Device".to_string() },
            manufacturer: Some(vendor),
        };
    }

    if vendor_lower == "samsung" {
        return ClassificationResult {
            device_type: "phone".to_string(),
            display_name: if !host_raw.is_empty() { host_raw.to_string() } else { "Samsung Device".to_string() },
            manufacturer: Some(vendor),
        };
    }

    // 8. Final fallback
    let disp_name = if !host_raw.is_empty() {
        host_raw.to_string()
    } else if !vendor.is_empty() && vendor != "Unknown" {
        format!("{} Device", vendor)
    } else {
        format!("Device {}", input.ip)
    };

    ClassificationResult {
        device_type: "unknown".to_string(),
        display_name: disp_name,
        manufacturer: if !vendor.is_empty() { Some(vendor) } else { None },
    }
}
