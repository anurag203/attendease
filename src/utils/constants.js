export const DEGREES = ['B.Tech', 'M.Tech'];

export const BRANCHES = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Chemical',
  'Metallurgy',
];

export const YEARS = [1, 2, 3, 4];

// Helper function to format year with ordinal suffix
export const formatYear = (year) => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = year % 100;
  return `${year}${suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]} Year`;
};

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  dark: '#0f172a',
  darkGray: '#1e293b',
  mediumGray: '#334155',
  lightGray: '#94a3b8',
  white: '#ffffff',
  success: '#22c55e',
  background: '#0f172a',
};
