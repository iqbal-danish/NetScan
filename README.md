# NetScan — Production-Ready Standalone Wi-Fi & Local Network Scanner

**NetScan** is a fast, standalone desktop network utility designed to let users instantly see all devices connected to their current Wi-Fi/local network without opening the router's admin page or needing router credentials.

Built with **Tauri v2 + Rust** on the backend and **React + TypeScript + Tailwind CSS** on the frontend.

---

## ⚡ Key Highlights

* **Zero Router Credentials Required:** Discovers devices purely through non-invasive LAN discovery techniques.
* **100% Standalone & Local-First:** No cloud account, no telemetry, no remote network leaks. Your network telemetry stays strictly on your local computer.
* **Ultra-Fast Subnet Sweep:** Probes an entire `/24` subnet (254 hosts) concurrently in **~1.4 seconds** with streaming real-time device discovery.
* **Zero Driver Dependencies:** Uses native OS kernel ARP (`SendARP` in `iphlpapi.dll`), ICMP, NetBIOS, mDNS, and SSDP sockets — no WinPcap or Npcap drivers required!
* **Multi-Layer Network Discovery & Enrichment:**
  * **ARP Discovery:** Native kernel ARP requests + system ARP cache parsing.
  * **ICMP Echo:** Accurate round-trip response time measurements (ms) and interactive 4-packet Ping tests.
  * **NetBIOS Name Service:** Queries UDP 137 to resolve exact Windows PC and SMB computer names.
  * **mDNS / Bonjour:** Multicast DNS query on `224.0.0.251:5353` for Apple devices, Chromecasts, and printers.
  * **SSDP / UPnP:** M-SEARCH discovery on `239.255.255.250:1900` for Smart TVs, gateways, and media servers.
  * **OUI Manufacturer Matching:** Built-in MAC vendor database identifying Apple, Samsung, Intel, Arcadyan, TP-Link, Dell, HP, Sony, Xiaomi, Google, and more.
  * **Heuristic Device Classification:** Classifies devices as Router, Desktop, Laptop, Phone, Tablet, TV, Printer, Smart Speaker, IoT, Camera, or Server.
  * **Lightweight Service Probing:** Optional on-demand port checking (ports 80, 443, 22, 53, 445, 631, 3389, 5000, 8080, etc.).
* **Desktop UX:**
  * Slide-over Device Details Panel
  * Interactive 4-packet Ping Modal with latency statistics
  * One-click "Open in Browser" for HTTP/HTTPS services and routers
  * Custom device renaming locally (persisted across sessions)
  * Trust tags: `Trusted`, `Unknown`, `Ignored`
  * New device detection (`★ NEW`)
  * Historical Scan Sessions with timestamped device snapshots
  * Keyboard shortcuts: `Ctrl+R` (Scan Again), `Ctrl+F` (Search), `Esc` (Close Panel)

---

## 🏗 Architecture

```text
React + TypeScript (Tailwind CSS, Lucide Icons)
                   │
                   │ Tauri v2 IPC (commands & event streaming)
                   ▼
                 Rust
                   │
   ┌───────────────┼───────────────┬───────────────┐
   ▼               ▼               ▼               ▼
  ARP             ICMP           mDNS          SSDP/UPnP
(SendARP)       (Echo)        (224.0.0.251)  (239.255.255.250)
   │               │               │               │
   └───────────────┼───────────────┴───────────────┘
                   ▼
         Enrichment & Classification
      (OUI Vendor, NetBIOS, Port Check)
                   ▼
        Local Storage / Persistence
           (Aliases, Tags, History)
                   ▼
        Streaming Real-Time React UI
```

---

## 🚀 Running and Building

### Development Mode

```bash
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

The optimized standalone desktop executable is generated at:
```text
src-tauri/target/release/NetScan.exe
```

### Run Tests

Automated Rust unit and integration tests (testing CIDR calculations, IP range generation, OUI lookup, heuristic classification, storage persistence, and live network discovery):

```bash
cd src-tauri
cargo test -- --nocapture
```

---

## 🔒 Privacy & Safety Guarantee

NetScan strictly complies with non-invasive local network visibility rules:
* No arbitrary remote command execution.
* No passwords or credential storage.
* No brute-forcing, exploiting, or packet sniffing.
* Operates strictly within the user's active local subnet.
