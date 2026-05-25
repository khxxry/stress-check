export interface ScoringResult {
  subscales: Record<string, number>; // Standard scores (1-5)
  totalReactionScore: number;
  totalStressorSupportScore: number;
  isHighStress: boolean;
}

export type Gender = 'male' | 'female';

// Subscale definition
const subscaleConfig: Record<string, { questions: number[], formula: (scores: number[]) => number, direction: 'normal' | 'reverse' }> = {
  jobQuantity: { questions: [1, 2, 3], formula: (scores: number[]) => 15 - (scores[0] + scores[1] + scores[2]), direction: 'reverse' },
  jobQuality: { questions: [4, 5, 6], formula: (scores: number[]) => 15 - (scores[0] + scores[1] + scores[2]), direction: 'reverse' },
  physicalBurden: { questions: [7], formula: (scores: number[]) => 5 - scores[0], direction: 'reverse' },
  jobControl: { questions: [8, 9, 10], formula: (scores: number[]) => 15 - (scores[0] + scores[1] + scores[2]), direction: 'normal' },
  skillUtilization: { questions: [11], formula: (scores: number[]) => scores[0], direction: 'normal' },
  interpersonal: { questions: [12, 13, 14], formula: (scores: number[]) => 10 - (scores[0] + scores[1]) + scores[2], direction: 'normal' },
  environment: { questions: [15], formula: (scores: number[]) => 5 - scores[0], direction: 'reverse' },
  suitability: { questions: [16], formula: (scores: number[]) => 5 - scores[0], direction: 'normal' },
  motivation: { questions: [17], formula: (scores: number[]) => 5 - scores[0], direction: 'normal' },
  
  vigor: { questions: [18, 19, 20], formula: (scores: number[]) => scores[0] + scores[1] + scores[2], direction: 'normal' },
  irritation: { questions: [21, 22, 23], formula: (scores: number[]) => scores[0] + scores[1] + scores[2], direction: 'reverse' },
  fatigue: { questions: [24, 25, 26], formula: (scores: number[]) => scores[0] + scores[1] + scores[2], direction: 'reverse' },
  anxiety: { questions: [27, 28, 29], formula: (scores: number[]) => scores[0] + scores[1] + scores[2], direction: 'reverse' },
  depression: { questions: [30, 31, 32, 33, 34, 35], formula: (scores: number[]) => scores.reduce((a, b) => a + b, 0), direction: 'reverse' },
  somatic: { questions: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46], formula: (scores: number[]) => scores.reduce((a, b) => a + b, 0), direction: 'reverse' },
  
  supervisorSupport: { questions: [47, 50, 53], formula: (scores: number[]) => 15 - (scores[0] + scores[1] + scores[2]), direction: 'normal' },
  colleagueSupport: { questions: [48, 51, 54], formula: (scores: number[]) => 15 - (scores[0] + scores[1] + scores[2]), direction: 'normal' },
  familySupport: { questions: [49, 52, 55], formula: (scores: number[]) => 15 - (scores[0] + scores[1] + scores[2]), direction: 'normal' },
  satisfaction: { questions: [56, 57], formula: (scores: number[]) => 10 - (scores[0] + scores[1]), direction: 'normal' },
};

// Conversion Table (Mapping Raw to Standard 1-5)
// Values based on the PDF P40 screenshot
const conversionTable: Record<string, { male: number[][], female: number[][] }> = {
  jobQuantity: {
    male: [[3, 5], [6, 7], [8, 9], [10, 11], [12, 12]],
    female: [[3, 4], [5, 6], [7, 9], [10, 11], [12, 12]],
  },
  jobQuality: {
    male: [[3, 5], [6, 7], [8, 9], [10, 11], [12, 12]],
    female: [[3, 4], [5, 6], [7, 8], [9, 10], [11, 12]],
  },
  physicalBurden: {
    male: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]], // Standard 1 is skipped for some, but I'll use 2 as min
    female: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
  },
  jobControl: {
    male: [[3, 4], [5, 6], [7, 8], [9, 10], [11, 12]],
    female: [[3, 3], [4, 5], [6, 8], [9, 10], [11, 12]],
  },
  skillUtilization: {
    male: [[1, 1], [2, 2], [3, 3], [4, 4], [0, 0]], // Standard 5 skipped
    female: [[1, 1], [2, 2], [3, 3], [4, 4], [0, 0]],
  },
  interpersonal: {
    male: [[3, 3], [4, 5], [6, 7], [8, 9], [10, 12]],
    female: [[3, 3], [4, 5], [6, 7], [8, 9], [10, 12]],
  },
  environment: {
    male: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
    female: [[1, 1], [0, 0], [2, 2], [3, 3], [4, 4]],
  },
  suitability: {
    male: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
    female: [[1, 1], [2, 2], [3, 3], [0, 0], [4, 4]],
  },
  motivation: {
    male: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
    female: [[1, 1], [2, 2], [3, 3], [0, 0], [4, 4]],
  },
  vigor: {
    male: [[3, 3], [4, 5], [6, 7], [8, 9], [10, 12]],
    female: [[3, 3], [4, 5], [6, 7], [8, 9], [10, 12]],
  },
  irritation: {
    male: [[3, 3], [4, 5], [6, 7], [8, 9], [10, 12]],
    female: [[3, 3], [4, 5], [6, 8], [9, 10], [11, 12]],
  },
  fatigue: {
    male: [[3, 3], [4, 4], [5, 7], [8, 10], [11, 12]],
    female: [[3, 3], [4, 5], [6, 8], [9, 11], [12, 12]],
  },
  anxiety: {
    male: [[3, 3], [4, 4], [5, 7], [8, 9], [10, 12]],
    female: [[3, 3], [4, 4], [5, 7], [8, 10], [11, 12]],
  },
  depression: {
    male: [[6, 6], [7, 8], [9, 12], [13, 16], [17, 24]],
    female: [[6, 6], [7, 8], [9, 12], [13, 17], [18, 24]],
  },
  somatic: {
    male: [[11, 11], [12, 15], [16, 21], [22, 26], [27, 44]],
    female: [[11, 13], [14, 17], [18, 23], [24, 29], [30, 44]],
  },
  supervisorSupport: {
    male: [[3, 4], [5, 6], [7, 8], [9, 10], [11, 12]],
    female: [[3, 3], [4, 5], [6, 7], [8, 10], [11, 12]],
  },
  colleagueSupport: {
    male: [[3, 5], [6, 7], [8, 9], [10, 11], [12, 12]],
    female: [[3, 5], [6, 7], [8, 9], [10, 11], [12, 12]],
  },
  familySupport: {
    male: [[3, 6], [7, 8], [9, 9], [10, 11], [12, 12]],
    female: [[3, 6], [7, 8], [9, 9], [10, 11], [12, 12]],
  },
  satisfaction: {
    male: [[2, 3], [4, 4], [5, 6], [7, 7], [8, 8]],
    female: [[2, 3], [4, 4], [5, 6], [7, 7], [8, 8]],
  },
};

export function calculateScoring(answers: Record<number, number>, gender: Gender): ScoringResult {
  const subscales: Record<string, number> = {};

  // 1. Calculate Standard Scores for each subscale
  for (const [key, config] of Object.entries(subscaleConfig)) {
    const rawScores = config.questions.map(id => answers[id] || 1);
    const rawSum = config.formula(rawScores);
    
    // Map rawSum to standard score using conversionTable
    const table = conversionTable[key][gender];
    let standardScore = 3; // Default to middle if something goes wrong
    for (let i = 0; i < table.length; i++) {
       const [min, max] = table[i];
       if (min === 0 && max === 0) continue; // Skip skipped standard scores
       if (rawSum >= min && rawSum <= max) {
         standardScore = config.direction === 'reverse' ? 5 - i : i + 1;
         break;
       }
    }
    subscales[key] = standardScore;
  }

  // 2. High-stress Evaluation (Method 2)
  // Group A: Stress Reactions (vigor, irritation, fatigue, anxiety, depression, somatic)
  // For judgment, positivevigor needs inversion? 
  // Standard scores: 1 (high stress) to 5 (low stress)
  // Let's use the direct standard scores.
  
  // Rule 1: Sum of reaction standard scores <= 12
  const reactionKeys = ['vigor', 'irritation', 'fatigue', 'anxiety', 'depression', 'somatic'];
  // Vigor is positive, so lower standard score (1) is BAD.
  // Irritation etc are negative, so higher standard score (5) is BAD? 
  // WAIT: In the manual, for ALL subscales in Group A/B/C/D, 
  // lower standard score (1) means HIGH stress / POOR condition.
  // Higher standard score (5) means LOW stress / GOOD condition.
  
  const reactionScores = reactionKeys.map(k => subscales[k]);
  const totalReactionScore = reactionScores.reduce((a, b) => a + b, 0);

  // Rule 2: (Sum of stressors + Sum of support) <= 26 AND reaction sum <= 17
  const stressorKeys = ['jobQuantity', 'jobQuality', 'physicalBurden', 'jobControl', 'skillUtilization', 'interpersonal', 'environment', 'suitability', 'motivation'];
  const supportKeys = ['supervisorSupport', 'colleagueSupport', 'familySupport'];
  const stressorSupportScores = [...stressorKeys, ...supportKeys].map(k => subscales[k]);
  const totalStressorSupportScore = stressorSupportScores.reduce((a, b) => a + b, 0);

  const isHighStress = (totalReactionScore <= 12) || (totalStressorSupportScore <= 26 && totalReactionScore <= 17);

  return {
    subscales,
    totalReactionScore,
    totalStressorSupportScore,
    isHighStress,
  };
}
