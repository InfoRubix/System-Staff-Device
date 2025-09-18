// Device replacement costs by type and platform (in RM)
export const deviceReplacementCosts = {
  // Laptop costs by platform/OS
  Laptop: {
    'Windows': {
      budget: 2500,      // Budget Windows laptop
      midRange: 4000,    // Mid-range business laptop
      premium: 7000,     // Premium/gaming laptop
    },
    'macOS': {
      budget: 4500,      // MacBook Air base model
      midRange: 6500,    // MacBook Air upgraded
      premium: 12000,    // MacBook Pro high-end
    },
    'Linux': {
      budget: 2000,      // Budget Linux laptop
      midRange: 3500,    // Developer laptop
      premium: 5500,     // High-end Linux workstation
    }
  },
  
  // Desktop costs by platform/OS
  Desktop: {
    'Windows': {
      budget: 2000,      // Basic office PC
      midRange: 3500,    // Business desktop
      premium: 8000,     // High-performance workstation
    },
    'macOS': {
      budget: 6000,      // Mac Mini
      midRange: 8500,    // iMac base
      premium: 15000,    // Mac Studio/Pro
    },
    'Linux': {
      budget: 1800,      // Basic Linux desktop
      midRange: 3000,    // Developer workstation
      premium: 6000,     // High-end Linux server
    }
  },

  // Default values for unknown combinations
  default: {
    Laptop: 3500,
    Desktop: 3000,
    Tablet: 1500, // Tablet default pricing
    Phone: 1200, // Phone default pricing
  }
};

// Age-based multipliers for cost estimation
export const ageMultipliers = {
  '0-3': 0.20,   // 20% of replacement cost
  '4-7': 0.50,   // 50% of replacement cost
  '8-10': 0.80,  // 80% of replacement cost
  '10+': 1.00,   // 100% full replacement cost
};

// Function to determine cost category based on device model/specs
export function getCostCategory(deviceModel: string, operatingSystem: string): 'budget' | 'midRange' | 'premium' {
  const model = deviceModel.toLowerCase();
  const os = operatingSystem.toLowerCase();

  // Premium indicators
  if (
    model.includes('pro') ||
    model.includes('studio') ||
    model.includes('gaming') ||
    model.includes('workstation') ||
    model.includes('xps') ||
    model.includes('thinkpad x1') ||
    model.includes('surface studio') ||
    model.includes('alienware') ||
    (os.includes('macos') && (model.includes('16') || model.includes('max') || model.includes('ultra')))
  ) {
    return 'premium';
  }

  // Budget indicators
  if (
    model.includes('air') ||
    model.includes('mini') ||
    model.includes('basic') ||
    model.includes('essential') ||
    model.includes('inspiron') ||
    model.includes('ideapad') ||
    model.includes('aspire') ||
    model.includes('vostro')
  ) {
    return 'budget';
  }

  // Default to mid-range
  return 'midRange';
}

// Function to get platform from OS
export function getPlatformFromOS(operatingSystem: string): 'Windows' | 'macOS' | 'Linux' {
  const os = operatingSystem.toLowerCase();
  
  if (os.includes('windows')) return 'Windows';
  if (os.includes('macos') || os.includes('mac os')) return 'macOS';
  if (os.includes('linux') || os.includes('ubuntu') || os.includes('fedora') || os.includes('centos')) return 'Linux';
  
  // Default to Windows for unknown OS
  return 'Windows';
}

// Function to calculate device age in years
export function calculateDeviceAge(createdAt: Date): number {
  const now = new Date();
  const ageInMilliseconds = now.getTime() - createdAt.getTime();
  const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(ageInYears);
}

// Function to get age category
export function getAgeCategory(age: number): keyof typeof ageMultipliers {
  if (age <= 3) return '0-3';
  if (age <= 7) return '4-7';
  if (age <= 10) return '8-10';
  return '10+';
}

// Main function to estimate repair cost based on device age and type
export function estimateRepairCost(
  deviceType: 'Laptop' | 'Desktop' | 'Tablet' | 'Phone',
  operatingSystem: string,
  deviceModel: string,
  createdAt: Date
): number {
  // Calculate device age
  const age = calculateDeviceAge(createdAt);
  const ageCategory = getAgeCategory(age);
  const multiplier = ageMultipliers[ageCategory];

  // Get platform and cost category
  const platform = getPlatformFromOS(operatingSystem);
  const costCategory = getCostCategory(deviceModel, operatingSystem);

  // Get replacement cost
  let replacementCost: number;

  // Handle device types with fallback to default if type not found
  if (deviceType === 'Tablet' || deviceType === 'Phone') {
    // For mobile devices, use laptop pricing as fallback
    replacementCost = deviceReplacementCosts.Laptop[platform]?.[costCategory] || deviceReplacementCosts.default.Laptop;
  } else {
    replacementCost = deviceReplacementCosts[deviceType][platform]?.[costCategory] || deviceReplacementCosts.default[deviceType];
  }

  // Calculate estimated repair cost
  const estimatedCost = replacementCost * multiplier;
  
  // Round to nearest 50 RM for realistic estimates
  return Math.round(estimatedCost / 50) * 50;
}

// Helper function to format the estimation explanation
export function getEstimationExplanation(
  deviceType: 'Laptop' | 'Desktop' | 'Tablet' | 'Phone',
  operatingSystem: string,
  deviceModel: string,
  createdAt: Date
): string {
  const age = calculateDeviceAge(createdAt);
  const ageCategory = getAgeCategory(age);
  const multiplier = ageMultipliers[ageCategory];
  const platform = getPlatformFromOS(operatingSystem);
  const costCategory = getCostCategory(deviceModel, operatingSystem);

  let replacementCost: number;
  if (deviceType === 'Tablet' || deviceType === 'Phone') {
    replacementCost = deviceReplacementCosts.Laptop[platform]?.[costCategory] || deviceReplacementCosts.default.Laptop;
  } else {
    replacementCost = deviceReplacementCosts[deviceType][platform]?.[costCategory] || deviceReplacementCosts.default[deviceType];
  }

  return `${age} years old (${ageCategory} years) → ${multiplier * 100}% of RM${replacementCost.toLocaleString()} replacement cost`;
}