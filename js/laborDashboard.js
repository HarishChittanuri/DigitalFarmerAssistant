import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  onSnapshot  // Add this for real-time updates
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

import { app, auth, db } from './firebaseConfig.js';

// --- Initialize when DOM is loaded ---
document.addEventListener('DOMContentLoaded', function() {
  initializeLogout();
  
  // Only load jobs if we're on the available-jobs.html page
  if (window.location.pathname.includes('available-jobs.html') || 
      document.getElementById('jobsList')) {
    loadJobs(); // This now uses real-time updates
  }

  // Enhanced Application Form Submission
  const applyForm = document.getElementById('applyForm');
  if (applyForm) {
    applyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const jobId = document.getElementById('applyJobId').value;
      const laborName = document.getElementById('laborName').value;
      const contact = document.getElementById('contact').value;
      const email = document.getElementById('email').value;
      const age = document.getElementById('age').value;
      const experience = document.getElementById('experience').value;
      const availableFrom = document.getElementById('availableFrom').value;
      const interestReason = document.getElementById('interestReason').value;
      const previousExperience = document.getElementById('previousExperience').value;
      const note = document.getElementById('note').value;

      // Get selected skills
      const selectedSkills = [];
      const skillCheckboxes = document.querySelectorAll('.skills-checkbox input[type="checkbox"]:checked');
      skillCheckboxes.forEach(checkbox => {
        selectedSkills.push(checkbox.value);
      });

      // Validation
      if (!laborName || !contact || !experience || !availableFrom) {
        alert("Please fill in all required fields (marked with *).");
        return;
      }

      if (contact.length !== 10 || !/^\d+$/.test(contact)) {
        alert("Please enter a valid 10-digit contact number.");
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          alert("You must be logged in to apply.");
          return;
        }

        // Get job data for farmerId
        const jobDoc = await getDoc(doc(db, "jobs", jobId));
        if (!jobDoc.exists()) {
          alert("Job not found.");
          return;
        }
        const jobData = jobDoc.data();

        // Create enhanced application
        await addDoc(collection(db, "applications"), {
          jobId: jobId,
          laborId: user.uid,
          laborName: laborName,
          laborContact: contact,
          laborEmail: email || '',
          laborAge: age ? parseInt(age) : null,
          experience: experience,
          skills: selectedSkills,
          availableFrom: availableFrom,
          interestReason: interestReason,
          previousExperience: previousExperience,
          note: note,
          status: "pending",
          appliedAt: serverTimestamp(),
          farmerId: jobData.farmerId,
          jobTitle: jobData.title,
          jobLocation: jobData.location,
          jobWages: jobData.wages,
          applicationType: "enhanced" // Mark as enhanced application
        });

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('applyModal'));
        modal.hide();

        // Show success toast
        const successToast = new bootstrap.Toast(document.getElementById('successToast'));
        successToast.show();

        // Reload applications if on my-applications page
        if (window.location.pathname.includes('my-applications.html')) {
          loadMyApplications();
        }

      } catch (error) {
        console.error("Error submitting application:", error);
        alert("Error submitting application: " + error.message);
      }
    });
  }

// Load matches if on labor-matching page
if (window.location.pathname.includes('labor-matching.html')) {
  console.log("Initializing labor matches page...");
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User authenticated, loading matches...");
      loadLaborMatches();
    } else {
      console.log("No user, redirecting to login");
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

// --- Load Available Jobs with Real-time Updates ---
async function loadJobs() {
  try {
    const jobsContainer = document.getElementById("jobsList");
    if (!jobsContainer) {
      console.error("jobsList container not found");
      return;
    }

    jobsContainer.innerHTML = "<div class='empty-state'><div class='empty-icon'>🔍</div><h3 class='empty-title'>Loading Available Jobs...</h3><p class='empty-description'>Searching for agricultural work opportunities in your area.</p></div>";

    // Create query for open jobs, ordered by creation date
    const q = query(
      collection(db, "jobs"), 
      where("status", "==", "open"), 
      orderBy("createdAt", "desc")
    );

    // Use real-time listener instead of getDocs
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        // This runs whenever the jobs collection changes
        console.log("Jobs updated! Current jobs:", querySnapshot.size);
        
        if (querySnapshot.empty) {
          jobsContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">🔍</div>
              <h3 class="empty-title">No Jobs Available</h3>
              <p class="empty-description">No agricultural work opportunities available at the moment. Please check back later.</p>
            </div>
          `;
          return;
        }

        jobsContainer.innerHTML = "";

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const jobId = docSnap.id;

          // Format the date properly
          const formatDate = (dateString) => {
            if (!dateString) return "ASAP";
            try {
              return new Date(dateString).toLocaleDateString();
            } catch (e) {
              return dateString;
            }
          };

          // Format timestamp
          const formatTimestamp = (ts) => {
            try {
              if (!ts) return "Recently";
              if (ts.toDate) return ts.toDate().toLocaleDateString();
              if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
              return "Recently";
            } catch {
              return "Recently";
            }
          };

          const jobCard = `
            <div class="job-card">
              <div class="job-header">
                <h3 class="job-title">${escapeHtml(data.title)}</h3>
                <span class="job-wages">₹${data.wages}/day</span>
              </div>
              <div class="job-details">
                <p><strong>Farmer:</strong> ${escapeHtml(data.farmerName || "Farmer")}</p>
                <p><strong>Location:</strong> ${escapeHtml(data.location)}</p>
                <p><strong>Start Date:</strong> ${formatDate(data.startDate)}</p>
                <p><strong>Duration:</strong> ${data.duration ? data.duration + ' days' : 'Not specified'}</p>
              </div>
              <p class="job-description">${escapeHtml(data.description || "No description provided.")}</p>
              ${data.skills ? `<p class="job-skills"><strong>Skills Required:</strong> ${escapeHtml(data.skills)}</p>` : ''}
              <div class="job-footer">
                <span>Posted: ${formatTimestamp(data.createdAt)}</span>
                <button class="apply-btn" onclick="applyForJob('${jobId}')">Apply for Job</button>
              </div>
            </div>
          `;

          jobsContainer.insertAdjacentHTML('beforeend', jobCard);
        });

        console.log("Jobs loaded successfully! Real-time updates enabled.");

        // Call match score calculation after jobs are loaded
        calculateAndDisplayMatchScores();

        // Add this function to laborDashboard.js to integrate with filters
        function setupFilterIntegration(jobsData) {
            if (!window.jobFilters) {
                console.log("❌ Job filters not available");
                return;
            }

            // Convert jobs data to filter-friendly format
            const filterJobs = jobsData.map(job => ({
                id: job.id,
                title: job.title,
                wages: job.wages,
                location: job.location,
                skills: job.skills,
                description: job.description,
                farmerName: job.farmerName,
                startDate: job.startDate,
                duration: job.duration,
                createdAt: job.createdAt
            }));

            // Pass jobs to filter system
            window.jobFilters.setJobs(filterJobs);
            console.log("✅ Jobs passed to filter system:", filterJobs.length);
        }

        // Also update the calculateAndDisplayMatchScores to store match scores
        async function calculateAndDisplayMatchScores() {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const matchScores = new Map();
                const jobCards = document.querySelectorAll('.job-card');
                
                for (const card of jobCards) {
                    const applyBtn = card.querySelector('.apply-btn');
                    if (applyBtn && applyBtn.getAttribute('onclick')) {
                        const jobIdMatch = applyBtn.getAttribute('onclick').match(/'([^']+)'/);
                        if (jobIdMatch && jobIdMatch[1]) {
                            const jobId = jobIdMatch[1];
                            const matchScore = await window.smartMatching.calculateMatchScore(jobId, user.uid);
                            matchScores.set(jobId, matchScore);
                            
                            // Add match badge to job card
                            const jobFooter = card.querySelector('.job-footer');
                            if (jobFooter && !jobFooter.querySelector('.match-badge')) {
                                const matchBadge = window.smartMatching.generateMatchBadge(matchScore);
                                jobFooter.insertAdjacentHTML('afterbegin', matchBadge);
                            }
                        }
                    }
                }

                // Store match scores in filter system
                if (window.jobFilters) {
                    window.jobFilters.setMatchScores(matchScores);
                }
            } catch (error) {
                console.error("Error calculating match scores:", error);
            }
        }

      },
      (error) => {
        // Error handling for real-time listener
        console.error("Error in jobs listener:", error);
        const jobsContainer = document.getElementById("jobsList");
        if (jobsContainer) {
          if (error.message.includes("index")) {
            jobsContainer.innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3 class="empty-title">Index Being Created</h3>
                <p class="empty-description">The search index is being created. Please wait 2-5 minutes and refresh the page.</p>
              </div>
            `;
          } else {
            jobsContainer.innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3 class="empty-title">Error Loading Jobs</h3>
                <p class="empty-description">Error: ${error.message}</p>
              </div>
            `;
          }
        }
      }
    );

    // Store unsubscribe function to clean up when needed
    window.jobsUnsubscribe = unsubscribe;

  } catch (error) {
    console.error("Error setting up jobs listener:", error);
    const jobsContainer = document.getElementById("jobsList");
    if (jobsContainer) {
      jobsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <h3 class="empty-title">Error Loading Jobs</h3>
          <p class="empty-description">Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

// --- Enhanced Apply for Job Function ---
window.applyForJob = async function(jobId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to apply for jobs.");
      return;
    }

    // Get labor data
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      alert("User data not found.");
      return;
    }

    const userData = userDoc.data();
    const laborName = userData.username;

    // Get job data
    const jobDoc = await getDoc(doc(db, "jobs", jobId));
    if (!jobDoc.exists()) {
      alert("Job not found.");
      return;
    }

    const jobData = jobDoc.data();

    // Show application form (using Bootstrap modal)
    const modal = new bootstrap.Modal(document.getElementById('applyModal'));
    const applyForm = document.getElementById('applyForm');
    
    // Reset form
    applyForm.reset();
    
    // Pre-fill basic information
    document.getElementById('laborName').value = laborName;
    document.getElementById('applyJobId').value = jobId;
    
    // Populate job details in modal header
    document.getElementById('modalJobTitle').textContent = jobData.title;
    document.getElementById('modalFarmerName').textContent = jobData.farmerName || "Farmer";
    document.getElementById('modalJobLocation').textContent = jobData.location;
    document.getElementById('modalJobWages').textContent = `₹${jobData.wages}/day`;
    document.getElementById('modalJobDuration').textContent = jobData.duration ? `${jobData.duration} days` : 'Flexible';
    
    // Format start date
    if (jobData.startDate) {
      let startDate;
      if (jobData.startDate.toDate) {
        startDate = jobData.startDate.toDate();
      } else if (jobData.startDate.seconds) {
        startDate = new Date(jobData.startDate.seconds * 1000);
      } else {
        startDate = new Date(jobData.startDate);
      }
      document.getElementById('modalJobStart').textContent = startDate.toLocaleDateString();
    } else {
      document.getElementById('modalJobStart').textContent = 'ASAP';
    }
    
    // Set minimum available from date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('availableFrom').min = today;
    
    modal.show();

  } catch (error) {
    console.error("Error applying for job:", error);
    alert("Error applying for job: " + error.message);
  }
};

// --- Load My Applications ---
async function loadMyApplications() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const applicationsList = document.getElementById("applications-list");
    if (!applicationsList) return;

    applicationsList.innerHTML = "<div class='empty-state'><div class='empty-icon'>📋</div><h3 class='empty-title'>Loading Applications...</h3><p class='empty-description'>Fetching your job applications.</p></div>";

    // Now using the proper ordered query since index is enabled
    const q = query(
      collection(db, "applications"),
      where("laborId", "==", user.uid),
      orderBy("appliedAt", "desc") // This should work now!
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      applicationsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3 class="empty-title">No Applications Yet</h3>
          <p class="empty-description">You haven't applied to any jobs yet. Browse available jobs to get started!</p>
        </div>
      `;
      return;
    }

    applicationsList.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const applicationId = docSnap.id;

      // Enhanced application card with more details
      let applicationDetails = '';
      if (data.applicationType === "enhanced") {
        applicationDetails = `
          ${data.experience ? `<p><strong>Experience:</strong> ${escapeHtml(data.experience)}</p>` : ''}
          ${data.skills && data.skills.length > 0 ? `<p><strong>Skills:</strong> ${escapeHtml(data.skills.join(', '))}</p>` : ''}
          ${data.availableFrom ? `<p><strong>Available From:</strong> ${new Date(data.availableFrom).toLocaleDateString()}</p>` : ''}
          ${data.interestReason ? `<p><strong>Interest Reason:</strong> ${escapeHtml(data.interestReason)}</p>` : ''}
        `;
      }

      const applicationCard = `
        <div class="job-card ${data.status === 'accepted' ? 'accepted' : data.status === 'rejected' ? 'rejected' : ''}">
          <div class="job-header">
            <h3 class="job-title">${escapeHtml(data.jobTitle)}</h3>
            <span class="application-status ${data.status}">${data.status.toUpperCase()}</span>
          </div>
          <div class="job-details">
            <p><strong>Location:</strong> ${escapeHtml(data.jobLocation)}</p>
            <p><strong>Wages:</strong> ₹${data.jobWages}/day</p>
            <p><strong>Applied On:</strong> ${data.appliedAt?.toDate?.().toLocaleDateString() || 'Recently'}</p>
            ${applicationDetails}
            ${data.note ? `<p><strong>Additional Notes:</strong> ${escapeHtml(data.note)}</p>` : ''}
          </div>
        </div>
      `;

      applicationsList.insertAdjacentHTML('beforeend', applicationCard);
    });

  } catch (error) {
    console.error("Error loading applications:", error);
    const applicationsList = document.getElementById("applications-list");
    if (applicationsList) {
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

// --- Load Labor Matches ---
async function loadLaborMatches() {
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    console.log("Loading labor matches for user:", user.uid);

    const matchingList = document.getElementById("matching-list");
    if (!matchingList) return;

    matchingList.innerHTML = "<div class='empty-state'><div class='empty-icon'>🤝</div><h3 class='empty-title'>Loading Matches...</h3><p class='empty-description'>Fetching your work connections.</p></div>";

    // Method 1: Try the exact query that should work with existing index
    try {
      console.log("Method 1: Trying exact index query...");
      const q = query(
        collection(db, "matches"),
        where("laborId", "==", user.uid),
        orderBy("matchedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      console.log("✅ Method 1 successful! Found", querySnapshot.size, "matches");
      
      if (querySnapshot.empty) {
        showNoMatches(matchingList, user.uid);
        return;
      }
      
      displayMatches(querySnapshot, matchingList);
      return; // Success, exit function
      
    } catch (error1) {
      console.log("❌ Method 1 failed:", error1.message);
    }

    // Method 2: Try without ordering
    try {
      console.log("Method 2: Trying without ordering...");
      const q = query(
        collection(db, "matches"),
        where("laborId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log("✅ Method 2 successful! Found", querySnapshot.size, "matches");
      
      if (querySnapshot.empty) {
        showNoMatches(matchingList, user.uid);
        return;
      }
      
      displayMatches(querySnapshot, matchingList);
      return; // Success, exit function
      
    } catch (error2) {
      console.log("❌ Method 2 failed:", error2.message);
    }

    // Method 3: Manual filtering
    try {
      console.log("Method 3: Manual filtering all matches...");
      const allMatches = await getDocs(collection(db, "matches"));
      const laborMatches = [];
      
      allMatches.forEach((doc) => {
        const data = doc.data();
        if (data.laborId === user.uid) {
          laborMatches.push({ id: doc.id, ...data });
        }
      });
      
      console.log("✅ Method 3 successful! Found", laborMatches.length, "matches");
      
      if (laborMatches.length === 0) {
        showNoMatches(matchingList, user.uid);
        return;
      }
      
      // Sort manually by matchedAt
      laborMatches.sort((a, b) => {
        const timeA = a.matchedAt?.seconds || a.matchedAt?.toDate?.().getTime() || 0;
        const timeB = b.matchedAt?.seconds || b.matchedAt?.toDate?.().getTime() || 0;
        return timeB - timeA;
      });
      
      displayManualMatches(laborMatches, matchingList);
      
    } catch (error3) {
      console.log("❌ Method 3 failed:", error3.message);
      showError(matchingList, error3);
    }

  } catch (error) {
    console.error("Final error:", error);
    const matchingList = document.getElementById("matching-list");
    if (matchingList) {
      showError(matchingList, error);
    }
  }
}


// Add this function to laborDashboard.js
async function calculateAndDisplayMatchScores() {
    const user = auth.currentUser;
    if (!user) {
        console.log("❌ No user logged in");
        return;
    }

    console.log("🔍 Calculating match scores for user:", user.uid);

    try {
        // Wait for smart matching to initialize
        if (!window.smartMatching) {
            console.log("❌ Smart matching not loaded");
            return;
        }

        const jobCards = document.querySelectorAll('.job-card');
        console.log("📋 Found job cards:", jobCards.length);

        for (const card of jobCards) {
            const applyBtn = card.querySelector('.apply-btn');
            if (applyBtn && applyBtn.getAttribute('onclick')) {
                const jobIdMatch = applyBtn.getAttribute('onclick').match(/'([^']+)'/);
                if (jobIdMatch && jobIdMatch[1]) {
                    const jobId = jobIdMatch[1];
                    console.log("🎯 Calculating match for job:", jobId);
                    
                    const matchScore = await window.smartMatching.calculateMatchScore(jobId, user.uid);
                    console.log("📊 Match score for job", jobId, ":", matchScore);
                    
                    // Add match badge to job card (only if not already added)
                    const jobFooter = card.querySelector('.job-footer');
                    if (jobFooter && !jobFooter.querySelector('.match-badge')) {
                        const matchBadge = window.smartMatching.generateMatchBadge(matchScore);
                        jobFooter.insertAdjacentHTML('afterbegin', matchBadge);
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ Error calculating match scores:", error);
    }
}

// Helper function to display matches from query
function displayMatches(querySnapshot, container) {
  container.innerHTML = "";
  
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const matchCard = createMatchCard(data, docSnap.id);
    container.insertAdjacentHTML('beforeend', matchCard);
  });
}

// Helper function to display manually filtered matches
function displayManualMatches(matches, container) {
  container.innerHTML = "";
  
  matches.forEach(match => {
    const matchCard = createMatchCard(match, match.id);
    container.insertAdjacentHTML('beforeend', matchCard);
  });
}

// Helper function to create match card HTML
function createMatchCard(data, matchId) {
  return `
    <div class="job-card accepted">
      <div class="job-header">
        <h3 class="job-title">${escapeHtml(data.jobTitle)}</h3>
        <span class="application-status accepted">CONNECTED</span>
      </div>
      <div class="job-details">
        <p><strong>Farmer:</strong> ${escapeHtml(data.farmerName)}</p>
        <p><strong>Location:</strong> ${escapeHtml(data.jobLocation)}</p>
        <p><strong>Wages:</strong> ₹${data.jobWages}/day</p>
        <p><strong>Connected On:</strong> ${data.matchedAt?.toDate?.().toLocaleDateString() || 'Recently'}</p>
        <p><strong>Status:</strong> <span class="application-status active">ACTIVE</span></p>
      </div>
      <div class="application-actions">
        <button class="accept-btn" onclick="viewJobDetails('${data.jobId}')">View Job Details</button>
      </div>
    </div>
  `;
}

// Helper function for no matches
function showNoMatches(container, laborUid) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🤝</div>
      <h3 class="empty-title">No Connections Yet</h3>
      <p class="empty-description">
        Your confirmed work connections will appear here once farmers accept your applications.
        <br><br>
        <strong>Labor UID:</strong> ${laborUid}
      </p>
    </div>
  `;
}

// Helper function for errors
function showError(container, error) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">❌</div>
      <h3 class="empty-title">Temporary Issue</h3>
      <p class="empty-description">
        The system is experiencing temporary issues. 
        <br><br>
        <strong>Workaround:</strong> Please try refreshing the page.
        <br><br>
        <button onclick="location.reload()" style="background: #d97706; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
          Refresh Page
        </button>
      </p>
    </div>
  `;
}

// --- View Job Details ---
window.viewJobDetails = async function(jobId) {
  try {
    const jobDoc = await getDoc(doc(db, "jobs", jobId));
    if (jobDoc.exists()) {
      const jobData = jobDoc.data();
      alert(`Job Details:\n\nTitle: ${jobData.title}\nLocation: ${jobData.location}\nWages: ₹${jobData.wages}/day\nDescription: ${jobData.description || "No description"}\nSkills: ${jobData.skills || "Not specified"}`);
    } else {
      alert("Job details not found.");
    }
  } catch (error) {
    console.error("Error fetching job details:", error);
    alert("Error loading job details.");
  }
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
        const laborNameElement = document.getElementById("labor-name");
        if (laborNameElement && userData.username) {
          laborNameElement.textContent = userData.username;
        }
      }

      // Load applications if on my-applications page
      if (window.location.pathname.includes('my-applications.html')) {
        loadMyApplications();
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    // If not logged in, redirect to login page
    window.location.href = "login.html";
  }
});

// --- Clean up real-time listeners ---
function cleanupListeners() {
  if (window.jobsUnsubscribe) {
    window.jobsUnsubscribe();
    console.log("Jobs listener cleaned up");
  }
}

// Clean up when leaving the available-jobs page
window.addEventListener('beforeunload', cleanupListeners);