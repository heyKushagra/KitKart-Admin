// Mock REST API for the KitKart admin panel.
//
// In a real app these functions would call an HTTP backend (e.g. fetch("/api/products")).
// Here we simulate a backend using an in-memory dataset that persists to localStorage so
// your changes survive page reloads. Each function returns a Promise with a small delay
// to mimic network latency — making it easy to swap with real API calls later.

import type { Customer, Order, OrderStatus, Product } from "./types";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, onSnapshot, deleteField } from "firebase/firestore";
import { firebaseDb, firebaseStorage, firebaseAuthReady } from "./firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// Deeply removes undefined values from objects and arrays to prevent Firestore errors
function removeUndefined(obj: any): any {
  if (obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    return obj.filter(v => v !== undefined).map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    // Preserve Firestore sentinels and Timestamps
    if (obj._methodName || typeof obj.toDate === 'function') return obj;
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (obj[key] !== undefined) {
          newObj[key] = removeUndefined(obj[key]);
        }
      }
    }
    return newObj;
  }
  return obj;
}

async function handleTargetCategoryImages(
  productId: string,
  category: string,
  mainImage: string,
  optionalImages?: string[]
): Promise<{ mainImage: string; optionalImages?: string[] }> {
  if (!category) return { mainImage, optionalImages };
  const lowerCat = category.trim().toLowerCase();
  const isTarget = ["shin guards", "complete kit", "boots", "football boots"].includes(lowerCat) || lowerCat.includes("boot");
  if (!isTarget) return { mainImage, optionalImages };

  let updatedMainImage = mainImage;
  if (mainImage && mainImage.startsWith("data:")) {
    try {
      const storageRef = ref(firebaseStorage, `products/${productId}/mainImage_${Date.now()}`);
      await uploadString(storageRef, mainImage, "data_url");
      updatedMainImage = await getDownloadURL(storageRef);
    } catch (err) {
      console.warn("Firebase Storage upload failed for mainImage, falling back to base64 data URL:", err);
    }
  }

  let updatedOptionalImages = optionalImages;
  if (optionalImages && optionalImages.length > 0) {
    try {
      updatedOptionalImages = await Promise.all(
        optionalImages.map(async (img, idx) => {
          if (img && img.startsWith("data:")) {
            try {
              const storageRef = ref(
                firebaseStorage,
                `products/${productId}/optionalImage_${idx}_${Date.now()}`
              );
              await uploadString(storageRef, img, "data_url");
              return await getDownloadURL(storageRef);
            } catch (err) {
              console.warn(`Firebase Storage upload failed for optionalImage ${idx}, falling back to base64 data URL:`, err);
              return img;
            }
          }
          return img;
        })
      );
    } catch (err) {
      console.warn("Firebase Storage upload failed for optionalImages, falling back to base64 data URL:", err);
    }
  }

  return { mainImage: updatedMainImage, optionalImages: updatedOptionalImages };
}

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

function getTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "string" || typeof val === "number") {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
}

function formatDate(val: any): string {
  if (!val) return new Date().toLocaleDateString();
  if (typeof val.toDate === "function") return val.toDate().toLocaleDateString();
  if (typeof val.seconds === "number") return new Date(val.seconds * 1000).toLocaleDateString();
  if (val instanceof Date) return val.toLocaleDateString();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString();
  }
  return new Date().toLocaleDateString();
}

// ---------- Products API -----------------------------------------------------
export const productsApi = {
  async list(): Promise<Product[]> {
    try {
      const querySnapshot = await getDocs(collection(firebaseDb, "products"));
      const products: Product[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
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
    } catch (error) {
      console.error("Error listing products from Firestore:", error);
      return [];
    }
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
    await firebaseAuthReady;
    const newDocRef = doc(collection(firebaseDb, "products"));
    const createdAt = new Date().toISOString().slice(0, 10);
    const { stock, price, ...rest } = input;
    const isBoot = rest.category?.toLowerCase().includes("boot");

    // Handle image upload to firebase storage if it's a target category
    const { mainImage, optionalImages } = await handleTargetCategoryImages(
      newDocRef.id,
      rest.category || "",
      rest.mainImage,
      rest.optionalImages
    );

    const productData: any = {
      ...rest,
      mainImage,
      optionalImages,
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

    const cleanProductData = removeUndefined(productData);

    await setDoc(newDocRef, cleanProductData);
    return {
      id: newDocRef.id,
      ...cleanProductData,
      stock: cleanProductData.stock,
    } as Product;
  },
  async update(id: string, input: Partial<Product>): Promise<Product> {
    await firebaseAuthReady;
    const docRef = doc(firebaseDb, "products", id);
    const { stock, price, ...rest } = input;
    const isBoot = rest.category?.toLowerCase().includes("boot");

    let categoryToUse = rest.category;
    if (!categoryToUse) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        categoryToUse = docSnap.data().category;
      }
    }

    let mainImage = rest.mainImage;
    let optionalImages = rest.optionalImages;
    if (categoryToUse) {
      const imgResult = await handleTargetCategoryImages(
        id,
        categoryToUse,
        rest.mainImage || "",
        rest.optionalImages
      );
      if (rest.mainImage !== undefined) {
        mainImage = imgResult.mainImage;
      }
      if (rest.optionalImages !== undefined) {
        optionalImages = imgResult.optionalImages;
      }
    }

    const updateData: any = { ...rest };
    if (mainImage !== undefined) {
      updateData.mainImage = mainImage;
    }
    if (optionalImages !== undefined) {
      updateData.optionalImages = optionalImages;
    }

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

    const cleanUpdateData = removeUndefined(updateData);

    await updateDoc(docRef, cleanUpdateData);
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
    await firebaseAuthReady;
    const docRef = doc(firebaseDb, "products", id);
    await deleteDoc(docRef);
  },
};

function parseOrderDoc(docSnap: any): Order & { _rawTime: number } {
  const data = docSnap.data() || {};
  const details = data.customerDetails || data.shippingAddress || (typeof data.address === "object" ? data.address : {});

  const customerName =
    details.fullName ||
    details.name ||
    data.fullName ||
    data.customerName ||
    data.userName ||
    data.name ||
    (typeof data.user === "object" ? (data.user.name || data.user.displayName) : undefined) ||
    "Unknown";

  const customerEmail =
    details.email ||
    data.email ||
    data.customerEmail ||
    data.userEmail ||
    (typeof data.user === "object" ? data.user.email : undefined) ||
    "";

  const customerPhone =
    details.phone ||
    details.phoneNumber ||
    data.phone ||
    data.customerPhone ||
    data.phoneNumber ||
    "";

  let customerAddress = "";
  if (typeof data.customerAddress === "string" && data.customerAddress) {
    customerAddress = data.customerAddress;
  } else if (typeof details === "string") {
    customerAddress = details;
  } else {
    const addressParts = [
      details.address || (typeof data.address === "string" ? data.address : undefined),
      details.city || data.city,
      details.state || data.state,
      details.pincode || details.zip || data.pincode || data.zip,
      details.country || data.country,
    ].filter(Boolean);
    customerAddress = addressParts.join(", ");
  }

  let rawProducts = data.products || data.items || data.cart || [];
  if (!Array.isArray(rawProducts) && typeof rawProducts === "object") {
    rawProducts = Object.values(rawProducts);
  }
  const products = (Array.isArray(rawProducts) ? rawProducts : []).map((p: any) => ({
    id: String(p.id || p.productId || ""),
    name: String(p.name || p.title || p.productName || "Product"),
    price: Number(p.price) || 0,
    image: String(p.image || p.mainImage || p.imageUrl || ""),
    size: p.size ? String(p.size) : "",
    quantity: Number(p.quantity || p.qty) || 1,
  }));

  const total = Number(data.totalAmount ?? data.order_total ?? data.total ?? data.subtotal ?? 0);

  const pmRaw = String(data.paymentMethod || data.payment_type || data.paymentMode || "").toLowerCase();
  const paymentMethod =
    pmRaw.includes("cod") ? (pmRaw.includes("partial") ? "Partial COD" : "Cash on Delivery") :
      pmRaw.includes("online") || pmRaw.includes("prepaid") || pmRaw.includes("razorpay") ? "Online Payment" :
        (data.paymentMethod || data.payment_type || "Online Payment");

  const status = (data.status || data.orderStatus || data.payment_status || "Pending") as OrderStatus;

  const dateVal = data.createdAt || data.date || data.timestamp || data.created_at || data.orderDate;
  const date = formatDate(dateVal);
  const rawTime = getTimestamp(dateVal);

  const subtotal = Number(data.subtotal ?? (total + (Number(data.discountAmount || data.discountValue || data.discount) || 0)));
  const discountAmount = Number(data.discountAmount ?? data.discountValue ?? data.discount ?? 0) || undefined;
  const discountName = data.discountName || data.couponCode || undefined;

  return {
    id: docSnap.id,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    products,
    total,
    paymentMethod,
    status,
    date,
    discountName,
    discountAmount,
    subtotal,
    _rawTime: rawTime,
    payment_type: data.payment_type || undefined,
    order_total: data.order_total !== undefined ? Number(data.order_total) : undefined,
    advance_paid: data.advance_paid !== undefined ? Number(data.advance_paid) : undefined,
    cod_amount: data.cod_amount !== undefined ? Number(data.cod_amount) : undefined,
    payment_status: data.payment_status || undefined,
    shiprocket_status: data.shiprocket_status || undefined,
    shiprocket_order_id: data.shiprocket_order_id || undefined,
    shipment_id: data.shipment_id || undefined,
    channel_order_id: data.channel_order_id || undefined,
    shiprocket_error: data.shiprocket_error || undefined,
    shipment_status: data.shipment_status || undefined,
    awb_code: data.awb_code || undefined,
    courier_name: data.courier_name || undefined,
    tracking_url: data.tracking_url || undefined,
    shiprocket_updated_at: data.shiprocket_updated_at || undefined,
  };
}

// ---------- Orders API -------------------------------------------------------
export const ordersApi = {
  async list(): Promise<Order[]> {
    try {
      await firebaseAuthReady;
      const q = query(collection(firebaseDb, "orders"));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(parseOrderDoc);
      orders.sort((a, b) => b._rawTime - a._rawTime);
      return orders;
    } catch (error) {
      console.error("Error listing orders from Firestore:", error);
      return [];
    }
  },
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await firebaseAuthReady;
    const docRef = doc(firebaseDb, "orders", id);
    await updateDoc(docRef, { status });
    // Fetch the updated document to return full Order object
    const docSnap = await getDoc(docRef);
    return parseOrderDoc(docSnap);
  },
};

// ---------- Customers API (read-only) ---------------------------------------
export const customersApi = {
  async list(): Promise<Customer[]> {
    try {
      await firebaseAuthReady;
      const q = query(collection(firebaseDb, "orders"));
      const snapshot = await getDocs(q);

      const parsedOrders = snapshot.docs.map(parseOrderDoc).sort((a, b) => a._rawTime - b._rawTime);

      const customersMap = new Map<string, Customer>();

      parsedOrders.forEach((ord) => {
        const key = ord.customerEmail || ord.customerPhone || ord.customerName || ord.id;
        if (!key || key === "Unknown") return;

        if (!customersMap.has(key)) {
          customersMap.set(key, {
            id: key,
            name: ord.customerName,
            email: ord.customerEmail,
            phone: ord.customerPhone,
            location: ord.customerAddress,
            orders: 0,
            spent: 0,
            joinedAt: ord.date,
          });
        }

        const customer = customersMap.get(key)!;
        customer.orders += 1;
        customer.spent += ord.total;
        customer.joinedAt = ord.date;
      });

      return Array.from(customersMap.values()).reverse();
    } catch (error) {
      console.error("Error listing customers from Firestore:", error);
      return [];
    }
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
