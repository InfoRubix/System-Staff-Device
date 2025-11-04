// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks, Components};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    cpu_usage: f32,
    cpu_temperature: Option<f32>,  // NEW: CPU temperature in Celsius
    memory_total: u64,
    memory_used: u64,
    memory_available: u64,
    disk_info: Vec<DiskInfo>,
    network_info: HashMap<String, NetworkInfo>,
    os_name: String,
    os_version: String,
    cpu_name: String,
    cpu_cores: usize,
    gpu_info: Option<GpuInfo>,  // NEW: GPU information
    battery_info: Option<BatteryInfo>,  // NEW: Battery information
    system_uptime: u64,  // NEW: System uptime in seconds
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
    percentage: f32,
    is_charging: bool,
    health_status: String,
}

#[tauri::command]
fn get_system_info() -> Result<SystemInfo, String> {
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

    Ok(SystemInfo {
        cpu_usage,
        cpu_temperature,
        memory_total,
        memory_used,
        memory_available,
        disk_info,
        network_info,
        os_name,
        os_version,
        cpu_name,
        cpu_cores,
        gpu_info,
        battery_info,
        system_uptime,
    })
}

// Helper function to detect GPU
#[cfg(target_os = "windows")]
fn detect_gpu() -> Option<GpuInfo> {
    use windows::Win32::Graphics::Dxgi::*;
    use windows::Win32::Foundation::*;

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

// Helper function to detect battery
#[cfg(target_os = "windows")]
fn detect_battery() -> Option<BatteryInfo> {
    use windows::Win32::System::Power::*;

    unsafe {
        let mut status: SYSTEM_POWER_STATUS = std::mem::zeroed();

        if GetSystemPowerStatus(&mut status as *mut _).is_ok() {
            // Check if battery is present (ACLineStatus = 255 means unknown, typically means no battery)
            if status.BatteryFlag == 128 || status.ACLineStatus == 255 {
                return None; // No battery (desktop PC)
            }

            let percentage = status.BatteryLifePercent as f32;
            let is_charging = status.ACLineStatus == 1; // 1 = AC power (charging/plugged in)

            // Determine health status based on battery flags
            let health_status = if status.BatteryFlag & 8 != 0 {
                "Critical".to_string()
            } else if status.BatteryFlag & 4 != 0 {
                "Low".to_string()
            } else if percentage > 80.0 {
                "Good".to_string()
            } else {
                "Fair".to_string()
            };

            Some(BatteryInfo {
                percentage,
                is_charging,
                health_status,
            })
        } else {
            None // Failed to get battery status
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn detect_battery() -> Option<BatteryInfo> {
    None // Battery detection only implemented for Windows
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_cpu_usage,
            get_memory_usage
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
