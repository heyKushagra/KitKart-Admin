import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzt6_1j4xoiWP2tse8NrrLnwYprq9VOM0",
  authDomain: "kitkart-376e8.firebaseapp.com",
  projectId: "kitkart-376e8",
  storageBucket: "kitkart-376e8.appspot.com",
  messagingSenderId: "542267156230",
  appId: "1:542267156230:web:12bf8ec0309995c739dcae",
  measurementId: "G-8LLPXV5D57"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  const q = query(collection(db, "orders"), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`=== Order ${doc.id} ===`);
    console.log("Order Keys:", Object.keys(data));
    if (data.products && data.products.length > 0) {
      console.log("Product 0 Keys:", Object.keys(data.products[0]));
    }
    if (data.discount) {
        console.log("Order Discount details:", data.discount);
    }
    if (data.discountDetails) {
        console.log("Order discountDetails:", data.discountDetails);
    }
    if (data.discountValue) {
        console.log("Order discountValue:", data.discountValue);
    }
    if (data.discountName) {
        console.log("Order discountName:", data.discountName);
    }
  });
}
inspect().then(() => process.exit(0)).catch(console.error);
