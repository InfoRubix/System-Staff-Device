// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![recursion_limit = "512"]

use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks, Components};
use std::collections::HashMap;
use std::fs;
use uuid::Uuid;
use directories::ProjectDirs;
use chrono::{Utc, DateTime, Duration};
use tauri::Manager;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration as StdDuration;

#[cfg(target_os = "windows")]
use std::env;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    device_id: String,  // Unique device identifier
    device_token: String,  // Secure authentication token
    cpu_usage: f32,
    cpu_temperature: Option<f32>,  // NEW: CPU temperature in Celsius
    memory_total: u64,
    memory_used: u64,
    memory_available: u64,
    disk_info: Vec<DiskInfo>,
    network_info: HashMap<String, NetworkInfo>,
    os_name: String,
    os_version: String,
    os_install_date: Option<String>,  // NEW: OS installation date
    cpu_name: String,
    cpu_cores: usize,
    gpu_info: Option<GpuInfo>,  // NEW: GPU information
    battery_info: Option<BatteryInfo>,  // NEW: Battery information
    system_uptime: u64,  // NEW: System uptime in seconds
    computer_info: Option<ComputerInfo>,  // NEW: Computer manufacturer/model
    system_type: String,  // NEW: 32-bit or 64-bit
    antivirus_status: String,  // NEW: Antivirus status
    firewall_status: String,  // NEW: Firewall status
    active_window: Option<String>,  // NEW: Currently active window title
    running_processes: Vec<String>,  // NEW: List of running process names
    activity_status: String,  // NEW: active, idle, or inactive
    last_input_time: Option<u64>,  // NEW: Seconds since last keyboard/mouse input
}

#[derive(Debug, Serialize, Deserialize)]
struct ComputerInfo {
    manufacturer: String,
    model: String,
    computer_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DiskInfo {
    name: String,
    mount_point: String,
    total_space: u64,
    available_space: u64,
    used_space: u64,
    disk_type: String,  // NEW: HDD or SSD
    health_status: String,  // NEW: Health status
}

#[derive(Debug, Serialize, Deserialize)]
struct NetworkInfo {
    received: u64,
    transmitted: u64,
    interface_type: String,  // WiFi, Ethernet, etc.
    wifi_signal_strength: Option<u32>,  // Signal quality in percentage (0-100%)
    wifi_link_speed: Option<u32>,       // Connection speed in Mbps
    wifi_ssid: Option<String>,          // Network name (SSID)
    wifi_status: Option<String>,        // Connected/Disconnected
}

#[derive(Debug, Serialize, Deserialize)]
struct GpuInfo {
    name: String,
    available: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct BatteryInfo {
    percentage: f32,           // Current charge level (0-100%)
    is_charging: bool,
    health_status: String,
    design_capacity: u32,      // Original battery capacity (mWh)
    full_charge_capacity: u32, // Current max capacity (mWh)
    health_percent: f32,       // Battery health = full_charge / design * 100
    cycle_count: Option<u32>,  // Number of charge cycles (if available)
}

// Function to get or create device token
fn get_device_token() -> Result<(String, String), String> {
    // Get application data directory
    let proj_dirs = ProjectDirs::from("com", "DeviceMonitor", "SystemStaffDevice")
        .ok_or("Failed to get project directories")?;

    let data_dir = proj_dirs.data_dir();
    fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    let token_file = data_dir.join("device_token.txt");

    // Try to read existing token
    if token_file.exists() {
        let content = fs::read_to_string(&token_file)
            .map_err(|e| format!("Failed to read token file: {}", e))?;

        // Parse the file (format: device_id|device_token)
        let parts: Vec<&str> = content.trim().split('|').collect();
        if parts.len() == 2 {
            return Ok((parts[0].to_string(), parts[1].to_string()));
        }
    }

    // Generate new device ID and token
    let device_id = Uuid::new_v4().to_string();
    let device_token = Uuid::new_v4().to_string();

    // Save to file
    let content = format!("{}|{}", device_id, device_token);
    fs::write(&token_file, content)
        .map_err(|e| format!("Failed to write token file: {}", e))?;

    Ok((device_id, device_token))
}

// Helper function to round RAM to nearest standard size (4, 8, 16, 32, 64, 128 GB)
fn round_ram_to_standard(ram_gb: u64) -> u64 {
    let standard_sizes = [4, 8, 16, 32, 64, 128, 256];

    // Find the closest standard size
    for &size in &standard_sizes {
        if ram_gb <= size {
            return size;
        }
    }

    // If larger than all standard sizes, return as-is
    ram_gb
}

// Activity tracking functions
#[cfg(target_os = "windows")]
fn get_active_window() -> Option<String> {
    use std::process::Command;

    // Get the foreground window process name (the actual active window user is using)
    let output = Command::new("powershell")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(&[
            "-ExecutionPolicy", "Bypass",
            "-Command",
            r#"
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class Window {
                    [DllImport("user32.dll")]
                    public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")]
                    public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int processId);
                }
"@
            $hwnd = [Window]::GetForegroundWindow()
            $processId = 0
            [Window]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
            if ($processId -ne 0) {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    $processName = $process.ProcessName
                    $windowTitle = $process.MainWindowTitle
                    if ($windowTitle) {
                        Write-Output "$processName : $windowTitle"
                    } else {
                        Write-Output $processName
                    }
                }
            }
            "#
        ])
        .output()
        .ok()?;

    let result = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if result.is_empty() { None } else { Some(result) }
}

#[cfg(not(target_os = "windows"))]
fn get_active_window() -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn get_running_processes() -> Vec<String> {
    use std::process::Command;

    // Get only processes with visible windows (actual apps user opened)
    let output = Command::new("powershell")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(&[
            "-ExecutionPolicy", "Bypass",
            "-Command",
            r#"
            Get-Process | Where-Object {
                $_.MainWindowTitle -ne '' -and
                $_.ProcessName -notmatch 'svchost|csrss|winlogon|services|lsass|dwm|explorer|SearchHost|StartMenuExperienceHost|ShellExperienceHost|RuntimeBroker|ApplicationFrameHost|SystemSettings|TextInputHost'
            } | Select-Object ProcessName, MainWindowTitle -Unique | ForEach-Object {
                if ($_.MainWindowTitle) {
                    "$($_.ProcessName) - $($_.MainWindowTitle)"
                } else {
                    $_.ProcessName
                }
            }
            "#
        ])
        .output();

    if let Ok(output) = output {
        if let Ok(text) = String::from_utf8(output.stdout) {
            return text.lines()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .take(20) // Limit to 20 actual user apps
                .collect();
        }
    }
    Vec::new()
}

#[cfg(not(target_os = "windows"))]
fn get_running_processes() -> Vec<String> {
    Vec::new()
}

#[cfg(target_os = "windows")]
fn get_last_input_time() -> Option<u64> {
    use std::process::Command;
    // Get idle time in seconds using PowerShell
    let output = Command::new("powershell")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(&["-ExecutionPolicy", "Bypass", "-Command",
            "Add-Type @'\nusing System;\nusing System.Runtime.InteropServices;\npublic class IdleTime {\n    [DllImport(\"user32.dll\")]\n    static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);\n    [StructLayout(LayoutKind.Sequential)]\n    public struct LASTINPUTINFO {\n        public uint cbSize;\n        public uint dwTime;\n    }\n    public static uint GetIdleTime() {\n        LASTINPUTINFO lastInputInfo = new LASTINPUTINFO();\n        lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);\n        GetLastInputInfo(ref lastInputInfo);\n        return ((uint)Environment.TickCount - lastInputInfo.dwTime) / 1000;\n    }\n}\n'@\n[IdleTime]::GetIdleTime()"
        ])
        .output()
        .ok()?;

    let idle_str = String::from_utf8(output.stdout).ok()?.trim().to_string();
    idle_str.parse::<u64>().ok()
}

#[cfg(not(target_os = "windows"))]
fn get_last_input_time() -> Option<u64> {
    None
}

fn determine_activity_status() -> String {
    // Check CPU usage and last input time
    match get_last_input_time() {
        Some(secs) if secs < 300 => "active".to_string(), // Active if input < 5 mins ago
        Some(secs) if secs < 1800 => "idle".to_string(),  // Idle if input < 30 mins ago
        _ => "inactive".to_string(),
    }
}

// App usage tracking (tracks hours per app over 2-week period)
#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppUsageData {
    app_name: String,
    total_minutes: u64,  // Total minutes used
}

fn get_app_usage_file() -> Result<String, String> {
    let proj_dirs = ProjectDirs::from("com", "DeviceMonitor", "DeviceMonitor")
        .ok_or("Failed to get project directory")?;
    let data_dir = proj_dirs.data_dir();
    fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;
    Ok(data_dir.join("app_usage.json").to_string_lossy().to_string())
}

fn load_app_usage() -> HashMap<String, u64> {
    match get_app_usage_file() {
        Ok(file_path) => {
            if let Ok(content) = fs::read_to_string(&file_path) {
                if let Ok(data) = serde_json::from_str::<HashMap<String, u64>>(&content) {
                    return data;
                }
            }
        }
        Err(_) => {}
    }
    HashMap::new()
}

fn save_app_usage(usage_data: &HashMap<String, u64>) -> Result<(), String> {
    let file_path = get_app_usage_file()?;
    let json = serde_json::to_string_pretty(usage_data)
        .map_err(|e| format!("Failed to serialize app usage: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write app usage file: {}", e))?;
    Ok(())
}

fn get_top_apps(usage_data: &HashMap<String, u64>, limit: usize) -> Vec<AppUsageData> {
    let mut apps: Vec<_> = usage_data.iter()
        .map(|(name, &minutes)| AppUsageData {
            app_name: name.clone(),
            total_minutes: minutes,
        })
        .collect();

    // Sort by total minutes descending
    apps.sort_by(|a, b| b.total_minutes.cmp(&a.total_minutes));
    apps.into_iter().take(limit).collect()
}

fn reset_app_usage() -> Result<(), String> {
    let file_path = get_app_usage_file()?;
    fs::write(&file_path, "{}")
        .map_err(|e| format!("Failed to reset app usage: {}", e))?;
    Ok(())
}

// Start background thread to track app usage
fn start_app_usage_tracker() {
    thread::spawn(move || {
        let mut last_app: Option<String> = None;
        let check_interval = StdDuration::from_secs(60); // Check every minute

        loop {
            thread::sleep(check_interval);

            // Only track if user is active
            let status = determine_activity_status();
            if status != "active" {
                last_app = None;
                continue;
            }

            // Get current active window
            if let Some(active_window) = get_active_window() {
                // Extract app name (before " : " or " - ")
                let app_name = if let Some(pos) = active_window.find(" : ") {
                    active_window[..pos].to_string()
                } else if let Some(pos) = active_window.find(" - ") {
                    active_window[..pos].to_string()
                } else {
                    active_window.clone()
                };

                // Skip system apps and edge cases
                if app_name.to_lowercase().contains("system") ||
                   app_name.to_lowercase().contains("explorer") ||
                   app_name.to_lowercase().contains("taskmgr") ||
                   app_name.is_empty() {
                    continue;
                }

                // Load current usage
                let mut usage_data = load_app_usage();

                // Add 1 minute to this app
                *usage_data.entry(app_name.clone()).or_insert(0) += 1;

                // Save updated usage
                let _ = save_app_usage(&usage_data);

                last_app = Some(app_name);
            } else {
                last_app = None;
            }
        }
    });
}

// WiFi detection functions
#[cfg(target_os = "windows")]
fn get_wifi_info() -> (Option<u32>, Option<u32>, Option<String>, Option<String>) {
    use std::process::Command;

    // First, try to get WiFi info using netsh wlan
    let wifi_output = Command::new("netsh")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(&["wlan", "show", "interfaces"])
        .output();

    if let Ok(output) = wifi_output {
        if let Ok(text) = String::from_utf8(output.stdout) {
            if !text.trim().is_empty() && !text.contains("There is no wireless interface") {
                let mut signal: Option<u32> = None;
                let mut speed: Option<u32> = None;
                let mut ssid: Option<String> = None;
                let mut status: Option<String> = None;

                for line in text.lines() {
                    let line = line.trim();

                    // Parse signal strength
                    if line.starts_with("Signal") {
                        if let Some(value) = line.split(':').nth(1) {
                            let value = value.trim().replace("%", "");
                            signal = value.parse::<u32>().ok();
                        }
                    }

                    // Parse link speed (multiple formats)
                    // 1. Receive rate or Transmit rate (normal WiFi)
                    if line.contains("Receive rate") || line.contains("Transmit rate") {
                        if let Some(value) = line.split(':').nth(1) {
                            let value = value.trim().split_whitespace().next().unwrap_or("");
                            if let Ok(parsed_speed) = value.parse::<u32>() {
                                // Only update if we don't have a speed yet, or if this is higher
                                speed = Some(speed.unwrap_or(0).max(parsed_speed));
                            }
                        }
                    }

                    // 2. Radio type (for mobile hotspots and newer WiFi standards)
                    // Examples: "802.11n", "802.11ac", "802.11ax"
                    if line.starts_with("Radio type") && speed.is_none() {
                        if let Some(value) = line.split(':').nth(1) {
                            let radio_type = value.trim();
                            // Estimate speed based on radio type
                            speed = Some(match radio_type {
                                t if t.contains("802.11ax") || t.contains("Wi-Fi 6") => 1200, // WiFi 6: ~1.2 Gbps
                                t if t.contains("802.11ac") || t.contains("Wi-Fi 5") => 867,  // WiFi 5: ~867 Mbps
                                t if t.contains("802.11n") || t.contains("Wi-Fi 4") => 300,   // WiFi 4: ~300 Mbps
                                t if t.contains("802.11g") => 54,    // WiFi 3: 54 Mbps
                                t if t.contains("802.11a") => 54,    // WiFi 2: 54 Mbps
                                t if t.contains("802.11b") => 11,    // WiFi 1: 11 Mbps
                                _ => 100 // Unknown, assume 100 Mbps
                            });
                        }
                    }

                    // Parse SSID
                    if line.starts_with("SSID") && !line.contains("BSSID") {
                        if let Some(value) = line.split(':').nth(1) {
                            ssid = Some(value.trim().to_string());
                        }
                    }

                    // Parse connection status
                    if line.starts_with("State") {
                        if let Some(value) = line.split(':').nth(1) {
                            status = Some(value.trim().to_string());
                        }
                    }
                }

                // If we got WiFi data, return it
                if signal.is_some() || speed.is_some() || ssid.is_some() {
                    return (signal, speed, ssid, status);
                }
            }
        }
    }

    // Fallback: Check all network interfaces for active connection (Ethernet, USB tethering, mobile hotspot, etc.)
    let interface_output = Command::new("netsh")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(&["interface", "show", "interface"])
        .output();

    if let Ok(output) = interface_output {
        if let Ok(text) = String::from_utf8(output.stdout) {
            // Find the first connected interface
            for line in text.lines() {
                let line = line.trim();
                if line.contains("Connected") && !line.contains("Disconnected") {
                    // Extract interface name (last column)
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 4 {
                        let interface_name = parts[3..].join(" ");

                        // Try to get link speed using PowerShell (works for WiFi, Ethernet, and Mobile Hotspot)
                        let speed_output = Command::new("powershell")
                            .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
                            .args(&[
                                "-ExecutionPolicy", "Bypass",
                                "-Command",
                                // Search for adapter by partial name match (handles WiFi, Ethernet, and hotspot)
                                &format!("$adapter = Get-NetAdapter | Where-Object {{$_.Status -eq 'Up'}}; if ($adapter) {{ $adapter | Select-Object -First 1 -ExpandProperty LinkSpeed }}")
                            ])
                            .output();

                        if let Ok(speed_out) = speed_output {
                            if let Ok(speed_text) = String::from_utf8(speed_out.stdout) {
                                let speed_text = speed_text.trim();
                                // Parse speed like "1 Gbps" or "100 Mbps"
                                if let Some(speed_value) = speed_text.split_whitespace().next() {
                                    if let Ok(mut speed_num) = speed_value.parse::<u32>() {
                                        // Convert Gbps to Mbps if needed
                                        if speed_text.contains("Gbps") {
                                            speed_num *= 1000;
                                        }
                                        return (
                                            None, // No signal strength for non-WiFi
                                            Some(speed_num),
                                            Some(interface_name.clone()),
                                            Some("Connected".to_string())
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    (None, None, None, None)
}

#[cfg(not(target_os = "windows"))]
fn get_wifi_info() -> (Option<u32>, Option<u32>, Option<String>, Option<String>) {
    (None, None, None, None)
}

#[tauri::command]
fn get_system_info() -> Result<SystemInfo, String> {
    // Get or generate device token first
    let (device_id, device_token) = get_device_token()?;

    let mut sys = System::new_all();
    sys.refresh_all();

    // Get CPU usage (average across all cores)
    let cpu_usage = sys.global_cpu_usage();

    // Get CPU temperature
    let components = Components::new_with_refreshed_list();
    let cpu_temperature = components.list()
        .iter()
        .find(|comp| {
            let label = comp.label().to_lowercase();
            label.contains("cpu") || label.contains("processor") || label.contains("tctl")
        })
        .map(|comp| comp.temperature());

    // Get memory info
    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    let memory_available = sys.available_memory();

    // Get disk info with enhanced details
    let disks = Disks::new_with_refreshed_list();
    let disk_info: Vec<DiskInfo> = disks
        .list()
        .iter()
        .map(|disk| {
            let disk_type = match disk.kind() {
                sysinfo::DiskKind::HDD => "HDD",
                sysinfo::DiskKind::SSD => "SSD",
                _ => "Unknown",
            };

            // Estimate health based on available space
            let usage_percent = ((disk.total_space() - disk.available_space()) as f64 / disk.total_space() as f64) * 100.0;
            let health_status = if usage_percent > 90.0 {
                "Critical"
            } else if usage_percent > 80.0 {
                "Warning"
            } else {
                "Healthy"
            };

            DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                total_space: disk.total_space(),
                available_space: disk.available_space(),
                used_space: disk.total_space() - disk.available_space(),
                disk_type: disk_type.to_string(),
                health_status: health_status.to_string(),
            }
        })
        .collect();

    // Get network info with interface type
    let networks = Networks::new_with_refreshed_list();

    // Get WiFi information once (applies to all WiFi interfaces)
    let (wifi_signal, wifi_speed, wifi_ssid, wifi_status) = get_wifi_info();

    let network_info: HashMap<String, NetworkInfo> = networks
        .list()
        .iter()
        .map(|(interface_name, data)| {
            let name_lower = interface_name.to_lowercase();
            let interface_type = if name_lower.contains("wi-fi") || name_lower.contains("wifi") || name_lower.contains("wlan") {
                "WiFi"
            } else if name_lower.contains("ethernet") || name_lower.contains("eth") {
                "Ethernet"
            } else if name_lower.contains("bluetooth") {
                "Bluetooth"
            } else {
                "Other"
            };

            // Add WiFi metrics only for WiFi interfaces
            let (signal, speed, ssid, status) = if interface_type == "WiFi" {
                (wifi_signal, wifi_speed, wifi_ssid.clone(), wifi_status.clone())
            } else {
                (None, None, None, None)
            };

            (
                interface_name.to_string(),
                NetworkInfo {
                    received: data.total_received(),
                    transmitted: data.total_transmitted(),
                    interface_type: interface_type.to_string(),
                    wifi_signal_strength: signal,
                    wifi_link_speed: speed,
                    wifi_ssid: ssid,
                    wifi_status: status,
                }
            )
        })
        .collect();

    // Get OS info
    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());

    // Get CPU info
    let cpu_name = sys.cpus().first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();

    // Get GPU info (simplified - detect if discrete GPU exists)
    let gpu_info = detect_gpu();

    // Get battery info
    let battery_info = detect_battery();

    // Get system uptime
    let system_uptime = System::uptime();

    // Get computer info (manufacturer, model, name)
    let computer_info = detect_computer_info();

    // Get system type (32-bit or 64-bit)
    let system_type = detect_system_type();

    // Get OS install date
    let os_install_date = get_os_install_date();

    // Get antivirus status
    let antivirus_status = detect_antivirus_status();

    // Get firewall status
    let firewall_status = detect_firewall_status();

    Ok(SystemInfo {
        device_id,
        device_token,
        cpu_usage,
        cpu_temperature,
        memory_total,
        memory_used,
        memory_available,
        disk_info,
        network_info,
        os_name,
        os_version,
        os_install_date,
        cpu_name,
        cpu_cores,
        gpu_info,
        battery_info,
        system_uptime,
        computer_info,
        system_type,
        antivirus_status,
        firewall_status,
        active_window: get_active_window(),
        running_processes: get_running_processes(),
        activity_status: determine_activity_status(),
        last_input_time: get_last_input_time(),
    })
}

// Helper function to detect GPU
#[cfg(target_os = "windows")]
fn detect_gpu() -> Option<GpuInfo> {
    use windows::Win32::Graphics::Dxgi::*;

    unsafe {
        // Try to create DXGI factory to enumerate GPUs
        let factory: IDXGIFactory1 = match CreateDXGIFactory1() {
            Ok(f) => f,
            Err(_) => return Some(GpuInfo {
                name: "Unable to detect GPU".to_string(),
                available: false,
            }),
        };

        // Try to get the first adapter (GPU)
        match factory.EnumAdapters1(0) {
            Ok(adapter) => {
                match adapter.GetDesc1() {
                    Ok(desc) => {
                        // Convert wide string to String
                        let gpu_name = String::from_utf16_lossy(&desc.Description)
                            .trim_end_matches('\0')
                            .to_string();

                        Some(GpuInfo {
                            name: gpu_name,
                            available: true,
                        })
                    }
                    Err(_) => Some(GpuInfo {
                        name: "GPU detected but name unavailable".to_string(),
                        available: true,
                    }),
                }
            }
            Err(_) => Some(GpuInfo {
                name: "No discrete GPU detected".to_string(),
                available: false,
            }),
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn detect_gpu() -> Option<GpuInfo> {
    Some(GpuInfo {
        name: "GPU detection only available on Windows".to_string(),
        available: false,
    })
}

// Helper function to detect battery with health information
#[cfg(target_os = "windows")]
fn detect_battery() -> Option<BatteryInfo> {
    use windows::Win32::System::Power::*;
    use wmi::{COMLibrary, WMIConnection};
    use serde::Deserialize;

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct Win32Battery {
        design_capacity: Option<u32>,
        full_charge_capacity: Option<u32>,
        estimated_charge_remaining: Option<u16>,
    }

    // First get basic power status
    let (percentage, is_charging) = unsafe {
        let mut status: SYSTEM_POWER_STATUS = std::mem::zeroed();

        if GetSystemPowerStatus(&mut status as *mut _).is_ok() {
            // Check if battery is present
            if status.BatteryFlag == 128 || status.ACLineStatus == 255 {
                return None; // No battery (desktop PC)
            }

            let pct = status.BatteryLifePercent as f32;
            let charging = status.ACLineStatus == 1;
            (pct, charging)
        } else {
            return None;
        }
    };

    // Now get battery health via WMI
    let (design_capacity, full_charge_capacity, cycle_count) = match COMLibrary::new() {
        Ok(com_lib) => {
            match WMIConnection::new(com_lib) {
                Ok(wmi_con) => {
                    // Query Win32_Battery for capacity info
                    let batteries: Result<Vec<Win32Battery>, _> = wmi_con.query();
                    match batteries {
                        Ok(bats) if !bats.is_empty() => {
                            let bat = &bats[0];
                            (
                                bat.design_capacity.unwrap_or(0),
                                bat.full_charge_capacity.unwrap_or(0),
                                None::<u32> // Cycle count not available in Win32_Battery
                            )
                        }
                        _ => (0, 0, None)
                    }
                }
                Err(_) => (0, 0, None)
            }
        }
        Err(_) => (0, 0, None)
    };

    // Calculate battery health percentage
    let health_percent = if design_capacity > 0 && full_charge_capacity > 0 {
        (full_charge_capacity as f32 / design_capacity as f32) * 100.0
    } else {
        100.0 // Assume 100% if we can't get capacity data
    };

    // Determine health status based on battery health percentage
    let health_status = if health_percent >= 80.0 {
        "Good".to_string()
    } else if health_percent >= 60.0 {
        "Fair".to_string()
    } else if health_percent >= 40.0 {
        "Poor".to_string()
    } else {
        "Critical".to_string() // Battery needs replacement
    };

    Some(BatteryInfo {
        percentage,
        is_charging,
        health_status,
        design_capacity,
        full_charge_capacity,
        health_percent,
        cycle_count,
    })
}

#[cfg(not(target_os = "windows"))]
fn detect_battery() -> Option<BatteryInfo> {
    None // Battery detection only implemented for Windows
}

// Helper function to detect computer manufacturer and model using WMI
#[cfg(target_os = "windows")]
fn detect_computer_info() -> Option<ComputerInfo> {
    use wmi::{COMLibrary, WMIConnection};
    use serde::Deserialize;
    use std::process::Command;

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct Win32ComputerSystem {
        manufacturer: Option<String>,
        model: Option<String>,
        name: Option<String>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct Win32BaseBoard {
        manufacturer: Option<String>,
        product: Option<String>,
    }

    // Try Win32_ComputerSystem first
    let mut manufacturer = String::from("Unknown");
    let mut model = String::from("Unknown");
    let mut computer_name = String::from("Unknown");

    if let Ok(com_lib) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_lib.clone()) {
            // Try Win32_ComputerSystem
            if let Ok(systems) = wmi_con.query::<Win32ComputerSystem>() {
                if let Some(system) = systems.first() {
                    if let Some(m) = &system.manufacturer {
                        if !m.is_empty() && m != "To Be Filled By O.E.M." {
                            manufacturer = m.clone();
                        }
                    }
                    if let Some(m) = &system.model {
                        if !m.is_empty() && m != "To Be Filled By O.E.M." {
                            model = m.clone();
                        }
                    }
                    if let Some(n) = &system.name {
                        if !n.is_empty() {
                            computer_name = n.clone();
                        }
                    }
                }
            }

            // If model is still Unknown, try Win32_BaseBoard
            if model == "Unknown" {
                if let Ok(com_lib2) = COMLibrary::new() {
                    if let Ok(wmi_con2) = WMIConnection::new(com_lib2) {
                        if let Ok(boards) = wmi_con2.query::<Win32BaseBoard>() {
                            if let Some(board) = boards.first() {
                                if manufacturer == "Unknown" {
                                    if let Some(m) = &board.manufacturer {
                                        if !m.is_empty() && m != "To Be Filled By O.E.M." {
                                            manufacturer = m.clone();
                                        }
                                    }
                                }
                                if let Some(p) = &board.product {
                                    if !p.is_empty() && p != "To Be Filled By O.E.M." {
                                        model = p.clone();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // If still Unknown, try using WMIC command as fallback
    if model == "Unknown" || manufacturer == "Unknown" {
        if let Ok(output) = Command::new("wmic")
            .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
            .args(&["computersystem", "get", "manufacturer,model", "/format:list"])
            .output()
        {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    if manufacturer == "Unknown" && line.starts_with("Manufacturer=") {
                        let value = line.replace("Manufacturer=", "").trim().to_string();
                        if !value.is_empty() && value != "To Be Filled By O.E.M." {
                            manufacturer = value;
                        }
                    }
                    if model == "Unknown" && line.starts_with("Model=") {
                        let value = line.replace("Model=", "").trim().to_string();
                        if !value.is_empty() && value != "To Be Filled By O.E.M." {
                            model = value;
                        }
                    }
                }
            }
        }
    }

    Some(ComputerInfo {
        manufacturer,
        model,
        computer_name,
    })
}

#[cfg(not(target_os = "windows"))]
fn detect_computer_info() -> Option<ComputerInfo> {
    None
}

// Helper function to detect system type (32-bit or 64-bit)
fn detect_system_type() -> String {
    if cfg!(target_pointer_width = "64") {
        "64-bit".to_string()
    } else if cfg!(target_pointer_width = "32") {
        "32-bit".to_string()
    } else {
        "Unknown".to_string()
    }
}

// Helper function to detect antivirus status using WMI SecurityCenter2
#[cfg(target_os = "windows")]
fn detect_antivirus_status() -> String {
    use wmi::{COMLibrary, WMIConnection};
    use serde::Deserialize;

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct AntiVirusProduct {
        display_name: Option<String>,
        product_state: Option<u32>,
    }

    // Try to query Windows Security Center
    match COMLibrary::new() {
        Ok(com_lib) => {
            // Try SecurityCenter2 (Windows 7+)
            match WMIConnection::with_namespace_path("ROOT\\SecurityCenter2", com_lib) {
                Ok(wmi_con) => {
                    // Query for antivirus products
                    match wmi_con.query::<AntiVirusProduct>() {
                        Ok(products) => {
                            if products.is_empty() {
                                // No third-party AV, might be using Windows Defender
                                return "Active (Windows Defender)".to_string();
                            }

                            // Check each antivirus product
                            for product in products {
                                if let Some(state) = product.product_state {
                                    // Decode product state bits (WSC_SECURITY_PRODUCT_STATE)
                                    // Byte 1 (bits 8-15): Product state
                                    //   0x00 = Off, 0x01 = On, 0x02 = Snoozed, 0x03 = Expired
                                    // Byte 2 (bits 16-23): Scanner state
                                    //   0x00 = Up to date, 0x10 = Out of date
                                    let scanner_state = (state >> 8) & 0xFF;
                                    let enabled = scanner_state == 0x10 || scanner_state == 0x11;
                                    let up_to_date = (state >> 16) & 0xFF == 0x00;

                                    // Get product name
                                    let name = product.display_name.unwrap_or("Unknown AV".to_string());

                                    if enabled {
                                        if up_to_date {
                                            return format!("Active ({})", name);
                                        } else {
                                            return format!("Outdated ({})", name);
                                        }
                                    } else {
                                        return format!("Inactive ({})", name);
                                    }
                                }
                            }
                            "Unknown".to_string()
                        }
                        Err(_) => "Active (Windows Defender)".to_string(),
                    }
                }
                Err(_) => {
                    // SecurityCenter2 not available, assume Windows Defender is active
                    "Active (Windows Defender)".to_string()
                }
            }
        }
        Err(_) => "Active (Windows Defender)".to_string(),
    }
}

#[cfg(not(target_os = "windows"))]
fn detect_antivirus_status() -> String {
    "Unknown".to_string()
}

// Helper function to detect firewall status (Windows + Third-party)
#[cfg(target_os = "windows")]
fn detect_firewall_status() -> String {
    use std::process::Command;
    use wmi::{COMLibrary, WMIConnection};
    use serde::Deserialize;

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct FirewallProduct {
        display_name: Option<String>,
        product_state: Option<u32>,
    }

    // First, check for third-party firewalls via Windows Security Center
    let third_party_firewall: Option<String> = match COMLibrary::new() {
        Ok(com_lib) => {
            match WMIConnection::with_namespace_path("ROOT\\SecurityCenter2", com_lib) {
                Ok(wmi_con) => {
                    let firewalls: Result<Vec<FirewallProduct>, _> = wmi_con.query();
                    match firewalls {
                        Ok(products) => {
                            // Find active third-party firewall
                            let mut result: Option<String> = None;
                            for product in products {
                                if let (Some(name), Some(state)) = (&product.display_name, product.product_state) {
                                    // Skip Windows Firewall in this check
                                    if name.to_lowercase().contains("windows") {
                                        continue;
                                    }

                                    // Check if firewall is enabled
                                    // Product state bits: byte 1 (bits 8-15) = scanner state
                                    // 0x10 = ON, 0x00 = OFF
                                    let scanner_state = (state >> 8) & 0xFF;
                                    let is_enabled = scanner_state == 0x10 || scanner_state == 0x11;

                                    if is_enabled {
                                        result = Some(format!("Active ({})", name));
                                    } else {
                                        result = Some(format!("Inactive ({})", name));
                                    }
                                    break; // Found a third-party firewall, stop searching
                                }
                            }
                            result
                        }
                        Err(_) => None
                    }
                }
                Err(_) => None
            }
        }
        Err(_) => None
    };

    // If third-party firewall found, return that
    if let Some(firewall_status) = third_party_firewall {
        return firewall_status;
    }

    // Otherwise, check Windows Firewall using netsh
    let output = Command::new("netsh")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(["advfirewall", "show", "allprofiles", "state"])
        .output();

    match output {
        Ok(result) => {
            let output_str = String::from_utf8_lossy(&result.stdout).to_lowercase();

            // Count how many profiles are ON vs OFF
            let on_count = output_str.matches("on").count();
            let off_count = output_str.matches("off").count();

            if on_count > 0 && off_count == 0 {
                "Active (Windows Firewall)".to_string()
            } else if on_count > 0 && off_count > 0 {
                "Partial (Windows Firewall - Some profiles disabled)".to_string()
            } else if off_count > 0 {
                "Inactive (Windows Firewall)".to_string()
            } else {
                "Active (Windows Firewall)".to_string()
            }
        }
        Err(_) => {
            "Active (Windows Firewall)".to_string()
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn detect_firewall_status() -> String {
    "Unknown".to_string()
}

// Helper function to get OS install date
#[cfg(target_os = "windows")]
fn get_os_install_date() -> Option<String> {
    use wmi::{COMLibrary, WMIConnection};
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct Win32OperatingSystem {
        InstallDate: Option<String>,
    }

    match COMLibrary::new() {
        Ok(com_lib) => {
            match WMIConnection::new(com_lib) {
                Ok(wmi_con) => {
                    let results: Result<Vec<Win32OperatingSystem>, _> = wmi_con.query();
                    match results {
                        Ok(os_list) if !os_list.is_empty() => {
                            os_list[0].InstallDate.clone()
                        }
                        _ => None,
                    }
                }
                Err(_) => None,
            }
        }
        Err(_) => None,
    }
}

#[cfg(not(target_os = "windows"))]
fn get_os_install_date() -> Option<String> {
    None
}

// Function to register/update device in devices collection
fn register_device(system_info: &SystemInfo, staff_email: &str, staff_name: &str, department: &str) -> Result<(), String> {
    // Firebase configuration - loaded from environment variables at BUILD TIME
    // Set these in your .env file before building
    const FIREBASE_PROJECT_ID: &str = env!("TAURI_FIREBASE_PROJECT_ID");
    const FIREBASE_API_KEY: &str = env!("TAURI_FIREBASE_API_KEY");

    // Use deviceId as document ID to ensure one device per device ID
    let device_doc_id = &system_info.device_id;

    // Build Firestore REST API URL for devices collection with specific document ID
    let url = format!(
        "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents/devices/{}?key={}",
        FIREBASE_PROJECT_ID, device_doc_id, FIREBASE_API_KEY
    );

    // Get current timestamp
    let now = Utc::now();

    // Create device document
    let device_doc = serde_json::json!({
        "fields": {
            "deviceId": {"stringValue": system_info.device_id},
            "deviceToken": {"stringValue": system_info.device_token},
            "staffEmail": {"stringValue": staff_email},
            "staffName": {"stringValue": staff_name},
            "department": {"stringValue": department},
            "osVersion": {"stringValue": format!("{} {}", system_info.os_name, system_info.os_version)},
            "cpuName": {"stringValue": &system_info.cpu_name},
            "cpuCores": {"integerValue": system_info.cpu_cores.to_string()},
            "totalMemory": {"integerValue": system_info.memory_total.to_string()},
            "gpuName": {"stringValue": system_info.gpu_info.as_ref().map(|g| g.name.clone()).unwrap_or("Unknown".to_string())},
            "lastSeen": {"timestampValue": now.to_rfc3339()},
            "createdAt": {"timestampValue": now.to_rfc3339()},
            "updatedAt": {"timestampValue": now.to_rfc3339()},
            "status": {"stringValue": "active"}
        }
    });

    // Use PATCH to update if exists, or create if not exists
    let client = reqwest::blocking::Client::new();
    let response = client
        .patch(&url)
        .header("Content-Type", "application/json")
        .json(&device_doc)
        .send()
        .map_err(|e| format!("Failed to register device: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Firebase error registering device: {} - {}", response.status(), response.text().unwrap_or_default()))
    }
}

// Function to create/update staff collection
fn register_staff(system_info: &SystemInfo, staff_email: &str, staff_name: &str, department: &str) -> Result<(), String> {
    // Firebase configuration - loaded from environment variables at BUILD TIME
    const FIREBASE_PROJECT_ID: &str = env!("TAURI_FIREBASE_PROJECT_ID");
    const FIREBASE_API_KEY: &str = env!("TAURI_FIREBASE_API_KEY");

    // Use email as document ID (replace @ and . with _)
    let staff_doc_id = staff_email.replace('@', "_").replace('.', "_");

    // Build Firestore REST API URL for staff collection
    let url = format!(
        "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents/staff/{}?key={}",
        FIREBASE_PROJECT_ID, staff_doc_id, FIREBASE_API_KEY
    );

    // Get current timestamp
    let now = Utc::now();

    // Create staff document
    let staff_doc = serde_json::json!({
        "fields": {
            "name": {"stringValue": staff_name},
            "email": {"stringValue": staff_email},
            "department": {"stringValue": department},
            // Computer/Device Info
            "deviceInfo": {
                "mapValue": {
                    "fields": {
                        "computerName": {"stringValue": system_info.computer_info.as_ref().map(|c| c.computer_name.clone()).unwrap_or("Unknown".to_string())},
                        "manufacturer": {"stringValue": system_info.computer_info.as_ref().map(|c| c.manufacturer.clone()).unwrap_or("Unknown".to_string())},
                        "model": {"stringValue": system_info.computer_info.as_ref().map(|c| c.model.clone()).unwrap_or("Unknown".to_string())}
                    }
                }
            },
            // System Info
            "processor": {"stringValue": &system_info.cpu_name},
            "installedRAM": {"stringValue": format!("{} GB", round_ram_to_standard(system_info.memory_total / (1024 * 1024 * 1024)))},
            "systemType": {"stringValue": &system_info.system_type},
            // Storage Info
            "totalStorage": {"stringValue": if !system_info.disk_info.is_empty() {
                format!("{} GB {}",
                    system_info.disk_info[0].total_space / (1024 * 1024 * 1024),
                    system_info.disk_info[0].disk_type)
            } else {
                "Unknown".to_string()
            }},
            // Graphics
            "graphicsCard": {"stringValue": system_info.gpu_info.as_ref().map(|g| g.name.clone()).unwrap_or("Unknown".to_string())},
            // OS Info
            "osVersion": {"stringValue": format!("{} {}", system_info.os_name, system_info.os_version)},
            "osInstallDate": {"stringValue": system_info.os_install_date.as_ref().map(|d| d.clone()).unwrap_or("Unknown".to_string())},
            // Timestamps
            "registeredDate": {"timestampValue": now.to_rfc3339()},
            "lastUpdated": {"timestampValue": now.to_rfc3339()}
        }
    });

    // Use PATCH to update if exists, or create if not exists
    let client = reqwest::blocking::Client::new();
    let response = client
        .patch(&url)
        .header("Content-Type", "application/json")
        .json(&staff_doc)
        .send()
        .map_err(|e| format!("Failed to register staff: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Firebase error registering staff: {} - {}", response.status(), response.text().unwrap_or_default()))
    }
}

// Function to submit device scan to Firebase
fn submit_device_scan(system_info: &SystemInfo, staff_email: &str, staff_name: &str, department: &str) -> Result<(), String> {
    // Firebase configuration - loaded from environment variables at BUILD TIME
    const FIREBASE_PROJECT_ID: &str = env!("TAURI_FIREBASE_PROJECT_ID");
    const FIREBASE_API_KEY: &str = env!("TAURI_FIREBASE_API_KEY");

    // First, register/update staff in staff collection
    register_staff(system_info, staff_email, staff_name, department)?;

    // Then, register/update the device in devices collection
    register_device(system_info, staff_email, staff_name, department)?;

    // Build Firestore REST API URL for device_scans
    let url = format!(
        "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents/device_scans?key={}",
        FIREBASE_PROJECT_ID, FIREBASE_API_KEY
    );

    // Calculate metrics
    let ram_usage_percent = (system_info.memory_used as f64 / system_info.memory_total as f64) * 100.0;
    let disk_free_gb = if !system_info.disk_info.is_empty() {
        system_info.disk_info[0].available_space as f64 / (1024.0 * 1024.0 * 1024.0)
    } else {
        0.0
    };

    // Get disk health status from first disk
    let disk_health = if !system_info.disk_info.is_empty() {
        let health = &system_info.disk_info[0].health_status;
        // Convert "Healthy" to "Good" to match React component expectations
        if health == "Healthy" { "Good" } else { health.as_str() }
    } else {
        "Good"
    };

    // Get battery info (default values if no battery/desktop)
    let battery_charge = system_info.battery_info.as_ref()
        .map(|b| b.percentage as f64)
        .unwrap_or(100.0);
    let battery_health = system_info.battery_info.as_ref()
        .map(|b| b.health_percent as f64)
        .unwrap_or(100.0);

    // Determine overall status
    // CRITICAL = Real hardware/security issues that need immediate attention
    // WARNING = Temporary issues OR hardware starting to degrade
    // HEALTHY = Everything is fine

    // Check for REAL critical issues (not temporary)
    let has_critical_issue =
        disk_free_gb < 10.0 ||  // Very low disk space (real problem)
        system_info.antivirus_status.contains("Inactive") ||  // Security risk
        system_info.firewall_status.contains("Inactive") ||  // Security risk
        battery_health < 40.0;  // Battery severely degraded, needs replacement

    // Check for warning issues (temporary or minor degradation)
    let has_warning_issue =
        disk_free_gb < 30.0 ||  // Low disk space
        system_info.cpu_usage > 90.0 ||  // Very high CPU (only warning, not critical)
        ram_usage_percent > 90.0 ||  // Very high RAM (only warning, not critical)
        battery_health < 60.0 ||  // Battery degrading, plan for replacement
        (battery_charge < 20.0 && !system_info.battery_info.as_ref().map(|b| b.is_charging).unwrap_or(true));  // Low charge AND not plugged in

    let overall_status = if has_critical_issue {
        "Critical"
    } else if has_warning_issue {
        "Warning"
    } else {
        "Healthy"
    };

    // Build issues array with proper structure (type, message, severity)
    // Severity levels:
    // - "critical" = Real hardware/security problem, needs immediate fix
    // - "high" = Important but not urgent
    // - "medium" = Temporary issue, can be fixed easily (restart, clean, charge)
    // - "low" = Minor, informational
    let mut issues = Vec::new();

    // CPU check - Only warning, not critical (temporary issue)
    if system_info.cpu_usage > 90.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "High CPU Usage"},
                    "message": {"stringValue": format!("CPU usage is at {:.1}% - Close unused apps or restart", system_info.cpu_usage)},
                    "severity": {"stringValue": "medium"}
                }
            }
        }));
    }

    // RAM check - Only warning, not critical (temporary issue)
    if ram_usage_percent > 90.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "High RAM Usage"},
                    "message": {"stringValue": format!("RAM usage is at {:.1}% - Close unused apps or restart", ram_usage_percent)},
                    "severity": {"stringValue": "medium"}
                }
            }
        }));
    }

    // Disk space check - Critical if very low, medium if just low
    if disk_free_gb < 10.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Very Low Disk Space"},
                    "message": {"stringValue": format!("Only {:.1} GB free - Delete files immediately!", disk_free_gb)},
                    "severity": {"stringValue": "critical"}
                }
            }
        }));
    } else if disk_free_gb < 30.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Low Disk Space"},
                    "message": {"stringValue": format!("Only {:.1} GB free - Consider cleaning up", disk_free_gb)},
                    "severity": {"stringValue": "medium"}
                }
            }
        }));
    }

    // Battery HEALTH check - Real hardware degradation
    if battery_health < 40.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Battery Degraded"},
                    "message": {"stringValue": format!("Battery health at {:.0}% - Battery needs replacement!", battery_health)},
                    "severity": {"stringValue": "critical"}
                }
            }
        }));
    } else if battery_health < 60.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Battery Wearing"},
                    "message": {"stringValue": format!("Battery health at {:.0}% - Plan for replacement soon", battery_health)},
                    "severity": {"stringValue": "high"}
                }
            }
        }));
    } else if battery_health < 80.0 {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Battery Aging"},
                    "message": {"stringValue": format!("Battery health at {:.0}% - Normal wear, monitor over time", battery_health)},
                    "severity": {"stringValue": "low"}
                }
            }
        }));
    }

    // Battery CHARGE check - Only if not plugged in (temporary issue)
    if battery_charge < 20.0 && !system_info.battery_info.as_ref().map(|b| b.is_charging).unwrap_or(true) {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Low Battery Charge"},
                    "message": {"stringValue": format!("Battery at {:.0}% - Please plug in your device", battery_charge)},
                    "severity": {"stringValue": "low"}
                }
            }
        }));
    }

    // Antivirus check - Show actual antivirus name and status
    if system_info.antivirus_status.contains("Inactive") {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Antivirus Disabled"},
                    "message": {"stringValue": format!("{} - Enable it immediately for security!", system_info.antivirus_status)},
                    "severity": {"stringValue": "critical"}
                }
            }
        }));
    } else if system_info.antivirus_status.contains("Outdated") {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Antivirus Outdated"},
                    "message": {"stringValue": format!("{} - Update virus definitions!", system_info.antivirus_status)},
                    "severity": {"stringValue": "high"}
                }
            }
        }));
    }

    // Firewall check - Show actual firewall name and status
    if system_info.firewall_status.contains("Inactive") {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Firewall Disabled"},
                    "message": {"stringValue": format!("{} - Enable it immediately for security!", system_info.firewall_status)},
                    "severity": {"stringValue": "critical"}
                }
            }
        }));
    } else if system_info.firewall_status.contains("Partial") {
        issues.push(serde_json::json!({
            "mapValue": {
                "fields": {
                    "type": {"stringValue": "Firewall Partial"},
                    "message": {"stringValue": format!("{} - Enable all firewall profiles!", system_info.firewall_status)},
                    "severity": {"stringValue": "high"}
                }
            }
        }));
    }

    // Build network_info map
    let mut network_info_map = serde_json::Map::new();
    for (name, info) in &system_info.network_info {
        let mut wifi_fields = serde_json::Map::new();
        wifi_fields.insert("received".to_string(), serde_json::json!({"integerValue": info.received.to_string()}));
        wifi_fields.insert("transmitted".to_string(), serde_json::json!({"integerValue": info.transmitted.to_string()}));
        wifi_fields.insert("interface_type".to_string(), serde_json::json!({"stringValue": &info.interface_type}));

        if let Some(signal) = info.wifi_signal_strength {
            wifi_fields.insert("wifi_signal_strength".to_string(), serde_json::json!({"integerValue": signal.to_string()}));
        } else {
            wifi_fields.insert("wifi_signal_strength".to_string(), serde_json::json!({"nullValue": null}));
        }

        if let Some(speed) = info.wifi_link_speed {
            wifi_fields.insert("wifi_link_speed".to_string(), serde_json::json!({"integerValue": speed.to_string()}));
        } else {
            wifi_fields.insert("wifi_link_speed".to_string(), serde_json::json!({"nullValue": null}));
        }

        if let Some(ssid) = &info.wifi_ssid {
            wifi_fields.insert("wifi_ssid".to_string(), serde_json::json!({"stringValue": ssid}));
        } else {
            wifi_fields.insert("wifi_ssid".to_string(), serde_json::json!({"nullValue": null}));
        }

        if let Some(status) = &info.wifi_status {
            wifi_fields.insert("wifi_status".to_string(), serde_json::json!({"stringValue": status}));
        } else {
            wifi_fields.insert("wifi_status".to_string(), serde_json::json!({"nullValue": null}));
        }

        network_info_map.insert(name.clone(), serde_json::json!({"mapValue": {"fields": wifi_fields}}));
    }

    // Build running_processes array
    let running_processes_array: Vec<serde_json::Value> = system_info.running_processes.iter()
        .map(|p| serde_json::json!({"stringValue": p}))
        .collect();

    // Build active_window value
    let active_window_value = if let Some(window) = &system_info.active_window {
        serde_json::json!({"stringValue": window})
    } else {
        serde_json::json!({"nullValue": null})
    };

    // Build last_input_time value
    let last_input_time_value = if let Some(time) = system_info.last_input_time {
        serde_json::json!({"integerValue": time.to_string()})
    } else {
        serde_json::json!({"nullValue": null})
    };

    // Get top 10 apps from usage tracking
    let usage_data = load_app_usage();
    let top_apps = get_top_apps(&usage_data, 10);

    // Build top_apps array for Firebase (pre-build to avoid JSON macro recursion)
    let top_apps_array: Vec<serde_json::Value> = top_apps.iter()
        .map(|app| {
            let app_fields = serde_json::json!({
                "appName": {"stringValue": &app.app_name},
                "totalMinutes": {"integerValue": app.total_minutes.to_string()},
                "totalHours": {"doubleValue": (app.total_minutes as f64 / 60.0)}
            });
            serde_json::json!({"mapValue": {"fields": app_fields}})
        })
        .collect();

    // Create Firestore document format
    let firestore_doc = serde_json::json!({
        "fields": {
            "deviceId": {"stringValue": system_info.device_id},
            "deviceToken": {"stringValue": system_info.device_token},
            "staffEmail": {"stringValue": staff_email},
            "staffName": {"stringValue": staff_name},
            "department": {"stringValue": department},
            "deviceType": {"stringValue": if system_info.battery_info.is_some() { "Laptop" } else { "Desktop" }},
            "scanTimestamp": {"timestampValue": Utc::now().to_rfc3339()},
            "cpuUsage": {"doubleValue": system_info.cpu_usage as f64},
            "ramUsage": {"doubleValue": ram_usage_percent},
            "diskSpaceFree": {"doubleValue": disk_free_gb},
            "diskHealth": {"stringValue": disk_health},
            // Battery data - charge level and health
            "batteryCharge": {
                "doubleValue": system_info.battery_info.as_ref().map(|b| b.percentage as f64).unwrap_or(0.0)
            },
            "batteryHealth": {
                "doubleValue": system_info.battery_info.as_ref().map(|b| b.health_percent as f64).unwrap_or(100.0)
            },
            "batteryDesignCapacity": {
                "integerValue": system_info.battery_info.as_ref().map(|b| b.design_capacity.to_string()).unwrap_or("0".to_string())
            },
            "batteryFullChargeCapacity": {
                "integerValue": system_info.battery_info.as_ref().map(|b| b.full_charge_capacity.to_string()).unwrap_or("0".to_string())
            },
            "batteryHealthStatus": {
                "stringValue": system_info.battery_info.as_ref().map(|b| b.health_status.clone()).unwrap_or("N/A".to_string())
            },
            // RAM total for tracking changes
            "ramTotal": {
                "integerValue": (round_ram_to_standard(system_info.memory_total / (1024 * 1024 * 1024))).to_string()
            },
            // CPU temperature for tracking
            "cpuTemperature": {
                "doubleValue": system_info.cpu_temperature.unwrap_or(0.0) as f64
            },
            "osVersion": {"stringValue": format!("{} {}", system_info.os_name, system_info.os_version)},
            "antivirusStatus": {"stringValue": &system_info.antivirus_status},
            "firewallStatus": {"stringValue": &system_info.firewall_status},
            "overallStatus": {"stringValue": overall_status},
            "issues": {"arrayValue": {"values": issues}},
            // Hardware info
            "computerManufacturer": {"stringValue": system_info.computer_info.as_ref().map(|c| c.manufacturer.clone()).unwrap_or("Unknown".to_string())},
            "computerModel": {"stringValue": system_info.computer_info.as_ref().map(|c| c.model.clone()).unwrap_or("Unknown".to_string())},
            "computerName": {"stringValue": system_info.computer_info.as_ref().map(|c| c.computer_name.clone()).unwrap_or("Unknown".to_string())},
            "processor": {"stringValue": &system_info.cpu_name},
            "installedRAM": {"stringValue": format!("{} GB", round_ram_to_standard(system_info.memory_total / (1024 * 1024 * 1024)))},
            "systemType": {"stringValue": &system_info.system_type},
            "totalStorage": {"stringValue": if !system_info.disk_info.is_empty() { format!("{} GB", system_info.disk_info[0].total_space / (1024 * 1024 * 1024)) } else { "Unknown".to_string() }},
            "graphicsCard": {"stringValue": system_info.gpu_info.as_ref().map(|g| g.name.clone()).unwrap_or("Unknown".to_string())},
            "osInstallDate": {"stringValue": system_info.os_install_date.as_ref().map(|d| d.clone()).unwrap_or("Unknown".to_string())},
            // Activity tracking data
            "active_window": active_window_value,
            "running_processes": {
                "arrayValue": {
                    "values": running_processes_array
                }
            },
            "activity_status": {"stringValue": &system_info.activity_status},
            "last_input_time": last_input_time_value,
            // Top 10 most used apps (2-week period)
            "top_apps": {
                "arrayValue": {
                    "values": top_apps_array
                }
            },
            // Network info (WiFi data)
            "network_info": {
                "mapValue": {
                    "fields": network_info_map
                }
            }
        }
    });

    // Send HTTP POST request
    let client = reqwest::blocking::Client::new();
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&firestore_doc)
        .send()
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if response.status().is_success() {
        // Reset app usage tracking for next 2-week period
        let _ = reset_app_usage();
        Ok(())
    } else {
        Err(format!("Firebase error: {} - {}", response.status(), response.text().unwrap_or_default()))
    }
}

#[tauri::command]
fn get_cpu_usage() -> Result<f32, String> {
    let mut sys = System::new_all();
    sys.refresh_cpu_all();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();
    Ok(sys.global_cpu_usage())
}

#[tauri::command]
fn get_memory_usage() -> Result<(u64, u64), String> {
    let mut sys = System::new_all();
    sys.refresh_memory();
    Ok((sys.used_memory(), sys.total_memory()))
}

#[tauri::command]
fn scan_and_submit_device_data(staff_email: String, staff_name: String, department: String) -> Result<String, String> {
    // Convert department to uppercase for consistency
    let department_upper = department.to_uppercase();

    // Get system info
    let system_info = get_system_info()?;

    // Submit to Firebase
    submit_device_scan(&system_info, &staff_email, &staff_name, &department_upper)?;

    // Update last scan time
    update_last_scan_time()?;

    Ok(format!("Device scan submitted successfully for {}", staff_email))
}

// Function to get last scan time
fn get_last_scan_time() -> Result<Option<DateTime<Utc>>, String> {
    let proj_dirs = ProjectDirs::from("com", "DeviceMonitor", "SystemStaffDevice")
        .ok_or("Failed to get project directories")?;

    let data_dir = proj_dirs.data_dir();
    let scan_file = data_dir.join("last_scan.txt");

    if !scan_file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&scan_file)
        .map_err(|e| format!("Failed to read last scan file: {}", e))?;

    DateTime::parse_from_rfc3339(&content)
        .map(|dt| Some(dt.with_timezone(&Utc)))
        .map_err(|e| format!("Failed to parse last scan time: {}", e))
}

// Function to update last scan time
fn update_last_scan_time() -> Result<(), String> {
    let proj_dirs = ProjectDirs::from("com", "DeviceMonitor", "SystemStaffDevice")
        .ok_or("Failed to get project directories")?;

    let data_dir = proj_dirs.data_dir();
    fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    let scan_file = data_dir.join("last_scan.txt");
    let now = Utc::now();

    fs::write(&scan_file, now.to_rfc3339())
        .map_err(|e| format!("Failed to write last scan time: {}", e))?;

    Ok(())
}

// Function to check if scan is due (2 weeks)
fn is_scan_due() -> Result<bool, String> {
    match get_last_scan_time()? {
        None => Ok(true), // Never scanned before
        Some(last_scan) => {
            let now = Utc::now();
            let two_weeks = Duration::weeks(2);
            Ok(now.signed_duration_since(last_scan) >= two_weeks)
        }
    }
}

#[tauri::command]
fn check_and_run_auto_scan(staff_email: String, staff_name: String, department: String) -> Result<String, String> {
    if is_scan_due()? {
        scan_and_submit_device_data(staff_email, staff_name, department)?;
        Ok("Auto-scan completed successfully".to_string())
    } else {
        let last_scan = get_last_scan_time()?.unwrap();
        let next_scan = last_scan + Duration::weeks(2);
        Ok(format!("Scan not due yet. Next scan: {}", next_scan.format("%Y-%m-%d %H:%M:%S")))
    }
}

// Register app to start automatically on Windows boot
#[cfg(target_os = "windows")]
fn register_auto_start() -> Result<(), Box<dyn std::error::Error>> {
    use std::process::Command;

    let exe_path = env::current_exe()?;
    let exe_path_str = exe_path.to_str().ok_or("Invalid path")?;

    // Add --minimized flag so app starts in tray on boot
    let startup_command = format!("\"{}\" --minimized", exe_path_str);

    // Use reg.exe to add to Windows startup
    Command::new("reg")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW - Hide console
        .args(&[
            "add",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v",
            "DeviceMonitor",
            "/t",
            "REG_SZ",
            "/d",
            &startup_command,
            "/f"  // Force overwrite if exists
        ])
        .output()?;

    println!("✅ Registered app for auto-start on boot (minimized to tray)");
    Ok(())
}

fn main() {
    use tauri::{Manager, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, MouseButton, MouseButtonState}};

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Auto-open DevTools in debug builds with devtools_build feature
            #[cfg(feature = "devtools_build")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                    println!("🔧 DevTools opened automatically (debug build)");
                }
            }

            // Register for auto-start on Windows
            #[cfg(target_os = "windows")]
            {
                if let Err(e) = register_auto_start() {
                    eprintln!("⚠️ Failed to register auto-start: {}", e);
                }
            }

            // Check if started from boot (minimized start)
            let args: Vec<String> = std::env::args().collect();
            let start_minimized = args.contains(&"--minimized".to_string());

            // Create system tray menu
            let show_item = MenuItem::with_id(app, "show", "Open Device Monitor", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Build system tray icon - MUST keep it alive, not drop it!
            let tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Device Monitor - Running")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // IMPORTANT: Store tray in app state to prevent it from being dropped!
            app.manage(tray);

            // Handle window close event - minimize to tray instead of exit
            if let Some(window) = app.get_webview_window("main") {
                // Start hidden if launched from boot
                if start_minimized {
                    let _ = window.hide();
                    println!("🚀 Device Monitor started minimized to tray (auto-start)");
                } else {
                    println!("🚀 Device Monitor started with window visible");
                }

                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                        println!("✅ Window hidden to tray");
                    }
                });
            }

            // Start app usage tracker in background
            start_app_usage_tracker();
            println!("📊 App usage tracker started");

            println!("🚀 Device Monitor started with system tray");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_cpu_usage,
            get_memory_usage,
            scan_and_submit_device_data,
            check_and_run_auto_scan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
