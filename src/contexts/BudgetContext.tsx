'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BudgetData, BudgetContextType, Purchase, BudgetAlert, RepairRecord, PartsCatalog } from '../types/budget';
import { useDevices } from './DeviceContext';
import { Device } from '../types/device';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface DeviceScan {
  id: string;
  deviceId: string;
  staffName: string;
  staffEmail: string;
  department: string;
  deviceType: string;
  scanTimestamp: Date;
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
  ramUsage: number;
  diskSpaceFree: number;
  batteryHealth?: number;
  cpuTemp?: number;
  processor: string;
  installedRAM: string;
  graphicsCard: string;
  totalStorage: string;
  computerModel: string;
  osVersion: string;
}

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
  const [deviceScans, setDeviceScans] = useState<DeviceScan[]>([]);
  const [fixedRepairs, setFixedRepairs] = useState<Set<string>>(new Set());
  const [estimationTotals, setEstimationTotals] = useState({
    estimatedRepairsTotal: 0,
    estimatedReplacements: 0,
    estimatedBudgetNeeded: 0,
    byOS: {} as Record<string, { repair: number; replacement: number; count: number }>,
    byDeviceType: {} as Record<string, { repair: number; replacement: number; count: number }>,
    repairDevices: [] as Device[],
    replacementDevices: [] as Device[]
  });

  // Fetch device scans from Firebase for accurate hardware issue detection
  // IMPORTANT: Wait for authentication before loading to avoid permission errors
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Only load device scans if user is authenticated
      if (user) {
        const q = query(
          collection(db, 'device_scans'),
          orderBy('scanTimestamp', 'desc'),
          limit(500)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const allScans: DeviceScan[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            allScans.push({
              id: doc.id,
              deviceId: data.deviceId,
              staffName: data.staffName,
              staffEmail: data.staffEmail || '',
              department: data.department,
              deviceType: data.deviceType || 'Desktop',
              scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
              overallStatus: data.overallStatus || 'Healthy',
              ramUsage: data.ramUsage || 0,
              diskSpaceFree: data.diskSpaceFree || 100,
              batteryHealth: data.batteryHealth,
              cpuTemp: data.cpuTemp,
              processor: data.processor || 'Unknown',
              installedRAM: data.installedRAM || '0 GB',
              graphicsCard: data.graphicsCard || 'Unknown',
              totalStorage: data.totalStorage || '0 GB',
              computerModel: data.computerModel || 'Unknown',
              osVersion: data.osVersion || 'Unknown'
            });
          });

          // Group scans by deviceId and keep only the latest scan for each device
          const latestScansMap = new Map<string, DeviceScan>();
          allScans.forEach(scan => {
            const existing = latestScansMap.get(scan.deviceId);
            if (!existing || scan.scanTimestamp > existing.scanTimestamp) {
              latestScansMap.set(scan.deviceId, scan);
            }
          });

          const scans = Array.from(latestScansMap.values());
          setDeviceScans(scans);
        });
      } else {
        // User not authenticated - clear device scans
        setDeviceScans([]);
      }
    });

    // Cleanup both listeners on unmount
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Listen to fixed/completed repairs
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, 'repairs'));

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const fixedSet = new Set<string>();
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'fixed' || data.status === 'completed') {
              // Create ID in same format as issue detection
              const fixedId = `${data.deviceId}-${data.staffEmail}-${data.issueType?.replace(/[^a-zA-Z0-9]/g, '_')}`;
              fixedSet.add(fixedId);
            }
          });
          setFixedRepairs(fixedSet);
        });
      } else {
        setFixedRepairs(new Set());
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Calculate repair and replacement costs from ACTUAL device scan data (hardware issues)
  const calculateFilteredRepairCosts = useCallback((scans: DeviceScan[]) => {
    const HARDWARE_REPAIR_COSTS = {
      RAM_CRITICAL: 250,
      LOW_DISK_SPACE: 400,
      CPU_OVERHEATING: 100,
      BATTERY_DEGRADED: 350,
    };

    let estimatedRepairsTotal = 0;

    scans.forEach(scan => {
      let deviceRepairCost = 0;

      if (scan.ramUsage > 85) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-RAM_Critical___Memory_Failure`;
        if (!fixedRepairs.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.RAM_CRITICAL;
        }
      }

      if (scan.diskSpaceFree < 20) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-Low_Disk_Space`;
        if (!fixedRepairs.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.LOW_DISK_SPACE;
        }
      }

      if (scan.cpuTemp && scan.cpuTemp > 85) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-CPU_Overheating`;
        if (!fixedRepairs.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.CPU_OVERHEATING;
        }
      }

      if (scan.batteryHealth && scan.batteryHealth < 50) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-Battery_Degraded`;
        if (!fixedRepairs.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.BATTERY_DEGRADED;
        }
      }

      estimatedRepairsTotal += deviceRepairCost;
    });

    return estimatedRepairsTotal;
  }, [fixedRepairs]);

  const calculateDeviceCosts = useCallback((scans: DeviceScan[], fixedRepairsSet: Set<string>) => {
    if (!scans || scans.length === 0) {
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
    const estimatedReplacements = 0;
    const byOS: Record<string, { repair: number; replacement: number; count: number }> = {};
    const byDeviceType: Record<string, { repair: number; replacement: number; count: number }> = {};
    const repairDevices: Device[] = [];
    const replacementDevices: Device[] = [];

    // Hardware repair costs (from preventiveRepairCosts.ts)
    const HARDWARE_REPAIR_COSTS = {
      RAM_CRITICAL: 250,
      LOW_DISK_SPACE: 400,
      CPU_OVERHEATING: 100,
      BATTERY_DEGRADED: 350,
      HARD_DISK_FAILURE: 500,
    };

    // Unused for now - kept for future reference
    // const _replacementCosts = {
    //   'Laptop': 3500,
    //   'Desktop': 2800,
    //   'Tablet': 1500,
    //   'Phone': 1200,
    //   'Both': 3150,
    // };

    // const _currentYear = new Date().getFullYear();

    scans.forEach(scan => {
      const os = scan.osVersion?.trim() || 'Unknown OS';
      const deviceType = scan.deviceType || 'Unknown';
      let deviceRepairCost = 0;

      // Initialize tracking objects
      if (!byOS[os]) {
        byOS[os] = { repair: 0, replacement: 0, count: 0 };
      }
      byOS[os].count++;

      if (!byDeviceType[deviceType]) {
        byDeviceType[deviceType] = { repair: 0, replacement: 0, count: 0 };
      }
      byDeviceType[deviceType].count++;

      // REPAIR COSTS: Based on ACTUAL hardware issues from scan data
      // Only count issues that are NOT fixed

      // RAM Critical / Memory Failure (match repair management threshold)
      if (scan.ramUsage > 85) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-RAM_Critical___Memory_Failure`;
        if (!fixedRepairsSet.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.RAM_CRITICAL;
        }
      }

      // Low Disk Space (needs SSD upgrade)
      if (scan.diskSpaceFree < 20) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-Low_Disk_Space`;
        if (!fixedRepairsSet.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.LOW_DISK_SPACE;
        }
      }

      // CPU Overheating
      if (scan.cpuTemp && scan.cpuTemp > 85) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-CPU_Overheating`;
        if (!fixedRepairsSet.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.CPU_OVERHEATING;
        }
      }

      // Battery Degraded (for laptops/tablets)
      if (scan.batteryHealth && scan.batteryHealth < 50) {
        const issueId = `${scan.deviceId}-${scan.staffEmail}-Battery_Degraded`;
        if (!fixedRepairsSet.has(issueId)) {
          deviceRepairCost += HARDWARE_REPAIR_COSTS.BATTERY_DEGRADED;
        }
      }

      // Add to totals if device needs repair
      if (deviceRepairCost > 0) {
        estimatedRepairsTotal += deviceRepairCost;
        byOS[os].repair += deviceRepairCost;
        byDeviceType[deviceType].repair += deviceRepairCost;

        // Create a mock Device object for tracking (using scan data)
        repairDevices.push({
          id: scan.deviceId,
          staffName: scan.staffName,
          department: scan.department as any,
          deviceType: scan.deviceType as any,
          operatingSystem: scan.osVersion,
          status: 'Needs Repair' as any,
          deviceModel: scan.computerModel,
          processor: scan.processor,
          ram: scan.installedRAM,
          graphics: scan.graphicsCard,
          storage: scan.totalStorage,
        } as Device);
      }

      // REPLACEMENT COSTS: Keep old logic for device age if we have that data (optional)
      // For now, focus on repair costs from actual hardware issues
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

      // Use device scan data for ACCURATE hardware issue detection
      const scanData = deviceScans || [];

      // Calculate repair and replacement costs from ACTUAL scan data
      const estimationData = calculateDeviceCosts(scanData, fixedRepairs);
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

  // Function to get estimation breakdown by department (using ACTUAL scan data)
  const getEstimationByDepartment = () => {
    if (!deviceScans || deviceScans.length === 0) return {};

    const departmentBreakdown: Record<string, { repair: number; replacement: number; count: number }> = {};

    const HARDWARE_COSTS = {
      RAM_CRITICAL: 250,
      LOW_DISK_SPACE: 400,
      CPU_OVERHEATING: 100,
      BATTERY_DEGRADED: 350,
    };

    // Use actual device scan data to calculate department costs
    deviceScans.forEach(scan => {
      const department = scan.department || 'Unknown';
      let deviceRepairCost = 0;

      // Initialize department tracking
      if (!departmentBreakdown[department]) {
        departmentBreakdown[department] = { repair: 0, replacement: 0, count: 0 };
      }
      departmentBreakdown[department].count++;

      // Calculate repair costs based on hardware issues (same logic as getDevicesWithRepairDetails)
      if (scan.ramUsage > 85) {
        deviceRepairCost += HARDWARE_COSTS.RAM_CRITICAL;
      }

      if (scan.diskSpaceFree < 20) {
        deviceRepairCost += HARDWARE_COSTS.LOW_DISK_SPACE;
      }

      if (scan.cpuTemp && scan.cpuTemp > 85) {
        deviceRepairCost += HARDWARE_COSTS.CPU_OVERHEATING;
      }

      if (scan.batteryHealth && scan.batteryHealth < 50) {
        deviceRepairCost += HARDWARE_COSTS.BATTERY_DEGRADED;
      }

      // Add to department total if device needs repair
      if (deviceRepairCost > 0) {
        departmentBreakdown[department].repair += deviceRepairCost;
      }

      // Replacement costs remain 0 for now (we're focusing on repair costs from actual hardware issues)
      departmentBreakdown[department].replacement = 0;
    });

    return departmentBreakdown;
  };

  // Get devices with repair details (for BudgetCard drill-down)
  const getDevicesWithRepairDetails = () => {
    const HARDWARE_COSTS = {
      RAM_CRITICAL: 250,
      LOW_DISK_SPACE: 400,
      CPU_OVERHEATING: 100,
      BATTERY_DEGRADED: 350,
    };

    return deviceScans.map(scan => {
      const issues: { name: string; cost: number }[] = [];
      let repairCost = 0;

      // Match the same threshold as calculateDeviceCosts() - RAM > 85%
      if (scan.ramUsage > 85) {
        issues.push({ name: 'RAM Critical / Memory Failure', cost: HARDWARE_COSTS.RAM_CRITICAL });
        repairCost += HARDWARE_COSTS.RAM_CRITICAL;
      }

      if (scan.diskSpaceFree < 20) {
        issues.push({ name: 'Low Disk Space (SSD Upgrade)', cost: HARDWARE_COSTS.LOW_DISK_SPACE });
        repairCost += HARDWARE_COSTS.LOW_DISK_SPACE;
      }

      if (scan.cpuTemp && scan.cpuTemp > 85) {
        issues.push({ name: 'CPU Overheating', cost: HARDWARE_COSTS.CPU_OVERHEATING });
        repairCost += HARDWARE_COSTS.CPU_OVERHEATING;
      }

      if (scan.batteryHealth && scan.batteryHealth < 50) {
        issues.push({ name: 'Battery Degraded', cost: HARDWARE_COSTS.BATTERY_DEGRADED });
        repairCost += HARDWARE_COSTS.BATTERY_DEGRADED;
      }

      return {
        id: scan.id,
        deviceId: scan.deviceId,
        staffName: scan.staffName,
        staffEmail: scan.staffEmail,
        department: scan.department,
        repairCost,
        issues,
      };
    }).filter(device => device.issues.length > 0);
  };

  useEffect(() => {
    loadBudgetData();
  }, [deviceScans, fixedRepairs, calculateDeviceCosts, calculateBudgetValues, loadBudgetData]);


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
      getDevicesWithRepairDetails,
      deviceScans,
      calculateFilteredRepairCosts,
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