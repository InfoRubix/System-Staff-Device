// Malaysian date formatting utilities

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }); // Returns DD/MM/YYYY
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleString('en-MY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }); // Returns DD/MM/YYYY, HH:MM AM/PM
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }); // Returns HH:MM AM/PM
};

export const formatDateLong = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }); // Returns D Month YYYY (e.g., 16 November 2025)
};
