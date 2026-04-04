// XP and Level Calculation Utilities

const LEVEL_THRESHOLDS = [
  0,     // Level 1: 0 XP
  100,   // Level 2: 100 XP
  250,   // Level 3: 250 XP
  500,   // Level 4: 500 XP
  800,   // Level 5: 800 XP
  1200,  // Level 6: 1200 XP
  1700,  // Level 7: 1700 XP
  2300,  // Level 8: 2300 XP
  3000,  // Level 9: 3000 XP
  4000,  // Level 10: 4000 XP
  5500,  // Level 11
  7500,  // Level 12
  10000, // Level 13
  13000, // Level 14
  17000, // Level 15
  22000, // Level 16
  28000, // Level 17
  35000, // Level 18
  43000, // Level 19
  52000, // Level 20
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

export function getXPForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] ?? 0;
}

export function getXPForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return LEVEL_THRESHOLDS[MAX_LEVEL - 1];
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function getXPProgress(xp: number): { current: number; needed: number; percentage: number } {
  const level = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const current = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  const percentage = needed > 0 ? Math.min((current / needed) * 100, 100) : 100;
  return { current, needed, percentage };
}

/** Calculate XP earned for answering a question */
export function calculateXP(params: {
  isCorrect: boolean;
  points: number;
  streakCount: number;
  timeRemainingRatio: number; // 0 to 1
}): number {
  if (!params.isCorrect) return 5; // Small consolation XP

  const baseXP = params.points;
  const streakBonus = Math.min(params.streakCount, 10) * 2; // +2 XP per streak, max +20
  const speedBonus = Math.floor(params.timeRemainingRatio * 5); // Up to +5 for fast answers

  return baseXP + streakBonus + speedBonus;
}

/** Calculate score for answering a question */
export function calculateScore(params: {
  isCorrect: boolean;
  basePoints: number;
  streakCount: number;
  timeRemainingRatio: number;
}): number {
  if (!params.isCorrect) return 0;

  const streakMultiplier = 1 + Math.min(params.streakCount, 10) * 0.1; // Up to 2x
  const speedBonus = Math.floor(params.timeRemainingRatio * params.basePoints * 0.5); // Up to +50% for speed

  return Math.floor(params.basePoints * streakMultiplier) + speedBonus;
}

/** Get a title for the level */
export function getLevelTitle(level: number): string {
  if (level <= 2) return "Novice";
  if (level <= 4) return "Apprentice";
  if (level <= 6) return "Warrior";
  if (level <= 8) return "Knight";
  if (level <= 10) return "Champion";
  if (level <= 13) return "Hero";
  if (level <= 16) return "Legend";
  if (level <= 19) return "Mythic";
  return "Grandmaster";
}

/** Shuffle array using Fisher-Yates */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
