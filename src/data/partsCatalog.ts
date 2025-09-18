import { PartsCatalog } from '../types/budget';

export const defaultPartsCatalog: PartsCatalog[] = [
  // Screen Components
  {
    id: '1',
    partName: 'Laptop Screen 14"',
    defaultCost: 450,
    category: 'Screen',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    partName: 'Laptop Screen 15.6"',
    defaultCost: 550,
    category: 'Screen',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    partName: 'Desktop Monitor 24"',
    defaultCost: 650,
    category: 'Screen',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Battery Components
  {
    id: '4',
    partName: 'Laptop Battery Standard',
    defaultCost: 180,
    category: 'Battery',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    partName: 'Laptop Battery Extended',
    defaultCost: 280,
    category: 'Battery',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Keyboard Components
  {
    id: '6',
    partName: 'Laptop Keyboard',
    defaultCost: 120,
    category: 'Keyboard',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '7',
    partName: 'Desktop Keyboard',
    defaultCost: 80,
    category: 'Keyboard',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Memory Components
  {
    id: '8',
    partName: 'RAM 8GB DDR4',
    defaultCost: 160,
    category: 'Memory',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '9',
    partName: 'RAM 16GB DDR4',
    defaultCost: 320,
    category: 'Memory',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '10',
    partName: 'RAM 32GB DDR4',
    defaultCost: 640,
    category: 'Memory',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Storage Components
  {
    id: '11',
    partName: 'SSD 256GB',
    defaultCost: 200,
    category: 'Storage',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '12',
    partName: 'SSD 512GB',
    defaultCost: 350,
    category: 'Storage',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '13',
    partName: 'SSD 1TB',
    defaultCost: 600,
    category: 'Storage',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Motherboard Components
  {
    id: '14',
    partName: 'Laptop Motherboard',
    defaultCost: 1200,
    category: 'Motherboard',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '15',
    partName: 'Desktop Motherboard',
    defaultCost: 800,
    category: 'Motherboard',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Other Components
  {
    id: '16',
    partName: 'Power Adapter',
    defaultCost: 90,
    category: 'Other',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '17',
    partName: 'Cooling Fan',
    defaultCost: 60,
    category: 'Other',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '18',
    partName: 'USB Port Repair',
    defaultCost: 40,
    category: 'Other',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '19',
    partName: 'Audio Jack Repair',
    defaultCost: 35,
    category: 'Other',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '20',
    partName: 'Liquid Damage Repair',
    defaultCost: 350,
    category: 'Other',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Labor costs for different types of repairs
export const laborCosts = {
  'Screen Damage': 80,
  'Battery Issue': 50,
  'Keyboard Problem': 40,
  'Hardware Failure': 120,
  'Software Issue': 60,
  'Water Damage': 200,
  'Physical Damage': 150,
  'Other': 80,
};