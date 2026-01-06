// js/myPosts.js - COMPLETE WITH EDIT FUNCTIONALITY
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

import { app, auth, db } from './firebaseConfig.js';

// Modal elements
let editJobModal, closeEditModal, cancelEditBtn, editJobForm;

document.addEventListener('DOMContentLoaded', function() {
  initializeLogout();
  initializeModal();
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadMyPosts();
    } else {
      window.location.href = "login.html";
    }
  });
});

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

function initializeModal() {
  editJobModal = document.getElementById("editJobModal");
  closeEditModal = document.getElementById("closeEditModal");
  cancelEditBtn = document.getElementById("cancelEdit");
  editJobForm = document.getElementById("editJobForm");

  // Close modal events
  if (closeEditModal) {
    closeEditModal.addEventListener("click", closeEditModalFunc);
  }
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", closeEditModalFunc);
  }

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === editJobModal) {
      closeEditModalFunc();
    }
  });

  // Edit form submission
  if (editJobForm) {
    editJobForm.addEventListener("submit", handleEditSubmit);
  }
}

function closeEditModalFunc() {
  if (editJobModal) {
    editJobModal.style.display = "none";
  }
}

function openEditModal() {
  if (editJobModal) {
    editJobModal.style.display = "block";
  }
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const jobId = document.getElementById("editJobId").value;
  const jobTitle = document.getElementById("editJobTitle").value.trim();
  const jobWages = document.getElementById("editJobWages").value;
  const jobLocation = document.getElementById("editJobLocation").value.trim();
  const jobStart = document.getElementById("editJobStart").value;
  const jobDuration = document.getElementById("editJobDuration").value;
  const jobSkills = document.getElementById("editJobSkills").value.trim();
  const jobDesc = document.getElementById("editJobDesc").value.trim();

  // Validation
  if (!jobTitle || !jobWages || !jobLocation) {
    alert("Please fill Title, Wages and Location fields.");
    return;
  }

  const updatedJob = {
    title: jobTitle,
    wages: parseInt(jobWages),
    location: jobLocation,
    startDate: jobStart || null,
    duration: jobDuration ? parseInt(jobDuration) : null,
    skills: jobSkills,
    description: jobDesc,
    updatedAt: new Date()
  };

  try {
    await updateDoc(doc(db, "jobs", jobId), updatedJob);
    alert("Job updated successfully!");
    closeEditModalFunc();
    loadMyPosts(); // Reload the list
  } catch (error) {
    console.error("Error updating job:", error);
    alert("Error updating job: " + error.message);
  }
}

async function loadMyPosts() {
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const jobsContainer = document.getElementById("jobsContainer");
    jobsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3 class="empty-title">Loading Your Posts...</h3>
        <p class="empty-description">Please wait while we fetch your job posts.</p>
      </div>
    `;

    // Now this query will work since index is created
    const q = query(
      collection(db, "jobs"),
      where("farmerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      jobsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3 class="empty-title">No Job Posts Yet</h3>
          <p class="empty-description">You haven't posted any jobs yet. Start by posting your first job!</p>
          <a href="post-job.html" class="submit-btn" style="display: inline-block; width: auto; padding: 0.75rem 2rem;">Post Your First Job</a>
        </div>
      `;
      return;
    }

    jobsContainer.innerHTML = '';

    querySnapshot.forEach((docSnap) => {
      const job = docSnap.data();
      const jobId = docSnap.id;
      displayJobCard(jobId, job);
    });

  } catch (error) {
    console.error("Error loading job posts:", error);
    const jobsContainer = document.getElementById("jobsContainer");
    if (jobsContainer) {
      jobsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <h3 class="empty-title">Error Loading Posts</h3>
          <p class="empty-description">Error: ${error.message}</p>
          <button onclick="loadMyPosts()" class="submit-btn" style="display: inline-block; width: auto; padding: 0.75rem 2rem;">Try Again</button>
        </div>
      `;
    }
  }
}

function displayJobCard(jobId, job) {
  const jobsContainer = document.getElementById("jobsContainer");
  
  const formatDate = (dateString) => {
    if (!dateString) return "ASAP";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Recently";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return "Recently";
    } catch {
      return "Recently";
    }
  };

  const jobCard = document.createElement('div');
  jobCard.className = 'job-card';
  jobCard.innerHTML = `
    <div class="job-header">
      <h3 class="job-title">${escapeHtml(job.title)}</h3>
      <span class="job-type">${job.jobType || 'agriculture'}</span>
    </div>
    <div class="job-details">
      <p><strong>Description:</strong> ${escapeHtml(job.description || 'No description provided')}</p>
      <p><strong>Location:</strong> ${escapeHtml(job.location)}</p>
      <p><strong>Wages:</strong> ₹${job.wages}/day</p>
      ${job.startDate ? `<p><strong>Start Date:</strong> ${formatDate(job.startDate)}</p>` : ''}
      ${job.duration ? `<p><strong>Duration:</strong> ${job.duration} days</p>` : ''}
      ${job.skills ? `<p><strong>Skills Required:</strong> ${escapeHtml(job.skills)}</p>` : ''}
      <p><strong>Status:</strong> <span class="status ${job.status || 'open'}">${(job.status || 'open').toUpperCase()}</span></p>
      <p><strong>Posted:</strong> ${formatTimestamp(job.createdAt)}</p>
      ${job.updatedAt ? `<p><strong>Last Updated:</strong> ${formatTimestamp(job.updatedAt)}</p>` : ''}
    </div>
    <div class="job-actions">
      <button class="btn-edit" onclick="editJob('${jobId}')">Edit</button>
      <button class="btn-delete" onclick="deleteJob('${jobId}')">Delete</button>
    </div>
  `;
  
  jobsContainer.appendChild(jobCard);
}

// Edit job function
window.editJob = async function(jobId) {
  try {
    const jobDoc = await getDoc(doc(db, "jobs", jobId));
    if (!jobDoc.exists()) {
      alert("Job not found!");
      return;
    }

    const job = jobDoc.data();
    
    // Populate form with current job data
    document.getElementById("editJobId").value = jobId;
    document.getElementById("editJobTitle").value = job.title;
    document.getElementById("editJobWages").value = job.wages;
    document.getElementById("editJobLocation").value = job.location;
    
    // Format date for input field (YYYY-MM-DD)
    if (job.startDate) {
      let startDate;
      if (job.startDate.toDate) {
        startDate = job.startDate.toDate();
      } else if (job.startDate.seconds) {
        startDate = new Date(job.startDate.seconds * 1000);
      } else {
        startDate = new Date(job.startDate);
      }
      document.getElementById("editJobStart").value = startDate.toISOString().split('T')[0];
    } else {
      document.getElementById("editJobStart").value = '';
    }
    
    document.getElementById("editJobDuration").value = job.duration || '';
    document.getElementById("editJobSkills").value = job.skills || '';
    document.getElementById("editJobDesc").value = job.description || '';

    // Open modal
    openEditModal();
    
  } catch (error) {
    console.error("Error loading job for edit:", error);
    alert("Error loading job details: " + error.message);
  }
};

window.deleteJob = async function(jobId) {
  if (!confirm('Are you sure you want to delete this job post? This action cannot be undone.')) {
    return;
  }

  try {
    const applicationsQuery = query(
      collection(db, "applications"),
      where("jobId", "==", jobId)
    );
    
    const applicationsSnapshot = await getDocs(applicationsQuery);
    const deletePromises = applicationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    deletePromises.push(deleteDoc(doc(db, "jobs", jobId)));
    
    await Promise.all(deletePromises);
    
    alert('Job deleted successfully!');
    loadMyPosts();
    
  } catch (error) {
    console.error("Error deleting job:", error);
    alert("Error deleting job: " + error.message);
  }
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.loadMyPosts = loadMyPosts;