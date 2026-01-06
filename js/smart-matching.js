// js/smart-matching.js - Smart Job-Labor Matching Algorithm
class SmartMatching {
    constructor() {
        this.weights = {
            skills: 0.4,
            location: 0.3,
            wages: 0.2,
            experience: 0.1
        };
        this.db = null;
        this.firestoreModule = null;
    }

    async init() {
        try {
            // Import Firebase modules
            this.firestoreModule = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
            const firebaseConfig = await import("./firebaseConfig.js");
            this.db = firebaseConfig.db;
            console.log("✅ Smart Matching initialized");
        } catch (error) {
            console.error("❌ Smart Matching init failed:", error);
        }
    }

    // Calculate match score between job and laborer
    async calculateMatchScore(jobId, laborId) {
        try {
            if (!this.db) await this.init();
            
            const [jobData, laborData] = await Promise.all([
                this.getJobData(jobId),
                this.getLaborData(laborId)
            ]);

            console.log("🔄 Matching - Job Data:", jobData);
            console.log("🔄 Matching - Labor Data:", laborData);

            if (!jobData || !laborData) {
                console.log("❌ Missing job or labor data");
                return 0;
            }

            let score = 0;
            
            // Skills matching
            const skillsMatch = this.calculateSkillsSimilarity(
                jobData.skills, 
                laborData.skills
            );
            score += skillsMatch * this.weights.skills;
            console.log("💪 Skills match:", skillsMatch);

            // Location matching
            const locationMatch = this.calculateLocationSimilarity(
                jobData.location,
                laborData.preferredLocations
            );
            score += locationMatch * this.weights.location;
            console.log("📍 Location match:", locationMatch);

            // Experience matching
            const experienceMatch = this.calculateExperienceCompatibility(
                jobData.skills,
                laborData.experience
            );
            score += experienceMatch * this.weights.experience;
            console.log("📊 Experience match:", experienceMatch);

            const finalScore = Math.min(100, Math.round(score * 100));
            console.log("🎯 Final match score:", finalScore);
            return finalScore;
            
        } catch (error) {
            console.error("❌ Error in calculateMatchScore:", error);
            return 0;
        }
    }

    calculateSkillsSimilarity(jobSkills, laborSkills) {
        if (!jobSkills || !laborSkills) {
            console.log("⚠️ Missing skills data");
            return 0.3;
        }
        
        const jobSkillsArray = jobSkills.toLowerCase().split(',').map(s => s.trim());
        const laborSkillsArray = laborSkills.toLowerCase().split(',').map(s => s.trim());
        
        console.log("🔍 Job skills:", jobSkillsArray);
        console.log("🔍 Labor skills:", laborSkillsArray);
        
        if (jobSkillsArray.length === 0 || laborSkillsArray.length === 0) return 0.3;
        
        const intersection = jobSkillsArray.filter(skill => 
            laborSkillsArray.some(laborSkill => 
                laborSkill.includes(skill) || skill.includes(laborSkill)
            )
        );
        
        const union = [...new Set([...jobSkillsArray, ...laborSkillsArray])];
        const similarity = union.length > 0 ? intersection.length / union.length : 0.3;
        
        console.log("🎯 Skills intersection:", intersection);
        console.log("🎯 Skills similarity:", similarity);
        
        return similarity;
    }

    calculateLocationSimilarity(jobLocation, preferredLocations) {
        if (!preferredLocations) {
            console.log("⚠️ No preferred locations");
            return 0.5;
        }
        
        const jobLoc = jobLocation.toLowerCase();
        const prefLocs = preferredLocations.toLowerCase().split(',').map(l => l.trim());
        
        console.log("🔍 Job location:", jobLoc);
        console.log("🔍 Preferred locations:", prefLocs);
        
        // Check for direct matches
        if (prefLocs.some(loc => jobLoc.includes(loc) || loc.includes(jobLoc))) {
            console.log("✅ Direct location match");
            return 1;
        }
        
        // Check for district/region matches
        const commonDistricts = ['pune', 'nashik', 'nagpur', 'aurangabad', 'kolhapur'];
        const jobDistrict = commonDistricts.find(district => jobLoc.includes(district));
        const prefDistrict = commonDistricts.find(district => 
            prefLocs.some(loc => loc.includes(district))
        );
        
        if (jobDistrict && prefDistrict && jobDistrict === prefDistrict) {
            console.log("✅ District match:", jobDistrict);
            return 0.7;
        }
        
        console.log("❌ No location match");
        return 0.3;
    }

    calculateExperienceCompatibility(jobSkills, laborExperience) {
        const experienceWeights = {
            'beginner': 0.6,
            'intermediate': 0.8,
            'experienced': 1.0
        };
        
        const weight = experienceWeights[laborExperience] || 0.7;
        console.log("🎓 Experience compatibility:", laborExperience, "->", weight);
        return weight;
    }

    async getJobData(jobId) {
        try {
            if (!this.db) await this.init();
            
            const jobDoc = await this.firestoreModule.getDoc(this.firestoreModule.doc(this.db, "jobs", jobId));
            if (jobDoc.exists()) {
                const data = jobDoc.data();
                console.log("📄 Retrieved job data:", data);
                return data;
            }
            console.log("❌ Job not found:", jobId);
            return null;
        } catch (error) {
            console.error("Error getting job data:", error);
            return null;
        }
    }

    async getLaborData(laborId) {
        try {
            if (!this.db) await this.init();
            
            const laborDoc = await this.firestoreModule.getDoc(this.firestoreModule.doc(this.db, "users", laborId));
            if (laborDoc.exists()) {
                const data = laborDoc.data();
                console.log("📄 Retrieved labor data:", data);
                return data;
            }
            console.log("❌ Labor data not found for:", laborId);
            return null;
        } catch (error) {
            console.error("Error getting labor data:", error);
            return null;
        }
    }

    // Generate match badge HTML
    generateMatchBadge(score) {
        if (score >= 80) {
            return `<span class="match-badge excellent">Excellent Match ${score}%</span>`;
        } else if (score >= 60) {
            return `<span class="match-badge good">Good Match ${score}%</span>`;
        } else if (score >= 40) {
            return `<span class="match-badge fair">Fair Match ${score}%</span>`;
        } else {
            return `<span class="match-badge poor">Low Match ${score}%</span>`;
        }
    }
}

// Initialize global instance
window.smartMatching = new SmartMatching();
console.log("🚀 Smart Matching loaded");