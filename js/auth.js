// import { auth, db } from "./firebaseConfig.js";
// import { 
//   createUserWithEmailAndPassword, 
//   signInWithEmailAndPassword 
// } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
// import { setDoc, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// // ==== SIGNUP ====
// const signupForm = document.getElementById("signup-form");
// if (signupForm) {
//   signupForm.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const username = document.getElementById("signup-username").value.trim();
//     const email = document.getElementById("signup-email").value.trim();
//     const password = document.getElementById("signup-password").value.trim();
//     const role = document.getElementById("signup-role").value;

//     try {
//       const userCred = await createUserWithEmailAndPassword(auth, email, password);
//       await setDoc(doc(db, "users", userCred.user.uid), { username, email, role });

//       alert("✅ Signup successful!");
//       window.location.href = role === "farmer" ? "farmer-dashboard.html" : "labor-dashboard.html";
//     } catch (err) {
//       alert("Signup failed: " + err.message);
//     }
//   });
// }

// // ==== LOGIN ====
// const loginForm = document.getElementById("login-form");
// if (loginForm) {
//   loginForm.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const username = document.getElementById("login-username").value.trim();
//     const password = document.getElementById("login-password").value.trim();

//     try {
//       // First, query Firestore to get the user document with this username
//       const usersRef = collection(db, "users");
//       const q = query(usersRef, where("username", "==", username));
//       const querySnapshot = await getDocs(q);
      
//       if (querySnapshot.empty) {
//         throw new Error("User not found");
//       }
      
//       const userDoc = querySnapshot.docs[0];
//       const userData = userDoc.data();
      
//       // Now sign in with the associated email
//       const userCred = await signInWithEmailAndPassword(auth, userData.email, password);
      
//       // Redirect based on role
//       if (userData.role === "farmer") {
//         window.location.href = "farmer-dashboard.html";
//       } else if (userData.role === "labor") {
//         window.location.href = "labor-dashboard.html";
//       } else {
//         throw new Error("Invalid user role");
//       }
//     } catch (err) {
//       alert("Login failed: " + err.message);
//     }
//   });
// }
