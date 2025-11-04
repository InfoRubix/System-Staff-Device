// Helper to calculate preventive repair costs from device scan issues

export const REPAIR_COSTS = {
  // Hardware costs (in RM)
  'RAM Critical / Memory Failure': 250,
  'Low Disk Space': 400, // SSD upgrade
  'CPU Overheating': 100, // Cleaning + thermal paste
  'Battery Degraded': 350,
  'Hard Disk Failure': 500,

  // Software/Security (free fixes)
  'Antivirus Disabled': 0,
  'Firewall Disabled': 0,
  'OS Outdated': 0,
};

export interface PreventiveCost {
  totalCost: number;
  hardwareCost: number;
  softwareCost: number;
  issueCount: number;
  breakdownByType: Record<string, { count: number; cost: number }>;
}

export function calculatePreventiveRepairCosts(deviceScans: any[]): PreventiveCost {
  let totalCost = 0;
  let hardwareCost = 0;
  const softwareCost = 0;
  let issueCount = 0;
  const breakdownByType: Record<string, { count: number; cost: number }> = {};

  deviceScans.forEach(scan => {
    // RAM Critical
    if (scan.ramUsage > 90) {
      const cost = REPAIR_COSTS['RAM Critical / Memory Failure'];
      totalCost += cost;
      hardwareCost += cost;
      issueCount++;
      if (!breakdownByType['RAM Critical']) {
        breakdownByType['RAM Critical'] = { count: 0, cost: 0 };
      }
      breakdownByType['RAM Critical'].count++;
      breakdownByType['RAM Critical'].cost += cost;
    }

    // Low Disk Space
    if (scan.diskSpaceFree < 20) {
      const cost = REPAIR_COSTS['Low Disk Space'];
      totalCost += cost;
      hardwareCost += cost;
      issueCount++;
      if (!breakdownByType['Low Disk Space']) {
        breakdownByType['Low Disk Space'] = { count: 0, cost: 0 };
      }
      breakdownByType['Low Disk Space'].count++;
      breakdownByType['Low Disk Space'].cost += cost;
    }

    // CPU Overheating
    if (scan.cpuTemp && scan.cpuTemp > 85) {
      const cost = REPAIR_COSTS['CPU Overheating'];
      totalCost += cost;
      hardwareCost += cost;
      issueCount++;
      if (!breakdownByType['CPU Overheating']) {
        breakdownByType['CPU Overheating'] = { count: 0, cost: 0 };
      }
      breakdownByType['CPU Overheating'].count++;
      breakdownByType['CPU Overheating'].cost += cost;
    }

    // Battery Degraded
    if (scan.batteryHealth && scan.batteryHealth < 50) {
      const cost = REPAIR_COSTS['Battery Degraded'];
      totalCost += cost;
      hardwareCost += cost;
      issueCount++;
      if (!breakdownByType['Battery Degraded']) {
        breakdownByType['Battery Degraded'] = { count: 0, cost: 0 };
      }
      breakdownByType['Battery Degraded'].count++;
      breakdownByType['Battery Degraded'].cost += cost;
    }

    // Antivirus Disabled (no cost - software fix)
    if (scan.antivirusStatus !== 'Active') {
      issueCount++;
      if (!breakdownByType['Antivirus Disabled']) {
        breakdownByType['Antivirus Disabled'] = { count: 0, cost: 0 };
      }
      breakdownByType['Antivirus Disabled'].count++;
    }

    // Firewall Disabled (no cost - software fix)
    if (scan.firewallStatus !== 'Active') {
      issueCount++;
      if (!breakdownByType['Firewall Disabled']) {
        breakdownByType['Firewall Disabled'] = { count: 0, cost: 0 };
      }
      breakdownByType['Firewall Disabled'].count++;
    }
  });

  return {
    totalCost,
    hardwareCost,
    softwareCost,
    issueCount,
    breakdownByType
  };
}
