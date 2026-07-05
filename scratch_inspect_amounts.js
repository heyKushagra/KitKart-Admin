import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
  const docRef = doc(db, "orders", "LKiPlHPnk6t0ARDigcqs");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log("Subtotal:", data.subtotal);
    console.log("Discount Amount:", data.discountAmount);
    console.log("Discount Value:", data.discountValue);
    console.log("Discount Name:", data.discountName);
    console.log("Total Amount:", data.totalAmount);
  }
}
inspect().then(() => process.exit(0)).catch(console.error);
