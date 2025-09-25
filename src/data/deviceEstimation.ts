// OS-based estimation configuration
export const estimationConfig = {
  baseCost: {
    Windows: 2500,  // RM - use 2800 if laptop, 2000 if desktop
    Android: 1200,  // RM
    iOS: 3500,      // RM
  },
  osMultiplier: {
    Windows: 1.00,
    Android: 0.90,
    iOS: 1.20,
  },
  ageBands: {
    0: 0.10,  // 0-2 years: 10%
    3: 0.25,  // 3-4 years: 25%
    5: 0.40,  // 5-6 years: 40%
    7: 0.60,  // 7-8 years: 60%
    9: 0.80,  // 9 years: 80%
  }
};

// Function to determine OS category from device operating system
export function getOSCategory(operatingSystem: string): 'Windows' | 'iOS' | 'Android' {
  const os = operatingSystem.toLowerCase();
  
  if (os.includes('windows')) return 'Windows';
  if (os.includes('ios') || os.includes('macos') || os.includes('mac os')) return 'iOS';
  if (os.includes('android')) return 'Android';
  
  // Default to Windows for unknown OS
  return 'Windows';
}

// Function to get repair percentage based on device age
export function getRepairPercentByAge(age: number): number {
  if (age <= 2) return 0.10;  // 10%
  if (age <= 4) return 0.25;  // 25%
  if (age <= 6) return 0.40;  // 40%
  if (age <= 8) return 0.60;  // 60%
  if (age === 9) return 0.80; // 80%
  return 1.00; // 100% (replacement)
}

// Function to calculate device age in years
export function calculateDeviceAgeFromYear(purchaseYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - purchaseYear;
}

// Function to calculate replacement cost for a device
export function getReplacementCost(osCategory: 'Windows' | 'iOS' | 'Android', deviceType?: string): number {
  let baseCost = estimationConfig.baseCost[osCategory];
  
  // Adjust Windows cost based on device type if available
  if (osCategory === 'Windows' && deviceType) {
    const type = deviceType.toLowerCase();
    if (type.includes('laptop')) {
      baseCost = 2800; // Higher cost for laptops
    } else if (type.includes('desktop')) {
      baseCost = 2000; // Lower cost for desktops
    }
  }
  
  return baseCost * estimationConfig.osMultiplier[osCategory];
}

// Main estimation function per device
export function calculateDeviceEstimation(
  operatingSystem: string,
  purchaseYear: number,
  deviceType?: string
): { estimatedRepair: number; estimatedReplacement: number; age: number; osCategory: string } {
  const osCategory = getOSCategory(operatingSystem);
  const age = calculateDeviceAgeFromYear(purchaseYear);
  const replacementCost = getReplacementCost(osCategory, deviceType);
  
  // Check if device should be replaced (≥10 years old OR purchased ≤2010)
  if (age >= 10 || purchaseYear <= 2010) {
    return {
      estimatedRepair: 0,
      estimatedReplacement: replacementCost,
      age,
      osCategory
    };
  } else {
    // Calculate repair cost based on age band
    const repairPercent = getRepairPercentByAge(age);
    return {
      estimatedRepair: replacementCost * repairPercent,
      estimatedReplacement: 0,
      age,
      osCategory
    };
  }
}

// Function to calculate totals for all devices
export function calculateEstimationTotals(devices: Record<string, unknown>[]): {
  estimatedRepairsTotal: number;
  estimatedReplacements: number;
  estimatedBudgetNeeded: number;
  byOS: Record<string, { repair: number; replacement: number; count: number }>;
} {
  let estimatedRepairsTotal = 0;
  let estimatedReplacements = 0;
  const byOS: Record<string, { repair: number; replacement: number; count: number }> = {};
  
  devices.forEach(device => {
    // Extract purchase year from device creation date
    const purchaseYear = (device.createdAt && device.createdAt instanceof Date) ? device.createdAt.getFullYear() : 2020;
    
    const estimation = calculateDeviceEstimation(
      device.operatingSystem as string,
      purchaseYear,
      device.deviceType as string
    );
    
    estimatedRepairsTotal += estimation.estimatedRepair;
    estimatedReplacements += estimation.estimatedReplacement;
    
    // Group by OS category
    if (!byOS[estimation.osCategory]) {
      byOS[estimation.osCategory] = { repair: 0, replacement: 0, count: 0 };
    }
    byOS[estimation.osCategory].repair += estimation.estimatedRepair;
    byOS[estimation.osCategory].replacement += estimation.estimatedReplacement;
    byOS[estimation.osCategory].count += 1;
  });
  
  return {
    estimatedRepairsTotal,
    estimatedReplacements,
    estimatedBudgetNeeded: estimatedRepairsTotal + estimatedReplacements,
    byOS
  };
}

// Helper function to format estimation explanation
export function getEstimationExplanation(
  operatingSystem: string,
  purchaseYear: number,
  deviceType?: string
): string {
  const osCategory = getOSCategory(operatingSystem);
  const age = calculateDeviceAgeFromYear(purchaseYear);
  const replacementCost = getReplacementCost(osCategory, deviceType);
  
  if (age >= 10 || purchaseYear <= 2010) {
    return `${age} years old (≥10 years) → Full replacement: RM${replacementCost.toLocaleString()}`;
  } else {
    const repairPercent = getRepairPercentByAge(age);
    const repairCost = replacementCost * repairPercent;
    return `${age} years old → ${(repairPercent * 100)}% repair cost: RM${repairCost.toLocaleString()}`;
  }
}