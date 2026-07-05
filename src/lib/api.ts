// Mock REST API for the KitKart admin panel.
//
// In a real app these functions would call an HTTP backend (e.g. fetch("/api/products")).
// Here we simulate a backend using an in-memory dataset that persists to localStorage so
// your changes survive page reloads. Each function returns a Promise with a small delay
// to mimic network latency — making it easy to swap with real API calls later.

import type { Customer, Order, OrderStatus, Product } from "./types";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, deleteField } from "firebase/firestore";
import { firebaseDb } from "./firebase";

const STORAGE_KEY = "kitkart_data_v1";
const LATENCY = 350; // ms — fake network delay

// ---------- Seed data ---------------------------------------------------------
const seedProducts: Product[] = [
  // { id: "p1", name: "Red Devils Home Jersey", team: "Manchester United", category: "Football", price: 79.99, stock: 42, sku: "KIT-MU-001", image: "/images/products/jersey1.jpg", status: "Active", createdAt: "2024-01-12" },
  // { id: "p2", name: "Blue Thunder Away Kit", team: "Chelsea FC", category: "Football", price: 74.99, stock: 28, sku: "KIT-CH-002", image: "/images/products/jersey2.jpg", status: "Active", createdAt: "2024-02-03" },
  // { id: "p3", name: "Green Strikers Cricket Jersey", team: "Mumbai Indians", category: "Cricket", price: 64.99, stock: 15, sku: "KIT-MI-003", image: "/images/products/jersey3.jpg", status: "Active", createdAt: "2024-02-18" },
  // { id: "p4", name: "Golden Eagles Soccer Kit", team: "Brazil National", category: "Soccer", price: 89.99, stock: 33, sku: "KIT-BR-004", image: "/images/products/jersey4.jpg", status: "Active", createdAt: "2024-03-01" },
  // { id: "p5", name: "Black Panthers Home Kit", team: "Juventus FC", category: "Football", price: 84.99, stock: 0, sku: "KIT-JV-005", image: "/images/products/jersey5.jpg", status: "Active", createdAt: "2024-03-09" },
  // { id: "p6", name: "White Hawks Basketball Jersey", team: "LA Lakers", category: "Basketball", price: 94.99, stock: 21, sku: "KIT-LK-006", image: "/images/products/jersey6.jpg", status: "Draft", createdAt: "2024-03-22" },
];

const seedOrders: Order[] = [
  // { id: "ORD-1042", customerName: "Aarav Sharma", customerEmail: "aarav@example.com", items: 2, total: 159.98, status: "Delivered", date: "2024-04-18" },
  // { id: "ORD-1041", customerName: "Emily Carter", customerEmail: "emily@example.com", items: 1, total: 79.99, status: "Shipped", date: "2024-04-17" },
  // { id: "ORD-1040", customerName: "Liam Nguyen", customerEmail: "liam@example.com", items: 3, total: 239.97, status: "Processing", date: "2024-04-16" },
  // { id: "ORD-1039", customerName: "Sofia Rossi", customerEmail: "sofia@example.com", items: 1, total: 64.99, status: "Pending", date: "2024-04-16" },
  // { id: "ORD-1038", customerName: "Noah Williams", customerEmail: "noah@example.com", items: 2, total: 179.98, status: "Delivered", date: "2024-04-14" },
  // { id: "ORD-1037", customerName: "Maya Patel", customerEmail: "maya@example.com", items: 1, total: 89.99, status: "Cancelled", date: "2024-04-13" },
  // { id: "ORD-1036", customerName: "Ethan Brooks", customerEmail: "ethan@example.com", items: 4, total: 319.96, status: "Delivered", date: "2024-04-11" },
  // { id: "ORD-1035", customerName: "Olivia Martin", customerEmail: "olivia@example.com", items: 2, total: 159.98, status: "Shipped", date: "2024-04-10" },
];

const seedCustomers: Customer[] = [
  // { id: "c1", name: "Aarav Sharma", email: "aarav@example.com", phone: "+91 98765 43210", location: "Mumbai, IN", orders: 12, spent: 1284.5, joinedAt: "2023-06-12" },
  // { id: "c2", name: "Emily Carter", email: "emily@example.com", phone: "+1 415 555 0192", location: "San Francisco, US", orders: 7, spent: 642.0, joinedAt: "2023-08-03" },
  // { id: "c3", name: "Liam Nguyen", email: "liam@example.com", phone: "+61 400 123 456", location: "Sydney, AU", orders: 9, spent: 988.25, joinedAt: "2023-09-21" },
  // { id: "c4", name: "Sofia Rossi", email: "sofia@example.com", phone: "+39 333 1234567", location: "Rome, IT", orders: 4, spent: 312.4, joinedAt: "2023-11-15" },
  // { id: "c5", name: "Noah Williams", email: "noah@example.com", phone: "+44 7700 900123", location: "London, UK", orders: 15, spent: 1675.9, joinedAt: "2023-05-30" },
  // { id: "c6", name: "Maya Patel", email: "maya@example.com", phone: "+91 99887 76655", location: "Delhi, IN", orders: 3, spent: 245.0, joinedAt: "2024-01-08" },
  // { id: "c7", name: "Ethan Brooks", email: "ethan@example.com", phone: "+1 212 555 0148", location: "New York, US", orders: 11, spent: 1142.75, joinedAt: "2023-07-19" },
];

interface DataStore {
  products: Product[];
  orders: Order[];
  customers: Customer[];
}

// ---------- Persistence helpers ---------------------------------------------
function loadData(): DataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DataStore;
  } catch {
    /* ignore corrupt storage */
  }
  const fresh: DataStore = { products: seedProducts, orders: seedOrders, customers: seedCustomers };
  saveData(fresh);
  return fresh;
}

function saveData(data: DataStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage may be full (large base64 images) — fall back to in-memory only */
  }
}

// Simulate async network calls.
function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Products API -----------------------------------------------------
export const productsApi = {
  async list(): Promise<Product[]> {
    const querySnapshot = await getDocs(collection(firebaseDb, "products"));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const stock = data.stockQuantity !== undefined ? data.stockQuantity : data.stock;
      const status = stock === undefined || stock === null
        ? (data.status || "Active")
        : (stock === 0 ? "Out of Stock" : (data.status || "In Stock"));
      products.push({
        id: docSnap.id,
        ...data,
        stock,
        status,
      } as Product);
    });
    return products;
  },
  subscribe(callback: (products: Product[]) => void): () => void {
    const q = collection(firebaseDb, "products");
    return onSnapshot(q, (querySnapshot) => {
      const products: Product[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const stock = data.stockQuantity !== undefined ? data.stockQuantity : data.stock;
        const status = stock === undefined || stock === null
          ? (data.status || "Active")
          : (stock === 0 ? "Out of Stock" : (data.status || "In Stock"));
        products.push({
          id: docSnap.id,
          ...data,
          stock,
          status,
        } as Product);
      });
      callback(products);
    }, (error) => {
      console.error("Error subscribing to products: ", error);
    });
  },
  async create(input: Omit<Product, "id" | "createdAt">): Promise<Product> {
    const newDocRef = doc(collection(firebaseDb, "products"));
    const createdAt = new Date().toISOString().slice(0, 10);
    const { stock, price, ...rest } = input;
    const isBoot = rest.category?.toLowerCase().includes("boot");

    const productData: any = {
      ...rest,
      createdAt,
    };

    if (price !== undefined && price !== null) {
      productData.price = price;
    }

    if (stock !== undefined && stock !== null) {
      productData.stock = stock;
      productData.stockQuantity = stock;
      productData.status = stock === 0 ? "Out of Stock" : (input.status || "In Stock");
    } else {
      productData.status = input.status || "Active";
    }

    if (isBoot) {
      productData.contactForPrice = true;
    }

    await setDoc(newDocRef, productData);
    return {
      id: newDocRef.id,
      ...productData,
      stock: productData.stock,
    } as Product;
  },
  async update(id: string, input: Partial<Product>): Promise<Product> {
    const docRef = doc(firebaseDb, "products", id);
    const { stock, price, ...rest } = input;
    const isBoot = rest.category?.toLowerCase().includes("boot");
    const updateData: any = { ...rest };

    if (price !== undefined && price !== null) {
      updateData.price = price;
    } else if (isBoot) {
      updateData.price = deleteField();
    }

    if (stock !== undefined && stock !== null) {
      updateData.stock = stock;
      updateData.stockQuantity = stock;
      updateData.status = stock === 0 ? "Out of Stock" : (input.status || "In Stock");
    } else if (isBoot) {
      updateData.stock = deleteField();
      updateData.stockQuantity = deleteField();
      updateData.status = input.status || "Active";
    }

    if (isBoot) {
      updateData.contactForPrice = true;
    } else if (input.category) {
      updateData.contactForPrice = deleteField();
    }

    await updateDoc(docRef, updateData);
    const docSnap = await getDoc(docRef);
    const data = docSnap.data() as any;
    const updatedStock = data.stockQuantity !== undefined ? data.stockQuantity : data.stock;
    const updatedStatus = updatedStock === undefined || updatedStock === null
      ? (data.status || "Active")
      : (updatedStock === 0 ? "Out of Stock" : (data.status || "In Stock"));

    return {
      id: docSnap.id,
      ...data,
      stock: updatedStock,
      status: updatedStatus,
    } as Product;
  },
  async remove(id: string): Promise<void> {
    const docRef = doc(firebaseDb, "products", id);
    await deleteDoc(docRef);
  },
};

// ---------- Orders API -------------------------------------------------------
export const ordersApi = {
  async list(): Promise<Order[]> {
    const q = query(collection(firebaseDb, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const details = data.customerDetails || {};
      const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
      const addressParts = [details.address, details.city, details.state, details.pincode, details.country].filter(Boolean);
      return {
        id: docSnap.id,
        customerName: details.fullName || "Unknown",
        customerEmail: details.email || "",
        customerPhone: details.phone || "",
        customerAddress: addressParts.join(", "),
        products: data.products || [],
        total: data.totalAmount || 0,
        paymentMethod: data.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment",
        status: data.status || "Pending",
        date: date,
      };
    });
  },
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const docRef = doc(firebaseDb, "orders", id);
    await updateDoc(docRef, { status });
    // Fetch the updated document to return full Order object
    const docSnap = await getDoc(docRef);
    const data = docSnap.data() as any;
    const details = data.customerDetails || {};
    const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
    const addressParts = [details.address, details.city, details.state, details.pincode, details.country].filter(Boolean);

    return {
      id: docSnap.id,
      customerName: details.fullName || "Unknown",
      customerEmail: details.email || "",
      customerPhone: details.phone || "",
      customerAddress: addressParts.join(", "),
      products: data.products || [],
      total: data.totalAmount || 0,
      paymentMethod: data.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment",
      status: data.status || "Pending",
      date: date,
    };
  },
};

// ---------- Customers API (read-only) ---------------------------------------
export const customersApi = {
  async list(): Promise<Customer[]> {
    // Fetch all orders to derive customers
    const q = query(collection(firebaseDb, "orders"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const customersMap = new Map<string, Customer>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const details = data.customerDetails || {};
      const email = details.email;

      if (!email) return;

      if (!customersMap.has(email)) {
        customersMap.set(email, {
          id: email, // Using email as unique ID
          name: details.fullName || "Unknown",
          email: email,
          phone: details.phone || "",
          location: [details.city, details.country].filter(Boolean).join(", "),
          orders: 0,
          spent: 0,
          joinedAt: "", // Will be overwritten by the latest order date due to asc order
        });
      }

      const customer = customersMap.get(email)!;
      customer.orders += 1;
      customer.spent += data.totalAmount || 0;

      // Update joinedAt to be the most recent order date
      if (data.createdAt?.toDate) {
        customer.joinedAt = data.createdAt.toDate().toLocaleDateString();
      } else {
        customer.joinedAt = new Date().toLocaleDateString();
      }
    });

    // Return descending (most recently active first)
    return Array.from(customersMap.values()).reverse();
  },
};

// ---------- Auth API ----------------------------------------------------------
// Demo credentials. A real app would validate against a backend.
export const authApi = {
  async login(email: string, password: string): Promise<{ name: string; email: string }> {
    await delay(null, 600);
    if (email === "kishan@kitkart.com" && password === "kishan1234") {
      return { name: "Kishan Shukla", email };
    }
    if (email === "admin@kitkart.com" && password === "adminkush") {
      return { name: "Kushagra", email };
    }
    if (email === "admin1@kitkart.com" && password === "newadmin123") {
      return { name: "NEW ADMIN", email };
    }
    throw new Error("Invalid email or password");
  },
};
