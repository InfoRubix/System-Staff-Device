'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useBudget } from '../contexts/BudgetContext';
import { useNavigation } from '../contexts/NavigationContext';
// Remove unused imports - DEPARTMENTS and Department are not needed in this component
import BudgetCard from './BudgetCard';
import Navigation from './Navigation';

// Dynamic Chart.js imports for better performance
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';

// Lazy load chart components
const Pie = dynamic(() => import('react-chartjs-2').then((mod) => ({ default: mod.Pie })), {
  ssr: false,
  loading: () => <div className="w-full h-80 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
});

const Bar = dynamic(() => import('react-chartjs-2').then((mod) => ({ default: mod.Bar })), {
  ssr: false,
  loading: () => <div className="w-full h-80 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
});

const Line = dynamic(() => import('react-chartjs-2').then((mod) => ({ default: mod.Line })), {
  ssr: false,
  loading: () => <div className="w-full h-80 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
});

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

function DataAnalysis() {
  const { devices, loading } = useDevices();
  const { getDevicesData } = useBudget();
  const { isNavigating } = useNavigation();
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [showOSPopup, setShowOSPopup] = useState(false);
  const [showRAMPopup, setShowRAMPopup] = useState(false);
  const [showProcessorPopup, setShowProcessorPopup] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [showOSDetailModal, setShowOSDetailModal] = useState(false);

  // Use budget context devices for consistent OS distribution
  const budgetDevices = getDevicesData();

  // Handle OS bar click
  const handleOSBarClick = (osName: string) => {
    setSelectedOS(osName);
    setShowOSDetailModal(true);
  };

  // Get devices for selected OS
  const selectedOSDevices = useMemo(() => {
    if (!selectedOS || !devices) return [];
    return devices.filter(device => device.operatingSystem.trim() === selectedOS);
  }, [selectedOS, devices]);

  // Calculate upgrade status for each device based on real specifications
  const devicesWithUpgradeStatus = useMemo(() => {
    if (!devices) return [];

    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 8; // Devices older than 8 years need upgrade

    return devices.map(device => {
      let needsUpgrade = false;
      const processor = device.processor.toLowerCase();
      const ramSize = parseInt(device.ram.replace(/[^\d]/g, ''));

      // Intel generation to year mapping
      const intelGenerations: Record<string, number> = {
        '1st': 2010, '2nd': 2011, '3rd': 2012, '4th': 2013, '5th': 2014,
        '6th': 2015, '7th': 2016, '8th': 2017, '9th': 2018, '10th': 2019,
        '11th': 2020, '12th': 2021, '13th': 2022, '14th': 2023
      };

      // AMD Ryzen series to year mapping
      const amdRyzenSeries: Record<string, number> = {
        '1000': 2017, '2000': 2018, '3000': 2019, '4000': 2020,
        '5000': 2020, '6000': 2022, '7000': 2022, '8000': 2024
      };

      // Check if CPU needs upgrade
      if (processor.includes('intel')) {
        const genMatch = processor.match(/(\d+)th gen/);
        if (genMatch) {
          const generation = genMatch[1] + 'th';
          const releaseYear = intelGenerations[generation];
          if (releaseYear && releaseYear <= cutoffYear) needsUpgrade = true;
        }

        // Check for specific old Intel processors
        if (processor.includes('i3-4') || processor.includes('i5-4') || processor.includes('i7-4') ||
            processor.includes('i3-5') || processor.includes('i5-5') || processor.includes('i7-5') ||
            processor.includes('i3-6') || processor.includes('i5-6') || processor.includes('i7-6') ||
            processor.includes('i3-7') || processor.includes('i5-7') || processor.includes('i7-7') ||
            processor.includes('core 2') || processor.includes('pentium') || processor.includes('celeron')) {
          needsUpgrade = true;
        }
      }

      // Check AMD processors
      if (processor.includes('ryzen')) {
        const seriesMatch = processor.match(/ryzen \d+ (\d+)/);
        if (seriesMatch) {
          const series = seriesMatch[1].substring(0, 1) + '000';
          const releaseYear = amdRyzenSeries[series];
          if (releaseYear && releaseYear <= cutoffYear) needsUpgrade = true;
        }
      }

      // Check older AMD processors (pre-Ryzen)
      if (processor.includes('amd') && !processor.includes('ryzen')) {
        if (processor.includes('fx') || processor.includes('a-series') ||
            processor.includes('phenom') || processor.includes('athlon')) {
          needsUpgrade = true;
        }
      }

      // Check if RAM is below minimum (less than 8GB needs upgrade)
      if (ramSize < 8) {
        needsUpgrade = true;
      }

      // Check device status (broken devices need upgrade/replacement)
      if (device.status === 'Broken' || device.status === 'Needs Repair') {
        needsUpgrade = true;
      }

      return {
        ...device,
        needsUpgrade
      };
    });
  }, [devices]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (!devices || devices.length === 0) {
      return {
        upgradePercentage: 0,
        upgradeStats: { upgraded: 0, total: 0 },
        osDistribution: {},
        processorBelowSpec: 0,
        processorStats: { belowSpec: 0, total: 0 },
        ramDistribution: { under8GB: 0, ram8GB: 0, ram16GBPlus: 0 }
      };
    }

    const totalDevices = devices.length;

    // 1. Upgrade calculation (using real device specifications)
    const devicesNeedingUpgrade = devicesWithUpgradeStatus.filter(device => device.needsUpgrade).length;
    const upgradedDevices = totalDevices - devicesNeedingUpgrade; // Devices that don't need upgrade are "upgraded"
    const upgradePercentage = Math.round((upgradedDevices / totalDevices) * 100);

    // 2. OS distribution
    const osCounts = { Windows: 0, Android: 0, iOS: 0 };
    devices.forEach(device => {
      const os = device.operatingSystem.toLowerCase();
      if (os.includes('windows')) osCounts.Windows++;
      else if (os.includes('android')) osCounts.Android++;
      else if (os.includes('macos') || os.includes('ios')) osCounts.iOS++;
    });

    const osDistribution = {
      Windows: Math.round((osCounts.Windows / totalDevices) * 100),
      Android: Math.round((osCounts.Android / totalDevices) * 100),
      iOS: Math.round((osCounts.iOS / totalDevices) * 100)
    };

    // 3. CPU age-based calculation (8+ years old needs upgrade)
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 8; // CPUs older than 8 years need upgrade

    const devicesNeedingCPUUpgrade = devices.filter(device => {
      const processor = device.processor.toLowerCase();

      // Intel generation to year mapping (approximate release years)
      const intelGenerations = {
        '1st': 2010, '2nd': 2011, '3rd': 2012, '4th': 2013, '5th': 2014,
        '6th': 2015, '7th': 2016, '8th': 2017, '9th': 2018, '10th': 2019,
        '11th': 2020, '12th': 2021, '13th': 2022, '14th': 2023
      };

      // AMD Ryzen series to year mapping
      const amdRyzenSeries = {
        '1000': 2017, '2000': 2018, '3000': 2019, '4000': 2020,
        '5000': 2020, '6000': 2022, '7000': 2022, '8000': 2024
      };

      // Check Intel processors
      if (processor.includes('intel')) {
        // Check for generation patterns
        const genMatch = processor.match(new RegExp('(\\d+)th gen'));
        if (genMatch) {
          const generation = genMatch[1] + 'th';
          const releaseYear = intelGenerations[generation];
          if (releaseYear && releaseYear <= cutoffYear) return true;
        }

        // Check older Intel naming patterns (pre-8th gen are definitely old)
        if (processor.includes('i3-4') || processor.includes('i5-4') || processor.includes('i7-4') ||
            processor.includes('i3-5') || processor.includes('i5-5') || processor.includes('i7-5') ||
            processor.includes('i3-6') || processor.includes('i5-6') || processor.includes('i7-6') ||
            processor.includes('i3-7') || processor.includes('i5-7') || processor.includes('i7-7') ||
            processor.includes('core 2') || processor.includes('pentium') || processor.includes('celeron')) {
          return true;
        }
      }

      // Check AMD processors
      if (processor.includes('ryzen')) {
        const seriesMatch = processor.match(new RegExp('ryzen \\d+ (\\d+)'));
        if (seriesMatch) {
          const series = seriesMatch[1].substring(0, 1) + '000'; // Get series (1000, 2000, etc.)
          const releaseYear = amdRyzenSeries[series];
          if (releaseYear && releaseYear <= cutoffYear) return true;
        }
      }

      // Check older AMD processors (pre-Ryzen)
      if (processor.includes('amd') && !processor.includes('ryzen')) {
        if (processor.includes('fx') || processor.includes('a-series') ||
            processor.includes('phenom') || processor.includes('athlon')) {
          return true; // These are definitely old
        }
      }

      return false;
    }).length;

    const processorBelowSpec = Math.round((devicesNeedingCPUUpgrade / totalDevices) * 100);

    // 4. RAM distribution
    const ramCounts = { under8GB: 0, ram8GB: 0, ram16GBPlus: 0 };
    devices.forEach(device => {
      const ramSize = parseInt(device.ram.replace(new RegExp('[^\\d]', 'g'), ''));
      if (ramSize <= 4) ramCounts.under8GB++;
      else if (ramSize === 8) ramCounts.ram8GB++;
      else ramCounts.ram16GBPlus++;
    });

    const ramDistribution = {
      under8GB: Math.round((ramCounts.under8GB / totalDevices) * 100),
      ram8GB: Math.round((ramCounts.ram8GB / totalDevices) * 100),
      ram16GBPlus: Math.round((ramCounts.ram16GBPlus / totalDevices) * 100)
    };

    return {
      upgradePercentage,
      upgradeStats: { upgraded: upgradedDevices, total: totalDevices },
      osDistribution,
      processorBelowSpec,
      processorStats: { belowSpec: devicesNeedingCPUUpgrade, total: totalDevices },
      ramDistribution
    };
  }, [devices, devicesWithUpgradeStatus]);

  // PDF Export Function
  const exportToPDF = async () => {
    setExporting(true);

    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const element = document.getElementById('analysis-content');

      if (element) {
        // Hide all elements with pdf-ignore class
        const ignoreElements = document.querySelectorAll('.pdf-ignore');
        const originalDisplays: string[] = [];
        ignoreElements.forEach((el, index) => {
          originalDisplays[index] = (el as HTMLElement).style.display;
          (el as HTMLElement).style.display = 'none';
        });

        const canvas = await html2canvas(element, {
          scale: 2, // High resolution for sharp text and charts
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff', // White background for PDF
          scrollX: 0,
          scrollY: 0,
        });

        // Restore hidden elements
        ignoreElements.forEach((el, index) => {
          (el as HTMLElement).style.display = originalDisplays[index];
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const fileName = `data-analysis-${today}.pdf`;

        pdf.save(fileName);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error);
    } finally {
      setExporting(false);
    }
  };

  // Monitor devices data changes to ensure chart updates
  useEffect(() => {
    // This effect ensures the chart data recalculates when devices change
    // The deviceTypeData useMemo will automatically trigger when devices updates
  }, [devices, loading]);

  // Removed pageLoading effect - using navigation loading instead

  // Handle ESC key for modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showOSDetailModal) {
        setShowOSDetailModal(false);
      }
    };

    if (showOSDetailModal) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [showOSDetailModal]);


  // Calculate device status data for pie chart
  const statusData = useMemo(() => {
    if (!devices) return { labels: [], datasets: [] };

    const statusCounts = {
      Working: 0,
      'Needs Repair': 0,
      'Broken': 0,
    };

    devices.forEach(device => {
      if (device.status === 'Working') {
        statusCounts.Working++;
      } else if (device.status === 'Needs Repair') {
        statusCounts['Needs Repair']++;
      } else if (device.status === 'Broken') {
        statusCounts['Broken']++;
      }
    });

    return {
      labels: ['Working', 'Needs Repair', 'Broken'],
      datasets: [
        {
          data: [statusCounts.Working, statusCounts['Needs Repair'], statusCounts['Broken']],
          backgroundColor: [
            '#10B981', // Green for Working
            '#F59E0B', // Yellow for Needs Repair
            '#EF4444', // Red for Broken
          ],
          borderColor: [
            '#059669',
            '#D97706',
            '#DC2626',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [devices]);

  // Calculate device type data for pie chart
  const deviceTypeData = useMemo(() => {
    if (!devices) return { labels: [], datasets: [] };

    const typeCounts = {
      Laptop: 0,
      Desktop: 0,
      Tablet: 0,
      Phone: 0,
    };

    devices.forEach(device => {
      if (device.deviceType === 'Laptop') typeCounts.Laptop++;
      else if (device.deviceType === 'Desktop') typeCounts.Desktop++;
      else if (device.deviceType === 'Tablet') typeCounts.Tablet++;
      else if (device.deviceType === 'Phone') typeCounts.Phone++;
      // 'Both' type devices are handled differently in other contexts
    });

    return {
      labels: ['Laptop', 'Desktop', 'Tablet', 'Phone'],
      datasets: [
        {
          data: [typeCounts.Laptop, typeCounts.Desktop, typeCounts.Tablet, typeCounts.Phone],
          backgroundColor: [
            '#3B82F6', // Blue for Laptop
            '#8B5CF6', // Purple for Desktop
            '#10B981', // Green for Tablet
            '#F59E0B', // Yellow for Phone
          ],
          borderColor: [
            '#2563EB',
            '#7C3AED',
            '#059669',
            '#D97706',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [devices]);

  // Calculate OS age data for bar chart based on actual device data
  const osAgeData = useMemo(() => {
    if (!devices || devices.length === 0) return { labels: [], datasets: [] };

    // OS release year mapping for automatic age calculation
    const osReleaseYears: Record<string, number> = {
      // Windows versions
      'windows 11': 2021,
      'windows 10': 2015,
      'windows 8.1': 2013,
      'windows 8': 2012,
      'windows 7': 2009,
      // macOS versions
      'macos sonoma': 2023,
      'macos ventura': 2022,
      'macos monterey': 2021,
      'macos big sur': 2020,
      'macos catalina': 2019,
      'macos mojave': 2018,
      'macos high sierra': 2017,
      'macos sierra': 2016,
      // iOS versions
      'ios 18': 2024,
      'ios 17': 2023,
      'ios 16': 2022,
      'ios 15': 2021,
      'ios 14': 2020,
      'ios 13': 2019,
      // Android versions
      'android 15': 2024,
      'android 14': 2023,
      'android 13': 2022,
      'android 12': 2021,
      'android 11': 2020,
      'android 10': 2019,
      'android 9': 2018,
    };

    const currentYear = new Date().getFullYear();
    const osAgeMap: Record<string, number> = {};

    // Get unique OS names from devices and calculate their ages
    const uniqueOSNames = [...new Set(devices.map(device => device.operatingSystem.trim()))];

    uniqueOSNames.forEach(osName => {
      if (osName) {
        const osKey = osName.toLowerCase();
        const releaseYear = osReleaseYears[osKey];

        if (releaseYear) {
          const age = Math.max(0, currentYear - releaseYear);
          osAgeMap[osName] = age; // Keep actual age for processing
        } else {
          // If OS not in mapping, estimate age based on device creation date
          const devicesWithThisOS = devices.filter(d => d.operatingSystem.trim() === osName);
          if (devicesWithThisOS.length > 0) {
            // Use oldest device creation date as estimate
            const oldestDevice = devicesWithThisOS.reduce((oldest, current) =>
              current.createdAt < oldest.createdAt ? current : oldest
            );
            const estimatedAge = Math.floor((Date.now() - oldestDevice.createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            osAgeMap[osName] = estimatedAge;
          }
        }
      }
    });

    // Sort by OS name for consistent display
    const sortedOSNames = Object.keys(osAgeMap).sort();

    if (sortedOSNames.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = sortedOSNames;
    const ages = sortedOSNames.map(os => osAgeMap[os]);
    const maxAge = Math.max(...ages);

    // Use consistent blue color for all bars
    const backgroundColor = '#3B82F6'; // Blue
    const borderColor = '#2563EB'; // Darker blue

    return {
      labels,
      datasets: [
        {
          label: 'Age (Years)',
          data: ages,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 2,
        },
      ],
      maxAge, // Pass maxAge for dynamic Y-axis scaling
    };
  }, [devices]);

  // Calculate issues trend data for line chart based on device status and dates
  const issuesTrendData = useMemo(() => {
    if (!devices) return { labels: [], datasets: [] };

    // Get the last 12 months
    const currentDate = new Date();
    const monthLabels: string[] = [];
    const monthData: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthLabels.push(monthKey);

      // Count devices with issues (Broken, Needs Repair)
      // that were created or last updated in this month
      let issueCount = 0;
      devices.forEach(device => {
        const problemStatuses = ['Broken', 'Needs Repair'];

        if (problemStatuses.includes(device.status)) {
          // Use the most recent date (creation or update) to determine when the issue occurred
          const relevantDate = device.updatedAt > device.createdAt ? device.updatedAt : device.createdAt;

          if (
            relevantDate.getFullYear() === date.getFullYear() &&
            relevantDate.getMonth() === date.getMonth()
          ) {
            issueCount++;
          }
        }
      });

      monthData.push(issueCount);
    }

    return {
      labels: monthLabels,
      datasets: [
        {
          label: 'Devices with Issues',
          data: monthData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#EF4444',
          pointBorderColor: '#DC2626',
          pointHoverBackgroundColor: '#DC2626',
          pointHoverBorderColor: '#B91C1C',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [devices]);

  // Chart options
  const statusPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  const typePieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} devices (${percentage}%)`;
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return context[0]?.label || '';
          },
          label: function(context: any) {
            const osName = context.label;
            const age = context.parsed.y;
            const deviceCount = context.dataset.data[context.dataIndex];

            return [
              `${osName}`,
              `Age: ${age} year${age !== 1 ? 's' : ''} old`,
              `Devices: ${deviceCount}`,
              age >= 5 ? '⚠️ Outdated - Consider updating' :
              age >= 3 ? '⚡ Getting old' :
              age >= 1 ? '✅ Relatively current' : '🆕 Latest'
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Age (Years)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        ticks: {
          callback: function(value: any) {
            return value;
          },
        },
      },
      x: {
        title: {
          display: true,
          text: 'Operating Systems',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
      },
    },
  };

  // OS Age Chart specific options with dynamic Y-axis based on max age
  const osAgeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const osName = osAgeData.labels[elementIndex];
        handleOSBarClick(osName);
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return context[0]?.label || '';
          },
          label: function(context: any) {
            const osName = context.label;
            const ageInYears = context.parsed.y;

            return [
              `Operating System: ${osName}`,
              `Age: ${ageInYears} year${ageInYears !== 1 ? 's' : ''} old`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: osAgeData.maxAge || 10,
        ticks: {
          stepSize: 1,
          callback: function(value: any) {
            return value;
          }
        },
        title: {
          display: true,
          text: 'Years',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: 'Operating Systems',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return `${context[0]?.label || ''} Issues`;
          },
          label: function(context: any) {
            const count = context.parsed.y;
            return [
              `Devices with Issues: ${count}`,
              `Status: Broken, Needs Repair`
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Number of Devices with Issues',
        },
      },
    },
  };

  // Removed devices loading check - using navigation loading instead

  // Removed old LoadingScreen - using navigation loading instead

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation - Excluded from PDF */}
      <div className="pdf-ignore">
        <Navigation />
      </div>

      {/* Data Analysis Content - This will be exported to PDF */}
      <div id="analysis-content" className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Data Analysis</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Visual insights and analytics for device management</p>
        </div>

        {/* KPI Cards - Responsive grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Left side - KPI Cards cluster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Upgrade Card */}
            <div
              className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              onClick={() => setShowUpgradePopup(true)}
            >
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Upgrade</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">{kpiMetrics.upgradePercentage}% upgraded</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpiMetrics.upgradeStats.upgraded} of {kpiMetrics.upgradeStats.total} devices upgraded</p>
              </div>
            </div>

            {/* OS Card */}
            <div
              className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              onClick={() => setShowOSPopup(true)}
            >
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">OS</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                  Win: {kpiMetrics.osDistribution.Windows}% | iOS: {kpiMetrics.osDistribution.iOS}% | And: {kpiMetrics.osDistribution.Android}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Current OS breakdown</p>
              </div>
            </div>

            {/* Processor Card */}
            <div
              className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              onClick={() => setShowProcessorPopup(true)}
            >
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Processor</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">{kpiMetrics.processorBelowSpec}% below spec</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpiMetrics.processorStats.belowSpec} devices need CPU upgrade</p>
              </div>
            </div>

            {/* RAM Card */}
            <div
              className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              onClick={() => setShowRAMPopup(true)}
            >
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">RAM</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                  &lt;8GB: {kpiMetrics.ramDistribution.under8GB}% | 8GB: {kpiMetrics.ramDistribution.ram8GB}% | 16GB+: {kpiMetrics.ramDistribution.ram16GBPlus}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">RAM availability across devices</p>
              </div>
            </div>
          </div>

          {/* Right side - Budget Card */}
          <div className="h-full">
            <BudgetCard />
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Device Status Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Device Status Distribution</h3>
            <div className="h-64 sm:h-80">
              <Pie
                data={statusData}
                options={statusPieOptions}
              />
            </div>
          </div>

          {/* Device Type Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Device Type Distribution</h3>
            <div className="h-64 sm:h-80">
              <Pie
                data={deviceTypeData}
                options={typePieOptions}
              />
            </div>
          </div>

          {/* OS Age Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Operating System Age Analysis</h3>
            <div className="h-64 sm:h-80">
              <Bar
                data={osAgeData}
                options={osAgeOptions}
              />
            </div>
          </div>

          {/* Issues Trend Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Device Issues Trend (Last 12 Months)</h3>
            <div className="h-64 sm:h-80">
              <Line
                data={issuesTrendData}
                options={lineOptions}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export PDF Button - Below analysis content */}
      <div className="mt-8 text-center pdf-ignore">
        <button
          onClick={exportToPDF}
          disabled={exporting || loading}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating PDF...
            </>
          ) : (
            <>
              <span className="mr-2">📄</span>
              Export as PDF
            </>
          )}
        </button>
      </div>

      {/* Popups remain unchanged for space - keeping existing popup implementations */}
      {/* Upgrade Details Popup */}
      {showUpgradePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpgradePopup(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-auto my-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <button
                onClick={() => setShowUpgradePopup(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>

              <div className="pt-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    Device Upgrade Analysis
                  </h3>
                  <p className="text-sm text-gray-600">
                    Detailed upgrade status breakdown
                  </p>
                </div>

                <div className="space-y-4">
                  {devicesWithUpgradeStatus && devicesWithUpgradeStatus.length > 0 ? devicesWithUpgradeStatus.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{device.staffName}</div>
                        <div className="text-sm text-gray-600">{device.deviceModel}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        !device.needsUpgrade
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {!device.needsUpgrade ? 'Upgraded' : 'Not Upgraded'}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500">No device data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OS Details Popup */}
      {showOSPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowOSPopup(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-auto my-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <button
                onClick={() => setShowOSPopup(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>

              <div className="pt-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    Operating System Analysis
                  </h3>
                  <p className="text-sm text-gray-600">
                    Current OS distribution across devices
                  </p>
                </div>

                <div className="space-y-4">
                  {devices && devices.length > 0 ? devices.map(device => {
                    const os = device.operatingSystem.toLowerCase();
                    let osCategory = 'Other';
                    let osColor = 'bg-gray-100 text-gray-700';

                    if (os.includes('windows')) {
                      osCategory = 'Windows';
                      osColor = 'bg-blue-100 text-blue-700';
                    } else if (os.includes('android')) {
                      osCategory = 'Android';
                      osColor = 'bg-green-100 text-green-700';
                    } else if (os.includes('macos') || os.includes('ios')) {
                      osCategory = 'iOS/macOS';
                      osColor = 'bg-purple-100 text-purple-700';
                    }

                    return (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{device.staffName}</div>
                          <div className="text-sm text-gray-600">{device.deviceModel}</div>
                          <div className="text-xs text-gray-500">{device.operatingSystem}</div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${osColor}`}>
                          {osCategory}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-gray-500">No device data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAM Details Popup */}
      {showRAMPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRAMPopup(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-auto my-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <button
                onClick={() => setShowRAMPopup(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>

              <div className="pt-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    RAM Configuration Analysis
                  </h3>
                  <p className="text-sm text-gray-600">
                    Memory availability across all devices
                  </p>
                </div>

                <div className="space-y-4">
                  {devices && devices.length > 0 ? devices.map(device => {
                    const ramSize = parseInt(device.ram.replace(new RegExp('[^\\d]', 'g'), ''));
                    let ramCategory = 'Other';
                    let ramColor = 'bg-gray-100 text-gray-700';

                    if (ramSize <= 4) {
                      ramCategory = 'Under 8GB';
                      ramColor = 'bg-red-100 text-red-700';
                    } else if (ramSize === 8) {
                      ramCategory = '8GB';
                      ramColor = 'bg-yellow-100 text-yellow-700';
                    } else if (ramSize >= 16) {
                      ramCategory = '16GB+';
                      ramColor = 'bg-green-100 text-green-700';
                    }

                    return (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{device.staffName}</div>
                          <div className="text-sm text-gray-600">{device.deviceModel}</div>
                          <div className="text-xs text-gray-500">{device.ram}</div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${ramColor}`}>
                          {ramCategory}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-gray-500">No device data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processor Details Popup */}
      {showProcessorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowProcessorPopup(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-auto my-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <button
                onClick={() => setShowProcessorPopup(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>

              <div className="pt-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    Processor Analysis
                  </h3>
                  <p className="text-sm text-gray-600">
                    CPU specifications and upgrade recommendations
                  </p>
                </div>

                <div className="space-y-4">
                  {devices && devices.length > 0 ? devices.map(device => {
                    const processor = device.processor.toLowerCase();
                    const currentYear = new Date().getFullYear();
                    const cutoffYear = currentYear - 8;

                    // Intel generation to year mapping
                    const intelGenerations = {
                      '1st': 2010, '2nd': 2011, '3rd': 2012, '4th': 2013, '5th': 2014,
                      '6th': 2015, '7th': 2016, '8th': 2017, '9th': 2018, '10th': 2019,
                      '11th': 2020, '12th': 2021, '13th': 2022, '14th': 2023
                    };

                    // AMD Ryzen series to year mapping
                    const amdRyzenSeries = {
                      '1000': 2017, '2000': 2018, '3000': 2019, '4000': 2020,
                      '5000': 2020, '6000': 2022, '7000': 2022, '8000': 2024
                    };

                    let needsUpgrade = false;

                    // Check Intel processors
                    if (processor.includes('intel')) {
                      const genMatch = processor.match(new RegExp('(\\d+)th gen'));
                      if (genMatch) {
                        const generation = genMatch[1] + 'th';
                        const releaseYear = intelGenerations[generation];
                        if (releaseYear && releaseYear <= cutoffYear) needsUpgrade = true;
                      }

                      if (processor.includes('i3-4') || processor.includes('i5-4') || processor.includes('i7-4') ||
                          processor.includes('i3-5') || processor.includes('i5-5') || processor.includes('i7-5') ||
                          processor.includes('i3-6') || processor.includes('i5-6') || processor.includes('i7-6') ||
                          processor.includes('i3-7') || processor.includes('i5-7') || processor.includes('i7-7') ||
                          processor.includes('core 2') || processor.includes('pentium') || processor.includes('celeron')) {
                        needsUpgrade = true;
                      }
                    }

                    // Check AMD processors
                    if (processor.includes('ryzen')) {
                      const seriesMatch = processor.match(new RegExp('ryzen \\d+ (\\d+)'));
                      if (seriesMatch) {
                        const series = seriesMatch[1].substring(0, 1) + '000';
                        const releaseYear = amdRyzenSeries[series];
                        if (releaseYear && releaseYear <= cutoffYear) needsUpgrade = true;
                      }
                    }

                    // Check older AMD processors (pre-Ryzen)
                    if (processor.includes('amd') && !processor.includes('ryzen')) {
                      if (processor.includes('fx') || processor.includes('a-series') ||
                          processor.includes('phenom') || processor.includes('athlon')) {
                        needsUpgrade = true;
                      }
                    }

                    return (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{device.staffName}</div>
                          <div className="text-sm text-gray-600">{device.deviceModel}</div>
                          <div className="text-xs text-gray-500">{device.processor}</div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          needsUpgrade
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {needsUpgrade ? 'Needs Upgrade' : 'Meets Spec'}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-gray-500">No device data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OS Detail Modal */}
      {showOSDetailModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOSDetailModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{selectedOS}</h3>
              <button
                onClick={() => setShowOSDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {selectedOSDevices.length > 0 ? (
                <div className="space-y-3">
                  {selectedOSDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{device.staffName}</div>
                        <div className="text-sm text-gray-600">{device.department}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">No devices found for this OS</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataAnalysis;