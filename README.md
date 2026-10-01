# NetScan — Standalone Wi-Fi & Local Network Scanner

**NetScan** is a fast, modern desktop network utility designed to let users instantly see all devices connected to their current Wi-Fi/local network without opening the router's admin page or needing router credentials.

Built with **Tauri v2 + Rust** on the backend and **React + TypeScript + Tailwind CSS** on the frontend.

---

## ⚡ Key Highlights

* **Zero Router Credentials Required:** Discovers devices purely through non-invasive LAN discovery techniques.
* **100% Standalone & Local-First:** No cloud accounts, no telemetry, no remote network leaks. Your network data stays strictly on your local machine.
* **Ultra-Fast Subnet Sweep:** Probes an entire `/24` subnet (254 hosts) concurrently in **~1.4 seconds** with streaming real-time device discovery.
* **Zero Driver Dependencies:** Uses native OS kernel ARP (`SendARP` in `iphlpapi.dll`), ICMP, NetBIOS, mDNS, and SSDP sockets — no WinPcap or Npcap drivers required!
* **Multi-Layer Network Discovery & Enrichment:**
  * **ARP Discovery:** Native kernel ARP requests + system ARP cache parsing.
  * **ICMP Echo:** Accurate round-trip response time measurements (ms) and interactive 4-packet Ping tests.
  * **NetBIOS Name Service:** Queries UDP 137 to resolve exact Windows PC and SMB computer names.
  * **Gateway Router Reverse DNS:** Resolves mobile hostnames (e.g. `OnePlus-13`, `OPPO-K12x-5G`, `Galaxy`, `iPhone`) via gateway router DHCP table queries.
  * **mDNS / Bonjour:** Multicast DNS query on `224.0.0.251:5353` for Apple devices, Chromecasts, and printers.
  * **SSDP / UPnP:** M-SEARCH discovery on `239.255.255.250:1900` for Smart TVs, gateways, and media servers.
  * **OUI Manufacturer Matching:** Built-in MAC vendor database identifying Apple, Samsung, Intel, Arcadyan, TP-Link, Dell, HP, Sony, Xiaomi, Google, and more.
  * **Heuristic Device Classification:** Classifies devices as Router, Desktop, Laptop, Phone, Tablet, TV, Printer, Smart Speaker, IoT, Camera, or Server.
  * **Smart Wi-Fi vs. Wired Inference:** Intelligently identifies Wi-Fi connections for phones, tablets, randomized MACs (IEEE 802.11 privacy), and wireless chipsets regardless of whether the scanning PC is on Ethernet or Wi-Fi.
  * **Lightweight Service Probing:** Optional on-demand port checking (ports 80, 443, 22, 53, 445, 631, 3389, 5000, 8080, etc.).
* **Security & Device Management:**
  * **Blacklist & Unblacklist Management:** Mark unauthorized or suspicious devices as blacklisted with 1-click toggles, persistent storage, visual alerts, intrusion warning banners when online, and a dedicated `[ ⛔ Blacklisted ]` filter.
  * **Trust Statuses:** Categorize devices as `Trusted`, `Unknown`, `Ignored`, or `Blacklisted`.
  * **Custom Renaming:** Assign friendly names to any device that persist across restarts.
  * **New Device Detection:** Highlights devices seen for the first time (`★ NEW`).
  * **Scan History:** Preserves timestamped historical scan snapshots.
* **Premium Desktop UX:**
  * Native black title bar with Windows DWM immersive dark mode styling.
  * Zero flashing CMD console windows — all background processes run silently via `CREATE_NO_WINDOW` and in-process Win32 APIs.
  * Slide-over Device Details Panel without navigating away from the list.
  * Interactive 4-packet Ping Modal with latency statistics.
  * One-click "Open in Browser" for HTTP/HTTPS web interfaces and routers.
  * Production app icons integrated across Windows Taskbar, File Explorer, and Start Menu.

---

## 📋 Prerequisites

To run NetScan from source or build the executable, ensure the following are installed on your machine:

### 1. Node.js & npm
* **Node.js:** v18.0.0 or later (v20+ recommended).
* Verify with:
  ```bash
  node -v
  npm -v
  ```

### 2. Rust Toolchain
* **Rust:** Stable toolchain (`rustc` and `cargo` 1.75+).
* Install via [rustup.rs](https://rustup.rs/):
  ```bash
  rustup update stable
  ```
* Verify with:
  ```bash
  rustc --version
  cargo --version
  ```

### 3. C++ Build Tools (Windows)
* Visual Studio 2022 (Community or Build Tools) with the **"Desktop development with C++"** workload selected.
* This provides `link.exe` and Windows SDK libraries required by Rust's MSVC target.

### 4. WebView2 Runtime (Windows)
* Pre-installed on Windows 10 (version 1809+) and Windows 11.
* If missing, download the [Microsoft Edge WebView2 Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## 🚀 How to Run

### Option 1: Quick Run (Standalone Executable)

If you already have the compiled executable:

1. Double-click **`NetScan.exe`** directly from the project root or release folder.
2. NetScan will immediately detect your active network (e.g. `192.168.1.0/24`) and start the initial device scan automatically.

---

### Option 2: Running from Source (Development Mode)

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/iqbal-danish/NetScan.git
   cd NetScan
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server & Desktop App:**
   ```bash
   npm run tauri dev
   ```
   This will launch Vite's development server (`http://localhost:1420`) and open the native Tauri desktop window with hot module reloading (HMR) enabled.

---

### Option 3: Building Standalone Production Binary

To compile an optimized, standalone Windows `.exe` with embedded assets:

```bash
npm run tauri -- build --no-bundle
```

* The standalone executable will be generated at:
  ```text
  src-tauri/target/release/NetScan.exe
  ```
* To create an MSI installer or full application package:
  ```bash
  npm run tauri build
  ```

---

## 🧪 Running Automated Tests

NetScan includes automated Rust unit and integration tests covering CIDR calculations, IP range generation, OUI manufacturer lookups, heuristic classification, connection type determination, storage persistence, and live subnet ARP scans:

```bash
cd src-tauri
cargo test -- --nocapture
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + R` | Scan network again |
| `Ctrl + F` | Focus search bar |
| `Esc` | Close Device Details panel or Ping modal |
| `Enter` | Save custom device name |

---

## 🔒 Privacy & Safety Guarantee

NetScan strictly complies with non-invasive local network visibility rules:
* **No remote code execution:** Does not attempt to execute remote commands or exploit devices.
* **No credential harvesting:** Does not store, intercept, or request router credentials.
* **No packet sniffing:** Uses standard network queries (ARP, ICMP echo, DNS, NetBIOS) rather than promiscuous packet capture.
* **Subnet restricted:** Operates strictly within the user's active local subnet.
