// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks, Components};
use std::collections::HashMap;
use std::fs;
use uuid::Uuid;
use directories::ProjectDirs;
use chrono::{Utc, DateTime, Duration};
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::env;

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
    interface_type: String,  // NEW: WiFi, Ethernet, etc.
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

            (
                interface_name.to_string(),
                NetworkInfo {
                    received: data.total_received(),
                    transmitted: data.total_transmitted(),
                    interface_type: interface_type.to_string(),
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
            "installedRAM": {"stringValue": format!("{} GB", system_info.memory_total / (1024 * 1024 * 1024))},
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
                "integerValue": (system_info.memory_total / (1024 * 1024 * 1024)).to_string()
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
            "installedRAM": {"stringValue": format!("{} GB", system_info.memory_total / (1024 * 1024 * 1024))},
            "systemType": {"stringValue": &system_info.system_type},
            "totalStorage": {"stringValue": if !system_info.disk_info.is_empty() { format!("{} GB", system_info.disk_info[0].total_space / (1024 * 1024 * 1024)) } else { "Unknown".to_string() }},
            "graphicsCard": {"stringValue": system_info.gpu_info.as_ref().map(|g| g.name.clone()).unwrap_or("Unknown".to_string())},
            "osInstallDate": {"stringValue": system_info.os_install_date.as_ref().map(|d| d.clone()).unwrap_or("Unknown".to_string())}
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

// Function to check if scan is due (2 weeks = 14 days)
fn is_scan_due() -> Result<bool, String> {
    match get_last_scan_time()? {
        None => Ok(true), // Never scanned before
        Some(last_scan) => {
            let now = Utc::now();
            let two_weeks = Duration::days(14);
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
        let next_scan = last_scan + Duration::days(14);
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
