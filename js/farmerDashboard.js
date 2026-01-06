// js/farmerDashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { app, auth, db } from './firebaseConfig.js';

// --- Initialize when DOM is loaded ---
document.addEventListener('DOMContentLoaded', function() {
  initializeLogout();
  initializeJobPosting();
  
  // Wait for authentication before loading applications
  onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes('job-applications.html')) {
      console.log("User authenticated, loading applications...");
      loadJobApplications();
    }
  });

  // Load matches if on farmer-matching page
  if (window.location.pathname.includes('farmer-matching.html')) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        loadFarmerMatches();
      } else {
        window.location.href = "login.html";
      }
    });
  }
});

// --- Logout ---
function initializeLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout error:", error);
        alert("Logout failed: " + error.message);
      }
    });
  }
}

// --- Post Job ---
function initializeJobPosting() {
  const postJobForm = document.getElementById("post-job-form");
  if (postJobForm) {
    postJobForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in as a farmer.");
        return;
      }

      // Get form values
      const title = document.getElementById("job-title").value.trim();
      const wages = Number(document.getElementById("job-wages").value);
      const location = document.getElementById("job-location").value.trim();
      const startDate = document.getElementById("job-start").value || null;
      const duration = Number(document.getElementById("job-duration").value) || null;
      const skills = document.getElementById("job-skills").value.trim();
      const description = document.getElementById("job-desc").value.trim();

      // Validation
      if (!title || !wages || !location) {
        alert("Please fill Title, Wages and Location at minimum.");
        return;
      }

      try {
        // Get farmer name from user document
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const farmerName = userDoc.exists() ? userDoc.data().username : "Farmer";

        // Add job to Firestore
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

        // Show success message
        const msg = document.getElementById("post-job-msg");
        if (msg) {
          msg.innerText = "Job posted successfully!";
          msg.classList.remove("hidden");
          setTimeout(() => { 
            msg.classList.add("hidden"); 
          }, 3000);
        }

        // Success alert and redirect to dashboard
        alert("Job posted successfully! Redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = "farmer-dashboard.html";
        }, 1500);

      } catch (error) {
        console.error("Error posting job:", error);
        alert("Error posting job: " + error.message);
      }
    });
  }
}

// --- Load Job Applications for Farmer ---
async function loadJobApplications() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user logged in");
      window.location.href = "login.html";
      return;
    }

    console.log("Loading applications for farmer:", user.uid);

    const applicationsList = document.getElementById("applications-list");
    if (!applicationsList) {
      console.log("applications-list container not found");
      return;
    }

    applicationsList.innerHTML = "<div class='empty-state'><div class='empty-icon'>📋</div><h3 class='empty-title'>Loading Applications...</h3><p class='empty-description'>Fetching applications for your jobs.</p></div>";

    let querySnapshot;

    try {
      // Try the ordered query first (if index exists)
      const q = query(
        collection(db, "applications"),
        where("farmerId", "==", user.uid),
        orderBy("appliedAt", "desc")
      );
      querySnapshot = await getDocs(q);
      console.log("Ordered query successful");
    } catch (indexError) {
      console.log("Index not ready, falling back to unordered query:", indexError);
      
      // Fallback: query without ordering
      const q = query(
        collection(db, "applications"),
        where("farmerId", "==", user.uid)
      );
      querySnapshot = await getDocs(q);
      console.log("Unordered query successful");
    }
    
    if (querySnapshot.empty) {
      applicationsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3 class="empty-title">No Applications Yet</h3>
          <p class="empty-description">Applications from laborers will appear here once they start applying to your jobs.</p>
        </div>
      `;
      return;
    }

    applicationsList.innerHTML = "";

    // Convert to array for manual sorting if needed
    const applications = [];
    querySnapshot.forEach((docSnap) => {
      applications.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Manual sorting if we used unordered query
    if (!applications[0].appliedAt) {
      console.log("Manual sorting applications");
      applications.sort((a, b) => {
        const timeA = a.appliedAt?.seconds || 0;
        const timeB = b.appliedAt?.seconds || 0;
        return timeB - timeA; // Descending order
      });
    }

    applications.forEach(application => {
      const data = application;

      const applicationCard = `
        <div class="job-card ${data.status === 'accepted' ? 'accepted' : data.status === 'rejected' ? 'rejected' : ''}">
          <div class="job-header">
            <h3 class="job-title">${escapeHtml(data.jobTitle)}</h3>
            <span class="application-status ${data.status}">${data.status.toUpperCase()}</span>
          </div>
          <div class="job-details">
            <p><strong>Applicant:</strong> ${escapeHtml(data.laborName)}</p>
            <p><strong>Contact:</strong> ${escapeHtml(data.laborContact)}</p>
            <p><strong>Location:</strong> ${escapeHtml(data.jobLocation)}</p>
            <p><strong>Wages:</strong> ₹${data.jobWages}/day</p>
            <p><strong>Applied On:</strong> ${data.appliedAt?.toDate?.().toLocaleDateString() || 'Recently'}</p>
            ${data.note ? `<p><strong>Applicant Note:</strong> ${escapeHtml(data.note)}</p>` : ''}
          </div>
          ${data.status === 'pending' ? `
            <div class="application-actions">
              <button class="accept-btn" onclick="acceptApplication('${application.id}')">Accept</button>
              <button class="reject-btn" onclick="rejectApplication('${application.id}')">Reject</button>
            </div>
          ` : ''}
        </div>
      `;

      applicationsList.insertAdjacentHTML('beforeend', applicationCard);
    });

    console.log(`Displayed ${applications.length} applications`);

  } catch (error) {
    console.error("Error loading job applications:", error);
    const applicationsList = document.getElementById("applications-list");
    if (applicationsList) {
      if (error.message.includes("index")) {
        applicationsList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3 class="empty-title">Index Being Created</h3>
            <p class="empty-description">
              The search index is being created. 
              <br><br>
              <a href="https://console.firebase.google.com/v1/r/project/digital-farmer-assistant/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9kaWdpdGFsLWZhcm1lci1hc3Npc3RhbnQvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2FwcGxpY2F0aW9ucy9pbmRleGVzL18QARoMCghmYXJtZXJJZBABGg0KCWFwcGxpZWRBdBACGgwKCF9fbmFtZV9fEAI" 
                 target="_blank" 
                 style="color: #059669; text-decoration: underline; font-weight: bold;">
                Click here to check index status
              </a>
              <br><br>
              Refresh the page in 2-5 minutes.
            </p>
          </div>
        `;
      } else {
        applicationsList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <h3 class="empty-title">Error Loading Applications</h3>
            <p class="empty-description">Error: ${error.message}</p>
          </div>
        `;
      }
    }
  }
}

// --- Accept Application ---
window.acceptApplication = async function(applicationId) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Get the application data first
    const applicationDoc = await getDoc(doc(db, "applications", applicationId));
    if (!applicationDoc.exists()) {
      alert("Application not found.");
      return;
    }

    const applicationData = applicationDoc.data();

    // Update application status to accepted
    await updateDoc(doc(db, "applications", applicationId), {
      status: "accepted",
      acceptedAt: serverTimestamp()
    });

    // Create a match record
    const farmerUserDoc = await getDoc(doc(db, "users", applicationData.farmerId));
    const farmerName = farmerUserDoc.exists() ? farmerUserDoc.data().username : "Farmer";

    await addDoc(collection(db, "matches"), {
      applicationId: applicationId,
      jobId: applicationData.jobId,
      jobTitle: applicationData.jobTitle,
      jobLocation: applicationData.jobLocation,
      jobWages: applicationData.jobWages,
      farmerId: applicationData.farmerId,
      farmerName: farmerName,
      laborId: applicationData.laborId,
      laborName: applicationData.laborName,
      laborContact: applicationData.laborContact,
      matchedAt: serverTimestamp(),
      status: "active"
    });

    // Optionally close the job
    // await updateDoc(doc(db, "jobs", applicationData.jobId), {
    //   status: "closed"
    // });

    alert("Application accepted! A match has been created.");
    loadJobApplications(); // Reload to show updated status
    
  } catch (error) {
    console.error("Error accepting application:", error);
    alert("Error accepting application: " + error.message);
  }
};

// --- Reject Application ---
window.rejectApplication = async function(applicationId) {
  try {
    await updateDoc(doc(db, "applications", applicationId), {
      status: "rejected"
    });
    
    alert("Application rejected.");
    loadJobApplications(); // Reload to show updated status
    
  } catch (error) {
    console.error("Error rejecting application:", error);
    alert("Error rejecting application: " + error.message);
  }
};

// --- Load Posted Jobs (For farmer-dashboard.html if needed) ---
async function loadMyJobs() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const q = query(
      collection(db, "jobs"), 
      where("farmerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const jobsContainer = document.getElementById("posted-jobs");

    if (!jobsContainer) {
      console.log("posted-jobs container not found - this is normal on post-job.html");
      return;
    }

    jobsContainer.innerHTML = "";

    if (querySnapshot.empty) {
      jobsContainer.innerHTML = `<p class="text-gray-500">No jobs posted yet.</p>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const jobId = docSnap.id;

      // Format timestamp
      const formatTimestamp = (ts) => {
        try {
          if (!ts) return "Just now";
          if (ts.toDate) return ts.toDate().toLocaleString();
          if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
          return String(ts);
        } catch {
          return "Unknown time";
        }
      };

      const jobCard = `
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h5 class="text-lg font-semibold text-gray-800">${escapeHtml(data.title)}</h5>
            <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">₹${data.wages}/day</span>
          </div>
          <div class="text-sm text-gray-600 mb-2">
            <p><strong>Location:</strong> ${escapeHtml(data.location)}</p>
            <p><strong>Start Date:</strong> ${data.startDate ? new Date(data.startDate).toLocaleDateString() : "ASAP"}</p>
            ${data.duration ? `<p><strong>Duration:</strong> ${data.duration} days</p>` : ''}
            ${data.skills ? `<p><strong>Skills Required:</strong> ${escapeHtml(data.skills)}</p>` : ''}
          </div>
          <p class="text-gray-700 mb-2">${escapeHtml(data.description || "No description provided.")}</p>
          <div class="flex justify-between items-center text-xs text-gray-500">
            <span>Status: <span class="font-medium ${data.status === 'open' ? 'text-green-600' : 'text-blue-600'}">${data.status}</span></span>
            <span>Posted: ${formatTimestamp(data.createdAt)}</span>
          </div>
        </div>
      `;

      jobsContainer.insertAdjacentHTML('beforeend', jobCard);
    });

  } catch (error) {
    console.error("Error loading jobs:", error);
    const jobsContainer = document.getElementById("posted-jobs");
    if (jobsContainer) {
      jobsContainer.innerHTML = `<p class="text-red-500">Error loading jobs: ${error.message}</p>`;
    }
  }
}

// --- Load Farmer Matches ---
async function loadFarmerMatches() {
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const matchingList = document.getElementById("matching-list");
    if (!matchingList) return;

    matchingList.innerHTML = "<div class='empty-state'><div class='empty-icon'>🤝</div><h3 class='empty-title'>Loading Matches...</h3><p class='empty-description'>Fetching your workforce connections.</p></div>";

    const q = query(
      collection(db, "matches"),
      where("farmerId", "==", user.uid),
      orderBy("matchedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      matchingList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤝</div>
          <h3 class="empty-title">No Connections Yet</h3>
          <p class="empty-description">Your confirmed labor connections will appear here once you start accepting applications.</p>
        </div>
      `;
      return;
    }

    matchingList.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const matchId = docSnap.id;

      const matchCard = `
        <div class="job-card accepted">
          <div class="job-header">
            <h3 class="job-title">${escapeHtml(data.jobTitle)}</h3>
            <span class="application-status accepted">CONNECTED</span>
          </div>
          <div class="job-details">
            <p><strong>Laborer:</strong> ${escapeHtml(data.laborName)}</p>
            <p><strong>Contact:</strong> ${escapeHtml(data.laborContact)}</p>
            <p><strong>Location:</strong> ${escapeHtml(data.jobLocation)}</p>
            <p><strong>Wages:</strong> ₹${data.jobWages}/day</p>
            <p><strong>Connected On:</strong> ${data.matchedAt?.toDate?.().toLocaleDateString() || 'Recently'}</p>
            <p><strong>Status:</strong> <span class="application-status active">ACTIVE</span></p>
          </div>
          <div class="application-actions">
            <button class="accept-btn" onclick="contactLabor('${data.laborContact}', '${data.laborName}')">Contact Laborer</button>
          </div>
        </div>
      `;

      matchingList.insertAdjacentHTML('beforeend', matchCard);
    });

  } catch (error) {
    console.error("Error loading matches:", error);
    const matchingList = document.getElementById("matching-list");
    if (matchingList) {
      matchingList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <h3 class="empty-title">Error Loading Matches</h3>
          <p class="empty-description">Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

// --- Contact Laborer ---
window.contactLabor = function(contactNumber, laborName) {
  alert(`Contact ${laborName} at: ${contactNumber}\n\nYou can call or message them to coordinate the work details.`);
};

// --- Escape HTML to prevent XSS ---
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Global logout function for compatibility ---
window.logout = async function() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Logout failed: " + error.message);
  }
};

// --- Check authentication state and update UI ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Get user data to display name
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const farmerNameElement = document.getElementById("farmer-name");
        if (farmerNameElement && userData.username) {
          farmerNameElement.textContent = userData.username;
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    // If not logged in, redirect to login page
    window.location.href = "login.html";
  }
});