'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BudgetData, BudgetContextType, Purchase, BudgetAlert, RepairRecord, PartsCatalog } from '../types/budget';
import { useDevices } from './DeviceContext';
import { Device } from '../types/device';

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { devices } = useDevices();
  const [currentBudget, setCurrentBudget] = useState<BudgetData | null>(null);
  const [previousBudget, setPreviousBudget] = useState<BudgetData | null>(null);
  const [purchases] = useState<Purchase[]>([]);
  const [repairRecords] = useState<RepairRecord[]>([]);
  const [partsCatalog] = useState<PartsCatalog[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimationTotals, setEstimationTotals] = useState({
    estimatedRepairsTotal: 0,
    estimatedReplacements: 0,
    estimatedBudgetNeeded: 0,
    byOS: {} as Record<string, { repair: number; replacement: number; count: number }>,
    byDeviceType: {} as Record<string, { repair: number; replacement: number; count: number }>,
    repairDevices: [] as Device[],
    replacementDevices: [] as Device[]
  });

  // Calculate repair and replacement costs from actual device data and age analysis
  const calculateDeviceCosts = useCallback((devices: Device[]) => {
    if (!devices || devices.length === 0) {
      return {
        estimatedRepairsTotal: 0,
        estimatedReplacements: 0,
        estimatedBudgetNeeded: 0,
        byOS: {} as Record<string, { repair: number; replacement: number; count: number }>,
        byDeviceType: {} as Record<string, { repair: number; replacement: number; count: number }>,
        repairDevices: [] as Device[],
        replacementDevices: [] as Device[]
      };
    }

    let estimatedRepairsTotal = 0;
    let estimatedReplacements = 0;
    const byOS: Record<string, { repair: number; replacement: number; count: number }> = {};
    const byDeviceType: Record<string, { repair: number; replacement: number; count: number }> = {};
    const repairDevices: Device[] = [];
    const replacementDevices: Device[] = [];

    // Realistic cost estimates based on market prices (in MYR)
    const repairCosts = {
      'Laptop': 800,
      'Desktop': 600,
      'Tablet': 400,
      'Phone': 300,
      'Both': 700,
    };

    const replacementCosts = {
      'Laptop': 3500,
      'Desktop': 2800,
      'Tablet': 1500,
      'Phone': 1200,
      'Both': 3150,
    };

    const currentYear = new Date().getFullYear();

    devices.forEach(device => {
      const os = device.operatingSystem.trim() || 'Unknown OS';
      const deviceType = device.deviceType;
      const deviceAge = currentYear - device.createdAt.getFullYear();

      // Initialize tracking objects
      if (!byOS[os]) {
        byOS[os] = { repair: 0, replacement: 0, count: 0 };
      }
      byOS[os].count++;

      if (!byDeviceType[deviceType]) {
        byDeviceType[deviceType] = { repair: 0, replacement: 0, count: 0 };
      }
      byDeviceType[deviceType].count++;

      // REPAIR COSTS: Based on actual device issues/repair status
      const needsRepair = device.status === 'Needs Repair' ||
                         device.status === 'Broken';

      if (needsRepair) {
        const repairCost = repairCosts[deviceType] || 500;
        estimatedRepairsTotal += repairCost;
        byOS[os].repair += repairCost;
        byDeviceType[deviceType].repair += repairCost;
        repairDevices.push(device);
      }

      // REPLACEMENT COSTS: Based on device age analysis (8-10+ years) or broken devices
      const needsReplacement = deviceAge >= 8 || device.status === 'Broken';

      if (needsReplacement) {
        const replacementCost = replacementCosts[deviceType] || 2000;
        estimatedReplacements += replacementCost;
        byOS[os].replacement += replacementCost;
        byDeviceType[deviceType].replacement += replacementCost;
        replacementDevices.push(device);
      }
    });

    const estimatedBudgetNeeded = estimatedRepairsTotal + estimatedReplacements;

    return {
      estimatedRepairsTotal,
      estimatedReplacements,
      estimatedBudgetNeeded,
      byOS,
      byDeviceType,
      repairDevices,
      replacementDevices
    };
  }, []); // Empty dependency array since this function doesn't depend on any changing values

  // Sample devices data that aligns with Operating System Distribution (fallback)
  // const sampleDevices = [
  //   // Windows devices (mix of ages)
  //   {
  /*    id: '1',
      staffName: 'John Doe',
      department: 'MARKETING',
      deviceType: 'Laptop',
      operatingSystem: 'Windows 11',
      deviceModel: 'Dell Latitude 7420',
      processor: 'Intel Core i7-11th Gen',
      ram: '16 GB',
      upgraded: true,
      createdAt: new Date(2022, 5, 15), // 2 years old - 10% repair
      status: 'Working'
    },
    {
      id: '2',
      staffName: 'Jane Smith',
      department: 'ACCOUNT',
      deviceType: 'Desktop',
      operatingSystem: 'Windows 11',
      deviceModel: 'HP EliteDesk 800 G9',
      processor: 'Intel Core i5-10th Gen',
      ram: '8 GB',
      upgraded: true,
      createdAt: new Date(2020, 8, 10), // 4 years old - 25% repair
      status: 'Needs Repair'
    },
    {
      id: '3',
      staffName: 'Mike Wilson',
      department: 'HR',
      deviceType: 'Laptop',
      operatingSystem: 'Windows 10',
      deviceModel: 'ThinkPad X1 Carbon',
      processor: 'Intel Core i7-6th Gen',
      ram: '8 GB',
      upgraded: false,
      createdAt: new Date(2018, 2, 20), // 6 years old - 40% repair
      status: 'Broken'
    },
    {
      id: '4',
      staffName: 'Sarah Brown',
      department: 'LITIGATION',
      deviceType: 'Desktop',
      operatingSystem: 'Windows 10',
      deviceModel: 'Dell OptiPlex 3020',
      processor: 'Intel Core i3-4th Gen',
      ram: '4 GB',
      upgraded: false,
      createdAt: new Date(2013, 1, 10), // 11 years old - 100% replacement
      status: 'Broken'
    },
    
    // iOS/macOS devices
    {
      id: '5',
      staffName: 'David Chen',
      department: 'RUBIX',
      deviceType: 'Laptop',
      operatingSystem: 'macOS Sonoma',
      deviceModel: 'MacBook Pro M3',
      processor: 'Apple M3',
      ram: '16 GB',
      upgraded: true,
      createdAt: new Date(2023, 10, 1), // 1 year old - 10% repair
      status: 'Working'
    },
    {
      id: '6',
      staffName: 'Lisa Garcia',
      department: 'CONVEY',
      deviceType: 'Desktop',
      operatingSystem: 'macOS Ventura',
      deviceModel: 'iMac Pro',
      processor: 'Intel Xeon W',
      ram: '32 GB',
      upgraded: true,
      createdAt: new Date(2019, 6, 15), // 5 years old - 40% repair
      status: 'Needs Repair'
    },
    {
      id: '7',
      staffName: 'Robert Kim',
      department: 'SANCO',
      deviceType: 'Laptop',
      operatingSystem: 'macOS Big Sur',
      deviceModel: 'MacBook Air',
      processor: 'Intel Core i5-5th Gen',
      ram: '8 GB',
      upgraded: false,
      createdAt: new Date(2015, 3, 20), // 9 years old - 80% repair
      status: 'Broken'
    },
    
    // Android devices (tablets/phones used as work devices)
    {
      id: '8',
      staffName: 'Emily Rodriguez',
      department: 'POT/POC',
      deviceType: 'Tablet',
      operatingSystem: 'Android 13',
      deviceModel: 'Samsung Galaxy Tab S9',
      processor: 'Snapdragon 8 Gen 2',
      ram: '8 GB',
      upgraded: true,
      createdAt: new Date(2023, 2, 10), // 1 year old - 10% repair
      status: 'Working'
    },
    {
      id: '9',
      staffName: 'Alex Thompson',
      department: 'AFC',
      deviceType: 'Tablet',
      operatingSystem: 'Android 12',
      deviceModel: 'Google Pixel Tablet',
      processor: 'Tensor G2',
      ram: '8 GB',
      upgraded: false,
      createdAt: new Date(2021, 8, 5), // 3 years old - 25% repair
      status: 'Needs Repair'
    },
    
    // Additional devices for better percentages
    {
      id: '10',
      staffName: 'Maria Santos',
      department: 'MARKETING',
      deviceType: 'Laptop',
      operatingSystem: 'Windows 11',
      deviceModel: 'Surface Laptop 5',
      processor: 'Intel Core i7-12th Gen',
      ram: '16 GB',
      upgraded: true,
      createdAt: new Date(2023, 6, 10),
      status: 'Working'
    },
    {
      id: '11',
      staffName: 'James Wilson',
      department: 'HR',
      deviceType: 'Desktop',
      operatingSystem: 'Windows 10',
      deviceModel: 'HP ProDesk 400 G4',
      processor: 'Intel Core i3-7th Gen',
      ram: '4 GB',
      upgraded: false,
      createdAt: new Date(2019, 3, 15),
      status: 'Working'
    },
    {
      id: '12',
      staffName: 'Anna Lee',
      department: 'ACCOUNT',
      deviceType: 'Laptop',
      operatingSystem: 'Windows 10',
      deviceModel: 'ThinkPad E14',
      processor: 'AMD Ryzen 5 2500U',
      ram: '8 GB',
      upgraded: false,
      createdAt: new Date(2020, 1, 20),
      status: 'Working'
  */
  //   }
  // ];

  // Calculate budget values based on estimated needs from device data
  const calculateBudgetValues = useCallback((
    totalBudget: number,
    estimationData: Record<string, unknown>
  ): { totalBudgetNeeded: number; remainingBudget: number } => {
    // Total Budget Needed = Estimated Repairs + Estimated Replacements
    const totalBudgetNeeded = estimationData.estimatedBudgetNeeded as number;

    // Budget Usage = (Total Budget Needed ÷ Total Budget) × 100
    // const budgetUsagePercentage = totalBudget > 0 ? (totalBudgetNeeded / totalBudget) * 100 : 0;

    // Remaining Budget = Total Budget - Total Budget Needed
    const remainingBudget = totalBudget - totalBudgetNeeded;

    return { totalBudgetNeeded, remainingBudget };
  }, []); // Empty dependency array since this function doesn't depend on any changing values

  // Generate budget alerts based on estimated needs
  const generateBudgetAlerts = useCallback((budget: BudgetData, estimationData: Record<string, unknown>): BudgetAlert[] => {
    const alerts: BudgetAlert[] = [];
    const currentDate = new Date();

    const totalBudgetNeeded = estimationData.estimatedBudgetNeeded as number;
    const budgetUsagePercentage = budget.totalBudget > 0 ? (totalBudgetNeeded / budget.totalBudget) * 100 : 0;

    // Critical: Budget needed exceeds available budget
    if (totalBudgetNeeded > budget.totalBudget) {
      alerts.push({
        id: `budget_exceeded_${currentDate.getTime()}`,
        type: 'budget_exceeded',
        message: `Budget needed (RM ${totalBudgetNeeded.toFixed(0)}) exceeds available budget by RM ${(totalBudgetNeeded - budget.totalBudget).toFixed(0)}!`,
        severity: 'critical',
        isActive: true,
        createdAt: currentDate,
      });
    }
    // High warning: 90%+ usage
    else if (budgetUsagePercentage >= 90) {
      alerts.push({
        id: `budget_warning_90_${currentDate.getTime()}`,
        type: 'budget_warning',
        message: `Budget usage at ${budgetUsagePercentage.toFixed(1)}% - approaching limit`,
        severity: 'high',
        isActive: true,
        createdAt: currentDate,
      });
    }
    // Medium warning: 75%+ usage
    else if (budgetUsagePercentage >= 75) {
      alerts.push({
        id: `budget_warning_75_${currentDate.getTime()}`,
        type: 'budget_warning',
        message: `Budget usage at ${budgetUsagePercentage.toFixed(1)}% - monitor spending`,
        severity: 'medium',
        isActive: true,
        createdAt: currentDate,
      });
    }

    // High estimation alert
    if ((estimationData.estimatedBudgetNeeded as number) > 5000) {
      alerts.push({
        id: `high_estimation_${currentDate.getTime()}`,
        type: 'repair_cost_high',
        message: `High device replacement/repair costs estimated: RM ${(estimationData.estimatedBudgetNeeded as number).toFixed(0)}`,
        severity: 'medium',
        isActive: true,
        createdAt: currentDate,
      });
    }

    return alerts;
  }, []);

  const loadBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always use real device data from DeviceContext
      const deviceData = devices || [];

      // Calculate repair and replacement costs from device data
      const estimationData = calculateDeviceCosts(deviceData);
      setEstimationTotals(estimationData);

      const totalBudget = 20000; // RM 20,000 monthly budget
      const { totalBudgetNeeded, remainingBudget } = calculateBudgetValues(
        totalBudget,
        estimationData
      );

      const currentBudgetData: BudgetData = {
        id: '1',
        month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        totalBudget,
        amountSpent: 0, // No longer tracking actual spent amounts
        projectedSpend: totalBudgetNeeded, // This is now our estimated budget needed
        remainingBudget,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const previousBudgetData: BudgetData = {
        id: '2',
        month: `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`,
        totalBudget: 20000,
        amountSpent: 0,
        projectedSpend: 8500, // Previous month's estimated budget needed
        remainingBudget: 11500,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentBudget(currentBudgetData);
      setPreviousBudget(previousBudgetData);
      
      // Generate alerts
      const alerts = generateBudgetAlerts(currentBudgetData, estimationData);
      setBudgetAlerts(alerts);
      
    } catch (err) {
      console.error('Error loading budget data:', err);
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [devices, calculateDeviceCosts, calculateBudgetValues, generateBudgetAlerts]);

  const getBudgetChangePercentage = (): number => {
    if (!currentBudget || !previousBudget) return 0;
    
    const currentRemaining = currentBudget.remainingBudget;
    const previousRemaining = previousBudget.remainingBudget;
    
    if (previousRemaining === 0) return currentRemaining > 0 ? 100 : 0;
    
    return ((currentRemaining - previousRemaining) / Math.abs(previousRemaining)) * 100;
  };

  const getOpenRepairCosts = (): RepairRecord[] => {
    return [];
  };

  const getTotalProjectedSpend = (): number => {
    return estimationTotals.estimatedBudgetNeeded;
  };

  const getEstimatedRepairCosts = (): number => {
    return estimationTotals.estimatedRepairsTotal;
  };

  const getEstimatedReplacementCosts = (): number => {
    return estimationTotals.estimatedReplacements;
  };

  const getEstimatedCostForDevice = (_deviceId: string): number => {
    return 1000; // Default estimate
  };

  // Legacy function - purchases are no longer tracked since we use estimated needs
  const addPurchase = async (_purchase: Omit<Purchase, 'id' | 'createdAt'>) => {
    console.log('Purchase tracking disabled - budget now based on device needs estimation');
  };

  const addRepairRecord = async (deviceId: string, issueType: string, description?: string) => {
    // This would trigger a recalculation of estimations in a real system
    console.log('Add repair record:', { deviceId, issueType, description });
  };

  const updateRepairRecord = async (id: string, updates: Record<string, unknown>) => {
    console.log('Update repair record:', { id, updates });
  };

  // Function to get devices data (for OS distribution alignment)
  const getDevicesData = (): Record<string, unknown>[] => {
    return (devices || []).map(device => ({ ...device })); // Return real devices as plain objects
  };

  // Function to get estimation breakdown by OS
  const getEstimationByOS = () => {
    return estimationTotals.byOS;
  };

  // Function to get estimation breakdown by device type
  const getEstimationByDeviceType = () => {
    return estimationTotals.byDeviceType;
  };

  // Function to get devices that need repairs
  const getDevicesNeedingRepair = (): Record<string, unknown>[] => {
    return estimationTotals.repairDevices.map(device => ({ ...device }));
  };

  // Function to get devices that need replacement
  const getDevicesNeedingReplacement = (): Record<string, unknown>[] => {
    return estimationTotals.replacementDevices.map(device => ({ ...device }));
  };

  // Function to get estimation breakdown by department
  const getEstimationByDepartment = () => {
    if (!devices || devices.length === 0) return {};

    const departmentBreakdown: Record<string, { repair: number; replacement: number; count: number }> = {};

    // Realistic cost estimates based on market prices (in MYR)
    const repairCosts = {
      'Laptop': 800,
      'Desktop': 600,
      'Tablet': 400,
      'Phone': 300,
      'Both': 700,
    };

    const replacementCosts = {
      'Laptop': 3500,
      'Desktop': 2800,
      'Tablet': 1500,
      'Phone': 1200,
      'Both': 3150,
    };

    const currentYear = new Date().getFullYear();

    devices.forEach(device => {
      const department = device.department;
      const deviceType = device.deviceType;
      const deviceAge = currentYear - device.createdAt.getFullYear();

      // Initialize department tracking
      if (!departmentBreakdown[department]) {
        departmentBreakdown[department] = { repair: 0, replacement: 0, count: 0 };
      }
      departmentBreakdown[department].count++;

      // Check if device needs repair
      const needsRepair = device.status === 'Needs Repair' || device.status === 'Broken';
      if (needsRepair) {
        const repairCost = repairCosts[deviceType] || 500;
        departmentBreakdown[department].repair += repairCost;
      }

      // Check if device needs replacement (8+ years old or broken)
      const needsReplacement = deviceAge >= 8 || device.status === 'Broken';
      if (needsReplacement) {
        const replacementCost = replacementCosts[deviceType] || 2000;
        departmentBreakdown[department].replacement += replacementCost;
      }
    });

    return departmentBreakdown;
  };

  useEffect(() => {
    loadBudgetData();
  }, [devices, calculateDeviceCosts, calculateBudgetValues, loadBudgetData]);


  // Update alerts when budget changes
  useEffect(() => {
    if (currentBudget) {
      const alerts = generateBudgetAlerts(currentBudget, estimationTotals);
      setBudgetAlerts(alerts);
    }
  }, [currentBudget, estimationTotals, generateBudgetAlerts]);

  return (
    <BudgetContext.Provider value={{
      currentBudget,
      previousBudget,
      purchases,
      repairRecords,
      partsCatalog,
      budgetAlerts,
      loading,
      error,
      getBudgetChangePercentage,
      getOpenRepairCosts,
      getTotalProjectedSpend,
      getEstimatedRepairCosts,
      getEstimatedReplacementCosts,
      addPurchase,
      addRepairRecord,
      updateRepairRecord,
      getEstimatedCostForDevice,
      refreshBudget: loadBudgetData,
      // New functions for data analysis
      getDevicesData,
      getEstimationByOS,
      getEstimationByDeviceType,
      getEstimationByDepartment,
      getDevicesNeedingRepair,
      getDevicesNeedingReplacement,
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}