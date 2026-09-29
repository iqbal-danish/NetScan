use std::net::{Ipv4Addr, SocketAddr, UdpSocket};
use std::time::Duration;

/// Query NetBIOS Node Status on UDP port 137 to discover hostname (e.g. Windows Computer Name)
pub fn query_netbios_name(target_ip: Ipv4Addr) -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.set_read_timeout(Some(Duration::from_millis(350))).ok()?;
    socket.set_write_timeout(Some(Duration::from_millis(350))).ok()?;

    // NetBIOS Node Status Request packet for name '*'
    let mut packet = Vec::with_capacity(50);
    // Header
    packet.extend_from_slice(&[0x82, 0x28]); // Transaction ID
    packet.extend_from_slice(&[0x00, 0x00]); // Flags: Query
    packet.extend_from_slice(&[0x00, 0x01]); // Questions: 1
    packet.extend_from_slice(&[0x00, 0x00]); // Answer RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]); // Authority RRs: 0
    packet.extend_from_slice(&[0x00, 0x00]); // Additional RRs: 0

    // Question Name: '*' encoded as 0x20 followed by 'CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\0'
    packet.push(0x20); // Length of encoded name
    packet.extend_from_slice(b"CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    packet.push(0x00); // Terminator

    // Question Type & Class
    packet.extend_from_slice(&[0x00, 0x21]); // Type: NBSTAT
    packet.extend_from_slice(&[0x00, 0x01]); // Class: IN

    let target = SocketAddr::new(target_ip.into(), 137);
    socket.send_to(&packet, target).ok()?;

    let mut buf = [0u8; 1024];
    let (amt, _) = socket.recv_from(&mut buf).ok()?;

    // NetBIOS response parsing
    // Format: Header (12 bytes) + Question (optional) + Answer header
    // The number of names is at offset 56 (if standard response)
    if amt > 57 {
        let num_names = buf[56] as usize;
        let mut offset = 57;

        for _ in 0..num_names {
            if offset + 18 > amt {
                break;
            }
            let name_bytes = &buf[offset..offset + 15];
            let name_type = buf[offset + 15];
            let flags = u16::from_be_bytes([buf[offset + 16], buf[offset + 17]]);
            let is_group = (flags & 0x0800) != 0;

            if !is_group && (name_type == 0x00 || name_type == 0x20) {
                let name = String::from_utf8_lossy(name_bytes).trim().to_string();
                if !name.is_empty() && !name.starts_with("IS~") {
                    return Some(name);
                }
            }
            offset += 18;
        }
    }

    None
}
