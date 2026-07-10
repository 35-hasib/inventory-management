export type Role = "ADMIN" | "EMPLOYEE";

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  currency: string;
  invoicePrefix: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId?: string | null;
  category?: Category | null;
  description?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unit: string;
  costPrice: string;
  sellPrice: string;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface LineItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
}

export interface Purchase {
  id: string;
  reference?: string | null;
  status: string;
  totalAmount: string;
  createdAt: string;
  supplier?: Contact | null;
  items?: PurchaseItemRow[];
  _count?: { items: number };
}

export interface PurchaseItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitCost: string;
  lineTotal: string;
  product?: Product;
}

export interface Sale {
  id: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  totalAmount: string;
  createdAt: string;
  customer?: Contact | null;
  invoice?: Invoice | null;
  items?: SaleItemRow[];
  _count?: { items: number };
}

export interface SaleItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product?: Product;
}

export interface Invoice {
  id: string;
  number: string;
  issuedAt: string;
  totalAmount: string;
  sale?: Sale;
}

export interface StockMovement {
  id: string;
  type: string;
  quantityChange: number;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
  product?: { name: string; sku: string };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  tier: "FREE" | "BASIC" | "PREMIUM";
  name: string;
  priceMonthly: string;
  maxUsers: number;
  maxProducts: number;
  features?: Record<string, unknown> | null;
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan?: Plan;
}

export interface Payment {
  id: string;
  amount: string;
  status: string;
  provider: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface DashboardData {
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    categories: number;
    salesCount: number;
    purchaseCount: number;
  };
  totals: { sales: number; purchases: number };
  lowStock: { id: string; name: string; sku: string; quantity: number; lowStockThreshold: number }[];
  series: {
    sales: { day: string; total: number }[];
    purchases: { day: string; total: number }[];
  };
}
