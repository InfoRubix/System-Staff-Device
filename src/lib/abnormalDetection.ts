// Abnormal Hardware Change Detection Service
// Compares current scan with previous scans to detect unusual changes

export interface ScanData {
  id: string;
  deviceId: string;
  scanTimestamp: Date;
  batteryHealth?: number;
  batteryCharge?: number;
  ramTotal?: number;
  cpuTemperature?: number;
  diskSpaceFree?: number;
  cpuUsage?: number;
  ramUsage?: number;
}

export interface AbnormalChange {
  type: 'battery' | 'ram' | 'cpu_temp' | 'disk' | 'performance';
  severity: 'warning' | 'critical';
  message: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
}

// Thresholds for abnormal detection
const THRESHOLDS = {
  // Battery health drop thresholds (in 2 weeks)
  BATTERY_HEALTH_WARNING: 5,    // 5% drop = warning
  BATTERY_HEALTH_CRITICAL: 10,  // 10% drop = critical (abnormal!)

  // RAM total change (should never change unless hardware issue)
  RAM_CHANGE_WARNING: 1,        // Any RAM change is suspicious

  // CPU temperature increase from baseline
  CPU_TEMP_WARNING: 15,         // 15°C higher than usual
  CPU_TEMP_CRITICAL: 25,        // 25°C higher = cooling issue

  // Disk space rapid decrease (in 2 weeks)
  DISK_WARNING: 20,             // Lost 20GB
  DISK_CRITICAL: 50,            // Lost 50GB (possible issue or malware)
};

/**
 * Compare current scan with previous scan to detect abnormal changes
 */
export function detectAbnormalChanges(
  currentScan: ScanData,
  previousScan: ScanData | null
): AbnormalChange[] {
  const abnormalChanges: AbnormalChange[] = [];

  if (!previousScan) {
    return abnormalChanges; // No previous scan to compare
  }

  // 1. Check Battery Health (capacity degradation)
  if (currentScan.batteryHealth && previousScan.batteryHealth) {
    const batteryDrop = previousScan.batteryHealth - currentScan.batteryHealth;

    if (batteryDrop >= THRESHOLDS.BATTERY_HEALTH_CRITICAL) {
      abnormalChanges.push({
        type: 'battery',
        severity: 'critical',
        message: `Battery health dropped ${batteryDrop.toFixed(1)}% in 2 weeks! This is abnormal - battery may be failing.`,
        previousValue: previousScan.batteryHealth,
        currentValue: currentScan.batteryHealth,
        changePercent: batteryDrop,
      });
    } else if (batteryDrop >= THRESHOLDS.BATTERY_HEALTH_WARNING) {
      abnormalChanges.push({
        type: 'battery',
        severity: 'warning',
        message: `Battery health dropped ${batteryDrop.toFixed(1)}% since last scan. Monitor for further degradation.`,
        previousValue: previousScan.batteryHealth,
        currentValue: currentScan.batteryHealth,
        changePercent: batteryDrop,
      });
    }
  }

  // 2. Check RAM Total (hardware change detection)
  if (currentScan.ramTotal && previousScan.ramTotal) {
    const ramDiff = previousScan.ramTotal - currentScan.ramTotal;

    if (Math.abs(ramDiff) >= THRESHOLDS.RAM_CHANGE_WARNING) {
      abnormalChanges.push({
        type: 'ram',
        severity: ramDiff > 0 ? 'critical' : 'warning',
        message: ramDiff > 0
          ? `RAM decreased from ${previousScan.ramTotal}GB to ${currentScan.ramTotal}GB! Possible hardware failure.`
          : `RAM changed from ${previousScan.ramTotal}GB to ${currentScan.ramTotal}GB. Hardware upgrade detected.`,
        previousValue: previousScan.ramTotal,
        currentValue: currentScan.ramTotal,
        changePercent: (ramDiff / previousScan.ramTotal) * 100,
      });
    }
  }

  // 3. Check CPU Temperature (cooling issues)
  if (currentScan.cpuTemperature && previousScan.cpuTemperature) {
    const tempIncrease = currentScan.cpuTemperature - previousScan.cpuTemperature;

    if (tempIncrease >= THRESHOLDS.CPU_TEMP_CRITICAL) {
      abnormalChanges.push({
        type: 'cpu_temp',
        severity: 'critical',
        message: `CPU temperature increased by ${tempIncrease.toFixed(0)}°C! Check cooling system - may need cleaning or thermal paste replacement.`,
        previousValue: previousScan.cpuTemperature,
        currentValue: currentScan.cpuTemperature,
        changePercent: tempIncrease,
      });
    } else if (tempIncrease >= THRESHOLDS.CPU_TEMP_WARNING) {
      abnormalChanges.push({
        type: 'cpu_temp',
        severity: 'warning',
        message: `CPU running ${tempIncrease.toFixed(0)}°C hotter than last scan. Consider cleaning dust from vents.`,
        previousValue: previousScan.cpuTemperature,
        currentValue: currentScan.cpuTemperature,
        changePercent: tempIncrease,
      });
    }
  }

  // 4. Check Disk Space (rapid decrease)
  if (currentScan.diskSpaceFree && previousScan.diskSpaceFree) {
    const diskLost = previousScan.diskSpaceFree - currentScan.diskSpaceFree;

    if (diskLost >= THRESHOLDS.DISK_CRITICAL) {
      abnormalChanges.push({
        type: 'disk',
        severity: 'critical',
        message: `Disk space decreased by ${diskLost.toFixed(0)}GB in 2 weeks! Check for large downloads or potential malware.`,
        previousValue: previousScan.diskSpaceFree,
        currentValue: currentScan.diskSpaceFree,
        changePercent: (diskLost / previousScan.diskSpaceFree) * 100,
      });
    } else if (diskLost >= THRESHOLDS.DISK_WARNING) {
      abnormalChanges.push({
        type: 'disk',
        severity: 'warning',
        message: `Disk space decreased by ${diskLost.toFixed(0)}GB since last scan. Consider cleaning up files.`,
        previousValue: previousScan.diskSpaceFree,
        currentValue: currentScan.diskSpaceFree,
        changePercent: (diskLost / previousScan.diskSpaceFree) * 100,
      });
    }
  }

  return abnormalChanges;
}

/**
 * Get the previous scan for a device to compare with current
 */
export function findPreviousScan(
  deviceId: string,
  allScans: ScanData[],
  currentScanId: string
): ScanData | null {
  // Filter scans for this device, excluding current scan
  const deviceScans = allScans
    .filter(scan => scan.deviceId === deviceId && scan.id !== currentScanId)
    .sort((a, b) => b.scanTimestamp.getTime() - a.scanTimestamp.getTime());

  // Return the most recent previous scan
  return deviceScans.length > 0 ? deviceScans[0] : null;
}

/**
 * Analyze all scans and return devices with abnormal changes
 */
export function analyzeAllDevicesForAbnormalities(
  scans: ScanData[]
): Map<string, AbnormalChange[]> {
  const abnormalitiesByDevice = new Map<string, AbnormalChange[]>();

  // Group scans by device
  const scansByDevice = new Map<string, ScanData[]>();
  scans.forEach(scan => {
    const deviceScans = scansByDevice.get(scan.deviceId) || [];
    deviceScans.push(scan);
    scansByDevice.set(scan.deviceId, deviceScans);
  });

  // Analyze each device
  scansByDevice.forEach((deviceScans, deviceId) => {
    // Sort by timestamp (newest first)
    deviceScans.sort((a, b) => b.scanTimestamp.getTime() - a.scanTimestamp.getTime());

    if (deviceScans.length >= 2) {
      const currentScan = deviceScans[0];
      const previousScan = deviceScans[1];

      const abnormalities = detectAbnormalChanges(currentScan, previousScan);

      if (abnormalities.length > 0) {
        abnormalitiesByDevice.set(deviceId, abnormalities);
      }
    }
  });

  return abnormalitiesByDevice;
}
