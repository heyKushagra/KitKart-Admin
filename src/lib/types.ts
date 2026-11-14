// Shared TypeScript types used across the KitKart admin panel.
// Keeping them in one place makes the data shapes easy to find and update.

/** A sports jersey product sold in the store. */
export interface Product {
  id: string;
  name: string;
  team: string;
  category: string;
  mrp?: number;
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
  jerseyYear?: string;
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
  order_id?: number;
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
  payment_type?: string;
  order_total?: number;
  advance_paid?: number;
  cod_amount?: number;
  payment_status?: string;
  shiprocket_status?: string;
  shiprocket_order_id?: string | number;
  shipment_id?: string | number;
  channel_order_id?: string | number;
  shiprocket_error?: string;
  shipment_status?: string;
  awb_code?: string;
  courier_name?: string;
  tracking_url?: string;
  shiprocket_updated_at?: string;
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
