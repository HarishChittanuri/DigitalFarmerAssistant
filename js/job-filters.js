// js/job-filters.js - Simplified Filter System (No Sort)
class JobFilters {
    constructor() {
        this.filters = {
            location: '',
            skills: 'all'
        };
        this.originalJobs = []; // Store original job order
    }

    init() {
        this.setupEventListeners();
        console.log("✅ Simplified Job Filters initialized");
    }

    setupEventListeners() {
        // Location filter
        document.getElementById('locationFilter')?.addEventListener('input', (e) => {
            this.filters.location = e.target.value;
            clearTimeout(this.locationTimeout);
            this.locationTimeout = setTimeout(() => this.applyFilters(), 300);
        });

        // Skills filter
        document.getElementById('skillsFilter')?.addEventListener('change', (e) => {
            this.filters.skills = e.target.value;
            this.applyFilters();
        });

        // Apply filters button
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        // Reset filters button
        document.getElementById('resetFilters')?.addEventListener('click', () => {
            this.simpleReset();
        });
    }

    // Store original job order when jobs are loaded
    storeOriginalJobs() {
        const jobCards = document.querySelectorAll('.job-card');
        this.originalJobs = Array.from(jobCards);
        console.log("📊 Stored original jobs:", this.originalJobs.length);
    }

    // Apply filters to existing job cards on the page
    applyFilters() {
        const jobsContainer = document.getElementById('jobsList');
        if (!jobsContainer) {
            console.log("❌ Jobs container not found");
            return;
        }

        // Get all current job cards
        const jobCards = Array.from(document.querySelectorAll('.job-card'));
        
        if (jobCards.length === 0) {
            console.log("❌ No job cards found");
            this.showNoJobsMessage();
            return;
        }

        console.log("🔄 Applying filters to", jobCards.length, "job cards");

        // Hide all jobs first
        jobCards.forEach(card => card.style.display = 'none');

        // Filter and show matching jobs
        let visibleJobs = jobCards.filter(card => this.jobMatchesFilters(card));

        // Show the filtered jobs (no sorting needed)
        visibleJobs.forEach(card => card.style.display = 'block');

        // Update the display
        this.updateJobsDisplay(visibleJobs.length);

        // Update active filters
        this.updateActiveFilters();

        console.log("✅ Filters applied. Showing", visibleJobs.length, "jobs");
    }

    // Check if a job card matches current filters
    jobMatchesFilters(jobCard) {
        const location = this.getJobLocation(jobCard);
        const skills = this.getJobSkills(jobCard);

        // Location filter
        if (this.filters.location && this.filters.location.trim() !== '') {
            const locationFilter = this.filters.location.toLowerCase().trim();
            if (!location.toLowerCase().includes(locationFilter)) {
                return false;
            }
        }

        // Skills filter
        if (this.filters.skills !== 'all') {
            const skillsFilter = this.filters.skills.toLowerCase();
            if (!skills.toLowerCase().includes(skillsFilter)) {
                return false;
            }
        }

        return true;
    }

    // Get job location from card
    getJobLocation(jobCard) {
        const locationElement = jobCard.querySelector('.job-details p:nth-child(2)');
        if (locationElement) {
            return locationElement.textContent.replace('Location:', '').trim();
        }
        return '';
    }

    // Get job skills from card
    getJobSkills(jobCard) {
        const skillsElement = jobCard.querySelector('.job-skills');
        if (skillsElement) {
            return skillsElement.textContent.replace('Skills Required:', '').trim();
        }
        return '';
    }

    // Update the jobs display message
    updateJobsDisplay(visibleCount) {
        const jobsContainer = document.getElementById('jobsList');
        if (!jobsContainer) return;

        const totalCards = document.querySelectorAll('.job-card').length;
        
        if (visibleCount === 0) {
            // Show no jobs message but keep the container structure
            const noJobsMsg = document.createElement('div');
            noJobsMsg.className = 'empty-state';
            noJobsMsg.innerHTML = `
                <div class="empty-icon">🔍</div>
                <h3 class="empty-title">No Jobs Match Your Filters</h3>
                <p class="empty-description">Try adjusting your filters or reset to see all jobs.</p>
                <button onclick="jobFilters.simpleReset()" class="filter-btn primary" style="margin-top: 10px;">Reset Filters</button>
            `;
            
            // Hide all job cards
            document.querySelectorAll('.job-card').forEach(card => card.style.display = 'none');
            
            // Remove existing no jobs message if any
            const existingMsg = jobsContainer.querySelector('.empty-state');
            if (existingMsg) existingMsg.remove();
            
            // Add new message
            jobsContainer.appendChild(noJobsMsg);
        } else {
            // Remove any no jobs message
            const noJobsMsg = jobsContainer.querySelector('.empty-state');
            if (noJobsMsg) noJobsMsg.remove();
            
            console.log(`👀 Showing ${visibleCount} of ${totalCards} jobs`);
        }
    }

    // SIMPLE RESET THAT JUST SHOWS ALL JOBS
    simpleReset() {
        console.log("🔄 SIMPLE RESET - Showing all jobs");
        
        // Reset form values
        document.getElementById('locationFilter').value = '';
        document.getElementById('skillsFilter').value = 'all';

        // Reset filter state
        this.filters = {
            location: '',
            skills: 'all'
        };

        // Hide active filters
        const activeFiltersContainer = document.getElementById('activeFilters');
        if (activeFiltersContainer) {
            activeFiltersContainer.classList.add('hidden');
        }

        // SHOW ALL JOB CARDS
        const jobCards = document.querySelectorAll('.job-card');
        jobCards.forEach(card => {
            card.style.display = 'block';
        });

        // Remove any "no jobs" message
        const jobsContainer = document.getElementById('jobsList');
        const noJobsMsg = jobsContainer?.querySelector('.empty-state');
        if (noJobsMsg) noJobsMsg.remove();

        console.log("✅ Reset complete. Showing all", jobCards.length, "jobs");
    }

    // Update active filters display
    updateActiveFilters() {
        const activeFiltersContainer = document.getElementById('activeFilters');
        const activeFiltersList = document.getElementById('activeFiltersList');

        if (!activeFiltersContainer || !activeFiltersList) return;

        const activeFilters = [];

        // Location filter
        if (this.filters.location && this.filters.location.trim() !== '') {
            activeFilters.push(this.createFilterTag('location', `Location: ${this.filters.location}`));
        }

        // Skills filter
        if (this.filters.skills !== 'all') {
            activeFilters.push(this.createFilterTag('skills', `Skills: ${this.filters.skills}`));
        }

        if (activeFilters.length > 0) {
            activeFiltersList.innerHTML = activeFilters.join('');
            activeFiltersContainer.classList.remove('hidden');
        } else {
            activeFiltersContainer.classList.add('hidden');
        }
    }

    createFilterTag(type, text) {
        return `
            <div class="filter-tag">
                ${text}
                <span class="filter-tag-remove" onclick="jobFilters.removeFilter('${type}')">×</span>
            </div>
        `;
    }

    removeFilter(filterType) {
        switch (filterType) {
            case 'location':
                document.getElementById('locationFilter').value = '';
                this.filters.location = '';
                break;
            case 'skills':
                document.getElementById('skillsFilter').value = 'all';
                this.filters.skills = 'all';
                break;
        }
        this.applyFilters();
    }
}

// Initialize global instance
window.jobFilters = new JobFilters();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('jobsList')) {
        window.jobFilters.init();
        
        // Wait for jobs to load, then store original order
        setTimeout(() => {
            window.jobFilters.storeOriginalJobs();
        }, 2000);
        
        console.log("🚀 Simplified Job Filters loaded - READY!");
    }
});