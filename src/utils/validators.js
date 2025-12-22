import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  username: yup.string().required('Username is required'),
  password: yup.string().required('Password is required')
});

export const productSchema = yup.object().shape({
  productName: yup.string().required('Product name is required'),
  sizePackage: yup.string().required('Size/Package is required'),
  unit: yup.string().required('Unit is required'),
  salePrice: yup.number().positive('Sale price must be positive').required('Sale price is required'),
  purchasePrice: yup.number().positive('Purchase price must be positive').required('Purchase price is required'),
  discount: yup.number().min(0).max(100).default(0),
  quantity: yup.number().min(0).required('Quantity is required'),
  minStockLevel: yup.number().min(0).default(10),
  category: yup.string().required('Category is required'),
  barcode: yup.string().nullable(),
  supplier: yup.string().nullable()
});

export const expenseSchema = yup.object().shape({
  description: yup.string().required('Description is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  category: yup.string().required('Category is required'),
  expenseDate: yup.date().default(() => new Date()),
  paidBy: yup.string().nullable(),
  receiptNumber: yup.string().nullable(),
  notes: yup.string().nullable()
});

export const saleSchema = yup.object().shape({
  items: yup.array().of(
    yup.object().shape({
      product: yup.string().required('Product is required'),
      quantity: yup.number().min(1).required('Quantity is required'),
      unitPrice: yup.number().positive('Unit price must be positive').required('Unit price is required'),
      discount: yup.number().min(0).default(0)
    })
  ).min(1, 'At least one item is required'),
  customer: yup.object().shape({
    name: yup.string().nullable(),
    phone: yup.string().nullable()
  }),
  paymentMethod: yup.string().oneOf(['cash', 'card', 'credit', 'mixed']).default('cash'),
  paidAmount: yup.number().positive('Paid amount must be positive').required('Paid amount is required')
});

export const userSchema = yup.object().shape({
  username: yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').when('$isEditMode', {
    is: false,
    then: schema => schema.required('Password is required'),
    otherwise: schema => schema
  }),
  role: yup.string().oneOf(['superadmin', 'admin', 'staff']).default('staff')
});