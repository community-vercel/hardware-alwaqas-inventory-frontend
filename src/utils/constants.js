export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const PRODUCT_CATEGORIES = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'tools', label: 'Tools' },
  { value: 'paint', label: 'Paint' },
  { value: 'other', label: 'Other' }
];

export const PRODUCT_UNITS = [
  { value: 'piece', label: 'Piece' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' }
];

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'petrol', label: 'Petrol' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'salary', label: 'Salary' },
  { value: 'other', label: 'Other' }
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'credit', label: 'Credit' },
  { value: 'mixed', label: 'Mixed' }
];

export const USER_ROLES = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' }
];