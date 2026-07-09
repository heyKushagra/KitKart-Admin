// Shared TypeScript types used across the KitKart admin panel.
// Keeping them in one place makes the data shapes easy to find and update.

/** A sports jersey product sold in the store. */
export interface Product {
  id: string;
  name: string;
  team: string;
  category: string;
  price?: number;
  stock?: number;
  sku: string;
  mainImage: string; // URL or base64 data URL (from image upload)
  optionalImages?: string[]; // Additional optional images
  image?: string; // Legacy image fallback
  status: "Active" | "Draft" | "In Stock" | "Out of Stock";
  createdAt: string;
  tag?: "New" | "Sale" | "Hot" | "Trendy" | "IPL" | "FIFA" | "";
  sizes?: string[];
  description?: string;
  contactForPrice?: boolean;
  brand?: string;
}

/** The lifecycle status of a customer order. */
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

/** A customer order containing one or more items. */
export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  products: { id: string; name: string; quantity: number; price: number; size?: string; image?: string }[];
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  date: string;
  discountName?: string;
  discountAmount?: number;
  subtotal?: number;
}

/** A store customer (read-only in the admin panel). */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orders: number;
  spent: number;
  joinedAt: string;
}

/** Summary statistics shown on the dashboard. */
export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
}

/** Shape of a toast notification. */
export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
