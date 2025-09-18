export interface BudgetData {
  id: string;
  month: string; // Format: "2024-01"
  totalBudget: number; // Total budget in RM
  amountSpent: number; // Confirmed spent amount in RM
  projectedSpend: number; // Estimated costs for ongoing repairs in RM
  remainingBudget: number; // Available budget in RM
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  deviceId: string;
  amount: number; // Amount in RM
  description: string;
  date: Date;
  createdAt: Date;
}

export interface PartsCatalog {
  id: string;
  partName: string;
  defaultCost: number; // Cost in RM
  category: 'Screen' | 'Battery' | 'Keyboard' | 'Memory' | 'Storage' | 'Motherboard' | 'Other';
  createdAt: Date;
  updatedAt: Date;
}

export interface RepairRecord {
  id: string;
  deviceId: string;
  issueType: 'Hardware Failure' | 'Screen Damage' | 'Battery Issue' | 'Keyboard Problem' | 'Software Issue' | 'Water Damage' | 'Physical Damage' | 'Other';
  estimatedCost: number; // Estimated cost in RM (calculated by age-based rules)
  finalCost?: number; // Final cost in RM (when repair is completed)
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  description?: string;
  eta?: Date; // Estimated completion date
  estimationMethod: 'age-based'; // Always age-based now
  ageAtFailure: number; // Device age when issue occurred
  estimationExplanation: string; // Human-readable explanation of cost calculation
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface BudgetAlert {
  id: string;
  type: 'budget_exceeded' | 'budget_warning' | 'repair_cost_high';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: Date;
}

export interface BudgetContextType {
  currentBudget: BudgetData | null;
  previousBudget: BudgetData | null;
  purchases: Purchase[];
  repairRecords: RepairRecord[];
  partsCatalog: PartsCatalog[];
  budgetAlerts: BudgetAlert[];
  loading: boolean;
  error: string | null;
  getBudgetChangePercentage: () => number;
  getOpenRepairCosts: () => RepairRecord[];
  getTotalProjectedSpend: () => number;
  getEstimatedRepairCosts: () => number;
  getEstimatedReplacementCosts: () => number;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'>) => Promise<void>;
  addRepairRecord: (deviceId: string, issueType: RepairRecord['issueType'], description?: string) => Promise<void>;
  updateRepairRecord: (id: string, updates: Partial<RepairRecord>) => Promise<void>;
  getEstimatedCostForDevice: (deviceId: string) => number;
  refreshBudget: () => Promise<void>;
}