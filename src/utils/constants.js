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
  // Count
  { value: 'piece', label: 'Piece' },
  { value: 'pair', label: 'Pair' },
  { value: 'set', label: 'Set' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'carton', label: 'Carton' },

  // Weight
  { value: 'gram', label: 'Gram' },
  { value: 'kg', label: 'Kilogram (Kg)' },
  { value: 'ton', label: 'Ton' },

  // Length
  { value: 'inch', label: 'Inch' },
  { value: 'feet', label: 'Feet' },
  { value: 'meter', label: 'Meter' },
  { value: 'roll', label: 'Roll' },
  { value: 'coil', label: 'Coil' },

  // Volume
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'liter', label: 'Liter' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'drum', label: 'Drum' },

  // Area
  { value: 'sqft', label: 'Square Feet (sqft)' },
  { value: 'sqm', label: 'Square Meter (sqm)' },

  // Electrical
  { value: 'ampere', label: 'Ampere (A)' },
  { value: 'watt', label: 'Watt (W)' }
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