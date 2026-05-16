// ==========================================
// 1. CONFIGURATION & RULES
// Edit these constants to tweak the game economy!
// ==========================================

export const XP_RULES = {
  BASE_SAVE: 1, 
  DILEMMA_BASE: 5, // Base points for completing an Ethical Dilemma
  TALK_TIME: {
    UNDER_5: 3,
    OPTIMAL: 9, // > 5% and < 15%
    OVER_15: 5, // > 15% and < 25%
    OVER_25: 1  // > 25%
  },
  // UPDATED: Keys are now fully lowercase and include "sufficient"
  COMPETENCY: {
    exemplary: 9,
    proficient: 5,
    sufficient: 3,
    needsdevelopment: 1
  },
  QUIZ: {
    LONG: { // > 20 questions
      EXCELLENT: 9, // >= 80%
      GOOD: 5,      // 70% - 79%
      FAIR: 3,      // 60% - 69%
      POOR: 1       // < 60%
    },
    SHORT: { // <= 20 questions
      EXCELLENT: 3, // >= 80%
      POOR: 1       // < 80%
    }
  }
};

// Order matters here! Always go from highest to lowest.
export const STREAK_MULTIPLIERS = [
  { threshold: 500, multiplier: 1.50 },
  { threshold: 100, multiplier: 1.25 },
  { threshold: 30, multiplier: 1.15 },
  { threshold: 10, multiplier: 1.05 },
  { threshold: 3, multiplier: 1.02 },
  { threshold: 0, multiplier: 1.00 } 
];

// Order matters here too! Highest to lowest.
export const STATUS_TIERS = [
  { name: 'Maestro', minXP: 25000 },
  { name: 'Legend', minXP: 5000 },
  { name: 'Champion', minXP: 500 },
  { name: 'Rookie', minXP: 0 }
];

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

// Calculates XP based on the Coach's Talk Time percentage
export const calculateTalkTimeXP = (coachRatioPercentage) => {
  if (coachRatioPercentage < 5) return XP_RULES.TALK_TIME.UNDER_5;
  if (coachRatioPercentage >= 5 && coachRatioPercentage <= 15) return XP_RULES.TALK_TIME.OPTIMAL;
  if (coachRatioPercentage > 15 && coachRatioPercentage <= 25) return XP_RULES.TALK_TIME.OVER_15;
  return XP_RULES.TALK_TIME.OVER_25; // Anything over 25%
};

// Calculates XP based on an array of competency ratings
export const calculateCompetenciesXP = (competenciesArray) => {
  if (!competenciesArray || competenciesArray.length === 0) return 0;
  
  return competenciesArray.reduce((total, rating) => {
    // UPDATED: We remove spaces AND force lowercase (e.g., "NEEDS DEVELOPMENT" -> "needsdevelopment")
    const cleanRating = rating.replace(/\s+/g, '').toLowerCase(); 
    const points = XP_RULES.COMPETENCY[cleanRating] || 0;
    return total + points;
  }, 0);
};

// --- NEW: Quiz Math ---
export const calculateQuizXP = (percentage, totalQuestions) => {
  if (totalQuestions > 20) {
    if (percentage >= 80) return XP_RULES.QUIZ.LONG.EXCELLENT;
    if (percentage >= 70) return XP_RULES.QUIZ.LONG.GOOD;
    if (percentage >= 60) return XP_RULES.QUIZ.LONG.FAIR;
    return XP_RULES.QUIZ.LONG.POOR;
  } else {
    if (percentage >= 80) return XP_RULES.QUIZ.SHORT.EXCELLENT;
    return XP_RULES.QUIZ.SHORT.POOR;
  }
};

// --- NEW: Streak Logic ---
// Checks if the user missed a day, kept the streak going, or is doing multiple sessions in one day.
export const calculateNewStreak = (lastActivityDate, currentStreak) => {
  if (!lastActivityDate) return 1; // Brand new streak
  
  // Convert Firestore timestamp to JS Date if necessary
  const lastDate = lastActivityDate.toDate ? lastActivityDate.toDate() : new Date(lastActivityDate);
  const today = new Date();
  
  // Strip the times to only compare the calendar days
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays === 0) return currentStreak; // They already saved something today. Don't increase it.
  if (diffDays === 1) return currentStreak + 1; // Kept the streak alive!
  return 1; // Missed a day. Reset to 1.
};

// Finds the correct multiplier based on the user's current streak
export const getStreakMultiplier = (currentStreak) => {
  const tier = STREAK_MULTIPLIERS.find(t => currentStreak >= t.threshold);
  return tier ? tier.multiplier : 1.00;
};

// Determines the user's title based on their total all-time XP
export const getUserStatus = (totalXP) => {
  const status = STATUS_TIERS.find(tier => totalXP >= tier.minXP);
  return status ? status.name : 'Rookie';
};

// Finds how many points the user needs to reach the NEXT status tier
export const getNextTierRequirement = (totalXP) => {
  // We reverse the array to search from Rookie upwards to find the next milestone
  const nextTier = [...STATUS_TIERS].reverse().find(tier => tier.minXP > totalXP);
  return nextTier ? nextTier.minXP - totalXP : 0; // Returns 0 if they are already a Maestro!
};

// ==========================================
// 3. THE MASTER CALCULATION FUNCTION
// ==========================================

/**
 * Takes in a session report and calculates the total awarded XP.
 * @param {Object} reportData - Object containing session details (type, talkTime, competencies, etc.)
 * @param {number} currentStreak - The user's streak value BEFORE saving this session
 * @returns {number} The final calculated XP to add to the database
 */
export const calculateSessionXP = (reportData, currentStreak) => {
  let baseXP = 0;

  // 1. Is it a Quiz?
  if (reportData.type === 'Quiz') {
    baseXP += calculateQuizXP(reportData.percentage, reportData.totalQuestions);
  }
  
  // 2. Is it an Ethical Dilemma?
  else if (reportData.type === 'Dilemma') {
    baseXP += XP_RULES.DILEMMA_BASE;
  }
  
  // 3. Is it a Transcript/Simulation?
  else {
    baseXP += XP_RULES.BASE_SAVE; // Base +1 for saving
    
    if (reportData.talkTime !== undefined && reportData.talkTime !== null) {
      baseXP += calculateTalkTimeXP(reportData.talkTime);
    }
    if (reportData.competencies && Array.isArray(reportData.competencies)) {
      baseXP += calculateCompetenciesXP(reportData.competencies);
    }
  }

  // 4. Apply Streak Multiplier and Round Up
  const multiplier = getStreakMultiplier(currentStreak);
  const finalXP = Math.ceil(baseXP * multiplier);

  return finalXP;
};