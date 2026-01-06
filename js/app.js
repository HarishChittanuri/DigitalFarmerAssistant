// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  getFirestore,
  setDoc,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { app, auth, db } from './firebaseConfig.js';

// ---------- SIGNUP ----------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const userType = document.getElementById("signupType").value;

    console.log("Signup attempt:", { username, userType });

    if (!username || !password || !userType) return alert("Fill all fields.");

    const email = `${username}@dfa.com`;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Base user data
      const userData = { 
        username, 
        userType,
        email 
      };
      
      // Add labor profile data if user is a laborer
      if (userType === "labor") {
        const skills = document.getElementById("signupSkills").value.trim();
        const preferredLocations = document.getElementById("signupLocations").value.trim();
        const experience = document.getElementById("signupExperience").value;
        
        userData.skills = skills;
        userData.preferredLocations = preferredLocations;
        userData.experience = experience;
        
        console.log("Labor profile data:", { skills, preferredLocations, experience });
      }
      
      await setDoc(doc(db, "users", user.uid), userData);
      
      console.log("User created in Firestore:", userData);
      alert("Signup successful! Redirecting to login...");
      window.location.href = "login.html";
    } catch (err) {
      alert("Signup error: " + err.message);
      console.error(err);
    }
  });
}

// ---------- LOGIN ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted");

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) return alert("Fill both fields.");

    const email = `${username}@dfa.com`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User signed in:", user.uid);
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      console.log("User document exists:", userDoc.exists());
      
      if (!userDoc.exists()) {
        console.log("User document does not exist in Firestore");
        return alert("User type not found. Contact admin.");
      }
      
      const userData = userDoc.data();
      console.log("User data from Firestore:", userData);
      
      const userType = userData.userType;
      console.log("User type found:", userType);
      
      if (userType === "farmer") {
        window.location.href = "farmer-dashboard.html";
      } else if (userType === "labor") {
        window.location.href = "labor-dashboard.html";
      } else {
        console.error("Unknown user type:", userType);
        alert("Unknown user type: " + userType);
      }
    } catch (err) {
      alert("Login failed: " + err.message);
      console.error(err);
    }
  });
}

// ---------- LOGOUT ----------
// Fix logout button event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Add event listener for logout button in farmer dashboard
  const farmerLogoutBtn = document.getElementById('logoutBtn');
  if (farmerLogoutBtn) {
    farmerLogoutBtn.addEventListener('click', async function() {
      try {
        await signOut(auth);
        console.log("User logged out successfully");
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout error:", err);
        alert("Logout failed: " + err.message);
      }
    });
  }
});

// Global logout function for backward compatibility
window.logout = async function () {
  try {
    await signOut(auth);
    console.log("User logged out successfully");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed: " + err.message);
  }
};

// ---------- JOB POSTING & LISTENERS ----------

let farmerJobsUnsub = null;
let availableJobsUnsub = null;

const postJobForm = document.getElementById("post-job-form");
if (postJobForm) {
  postJobForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to post a job.");

    const title = document.getElementById("job-title").value.trim();
    const wages = Number(document.getElementById("job-wages").value);
    const location = document.getElementById("job-location").value.trim();
    const startDate = document.getElementById("job-start").value || null;
    const duration = Number(document.getElementById("job-duration").value) || null;
    const skills = document.getElementById("job-skills").value.trim();
    const description = document.getElementById("job-desc").value.trim();

    if (!title || !wages || !location) return alert("Please fill Title, Wages and Location at minimum.");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const farmerName = userDoc.exists() ? userDoc.data().username : "Farmer";

      await addDoc(collection(db, "jobs"), {
        title,
        wages,
        location,
        startDate: startDate || null,
        duration: duration || null,
        skills,
        description,
        farmerId: user.uid,
        farmerName,
        status: "open",
        createdAt: serverTimestamp()
      });

      const msg = document.getElementById("post-job-msg");
      if (msg) {
        msg.innerText = "Job posted successfully.";
        msg.classList.remove("hidden");
        setTimeout(() => { msg.classList.add("hidden"); }, 3000);
      }
      postJobForm.reset();
    } catch (err) {
      alert("Failed to post job: " + err.message);
      console.error(err);
    }
  });
}

// Helper to safe format timestamp
function fmtTs(ts) {
  try {
    if (!ts) return "Just now";
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return String(ts);
  } catch {
    return "Unknown time";
  }
}

// Listen to farmer's own posted jobs
function listenFarmerJobs(uid) {
  if (farmerJobsUnsub) farmerJobsUnsub();
  const q = query(collection(db, "jobs"), where("farmerId", "==", uid), orderBy("createdAt", "desc"));
  farmerJobsUnsub = onSnapshot(q, (snap) => {
    const container = document.getElementById("posted-jobs");
    if (!container) return;
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = `<p class="text-muted">No jobs posted yet.</p>`;
      return;
    }
    snap.forEach(docSnap => {
      const d = docSnap.data();
      container.insertAdjacentHTML("beforeend", `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <h5 class="card-title">${escapeHtml(d.title)}</h5>
              <span class="text-muted">₹${d.wages}/day</span>
            </div>
            <p class="card-text text-muted">Location: ${escapeHtml(d.location)} • Start: ${escapeHtml(d.startDate || "ASAP")}</p>
            <p class="card-text">${escapeHtml(d.description || "")}</p>
            <p class="card-text"><small class="text-muted">Skills: ${escapeHtml(d.skills || "—")}</small></p>
            <p class="card-text"><small class="text-muted">Posted: ${fmtTs(d.createdAt)}</small></p>
          </div>
        </div>
      `);
    });
  }, err => {
    console.error("farmer jobs listener error:", err);
  });
}

// Listen all open jobs for labor
function listenAvailableJobs() {
  if (availableJobsUnsub) availableJobsUnsub();
  const q = query(collection(db, "jobs"), where("status", "==", "open"), orderBy("createdAt", "desc"));
  availableJobsUnsub = onSnapshot(q, (snap) => {
    const container = document.getElementById("jobsList");
    if (!container) return;
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = `<div class="col-12"><p class="text-muted">No jobs available at the moment.</p></div>`;
      return;
    }
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const jobId = docSnap.id;
      container.insertAdjacentHTML("beforeend", `
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <h5 class="card-title">${escapeHtml(d.title)}</h5>
                <span class="text-muted">₹${d.wages}/day</span>
              </div>
              <p class="card-text text-muted">Farmer: ${escapeHtml(d.farmerName)} • Location: ${escapeHtml(d.location)}</p>
              <p class="card-text">${escapeHtml(d.description || "")}</p>
              <p class="card-text"><small class="text-muted">Skills: ${escapeHtml(d.skills || "—")}</small></p>
              <p class="card-text"><small class="text-muted">Posted: ${fmtTs(d.createdAt)}</small></p>
            </div>
          </div>
        </div>
      `);
    });
  }, err => {
    console.error("available jobs listener error:", err);
  });
}

// small helper to avoid XSS when injecting text (basic)
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Keep user session & start listeners on dashboards
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop();

  if (user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const { username, userType } = userDoc.exists() ? userDoc.data() : { username: null, userType: null };

    // show username on dashboards
    if (document.getElementById("farmer-name") && username) document.getElementById("farmer-name").innerText = username;
    if (document.getElementById("labor-name") && username) document.getElementById("labor-name").innerText = username;

    // If on dashboard pages start listeners
    if (currentPage === "farmer-dashboard.html" && userType === "farmer") {
      listenFarmerJobs(user.uid);
    } else {
      if (farmerJobsUnsub) { farmerJobsUnsub(); farmerJobsUnsub = null; }
    }

    if (currentPage === "labor-dashboard.html" && userType === "labor") {
      listenAvailableJobs();
    } else {
      if (availableJobsUnsub) { availableJobsUnsub(); availableJobsUnsub = null; }
    }

    // If user visits login/signup while logged in, redirect to their dashboard
    if (["login.html", "signup.html", "index.html"].includes(currentPage) && userType) {
      console.log("User already logged in, redirecting to dashboard...");
      if (userType === "farmer") window.location.href = "farmer-dashboard.html";
      else if (userType === "labor") window.location.href = "labor-dashboard.html";
    }
  } else {
    // user logged out - remove listeners
    if (farmerJobsUnsub) { farmerJobsUnsub(); farmerJobsUnsub = null; }
    if (availableJobsUnsub) { availableJobsUnsub(); availableJobsUnsub = null; }
  }
});