import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzt6_1j4xoiWP2tse8NrrLnwYprq9VOM0",
  authDomain: "kitkart-376e8.firebaseapp.com",
  projectId: "kitkart-376e8",
  storageBucket: "kitkart-376e8.firebasestorage.app",
  messagingSenderId: "714607733942",
  appId: "1:714607733942:web:d8cc758c8ae91fb6984a17",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snapshot = await getDocs(collection(db, "products"));
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const cleanData = { ...data };
    delete cleanData.mainImage;
    delete cleanData.optionalImages;
    delete cleanData.image;
    console.log(`Product ID: ${docSnap.id}`, JSON.stringify(cleanData, null, 2));
  });
}

main().catch(console.error);
