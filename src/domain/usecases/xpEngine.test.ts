import { describe, expect, test } from "bun:test";
import {
  calcTier,
  calcTierProgress,
  calcXpGain,
  shouldUnlockAllTiers,
  TIER_THRESHOLDS,
  TIER_NAMES,
  UNLOCK_ALL_TIERS_XP,
  XP_PENALTY_CLUE_2,
  XP_PENALTY_CLUE_3,
  XP_PENALTY_REVEAL,
} from "./xpEngine";

describe("shouldUnlockAllTiers (PLAN-046)", () => {
  test("di bawah ambang belum unlock semua tier", () => {
    expect(shouldUnlockAllTiers(0)).toBe(false);
    expect(shouldUnlockAllTiers(TIER_THRESHOLDS[9] - 1)).toBe(false); // tier 10, masih < 800k
    expect(shouldUnlockAllTiers(UNLOCK_ALL_TIERS_XP - 1)).toBe(false);
  });

  test("tepat di ambang & di atasnya unlock semua tier", () => {
    expect(shouldUnlockAllTiers(UNLOCK_ALL_TIERS_XP)).toBe(true);
    expect(shouldUnlockAllTiers(UNLOCK_ALL_TIERS_XP + 1)).toBe(true);
    expect(shouldUnlockAllTiers(1_500_000)).toBe(true);
  });

  test("ambang unlock (800.000) di atas ambang tier 10 (500.000)", () => {
    expect(UNLOCK_ALL_TIERS_XP).toBeGreaterThan(TIER_THRESHOLDS[9]);
  });
});

describe("calcXpGain", () => {
  test("basis 25 XP untuk kata 3 huruf di tier 1", () => {
    expect(calcXpGain(3, 1)).toBe(25);
  });

  test("bonus panjang: +5 per huruf di atas 3", () => {
    // 25 + (5-3)*5 = 35
    expect(calcXpGain(5, 1)).toBe(35);
    // 25 + (8-3)*5 = 50
    expect(calcXpGain(8, 1)).toBe(50);
  });

  test("multiplier naik sesuai tier", () => {
    // tier 1: 25*1 = 25; tier 10: 25*5 = 125
    expect(calcXpGain(3, 1)).toBe(25);
    expect(calcXpGain(3, 5)).toBe(50); // 25*2.0
    expect(calcXpGain(3, 10)).toBe(125); // 25*5.0
  });

  test("tier di luar rentang di-clamp", () => {
    expect(calcXpGain(3, 0)).toBe(25); // clamp ke tier 1
    expect(calcXpGain(3, 99)).toBe(125); // clamp ke tier 10
  });

  test("kata 1-2 huruf tidak memberi bonus negatif", () => {
    expect(calcXpGain(1, 1)).toBe(25);
    expect(calcXpGain(2, 1)).toBe(25);
  });
});

describe("calcTier", () => {
  test("tier 1 untuk XP 0", () => {
    expect(calcTier(0)).toBe(1);
  });

  test("tepat di threshold masuk tier berikutnya", () => {
    expect(calcTier(0)).toBe(1);
    expect(calcTier(TIER_THRESHOLDS[1])).toBe(2);
    expect(calcTier(TIER_THRESHOLDS[5])).toBe(6);
    expect(calcTier(TIER_THRESHOLDS[9])).toBe(10);
  });

  test("satu XP sebelum threshold masih tier sebelumnya", () => {
    expect(calcTier(TIER_THRESHOLDS[1] - 1)).toBe(1);
    expect(calcTier(TIER_THRESHOLDS[9] - 1)).toBe(9);
  });

  test("XP negatif dianggap tier 1", () => {
    expect(calcTier(-100)).toBe(1);
  });

  test("XP di atas threshold terakhir tetap tier 10", () => {
    expect(calcTier(9999999)).toBe(10);
  });

  test("10 tier dengan nama unik", () => {
    expect(TIER_THRESHOLDS).toHaveLength(10);
    expect(TIER_NAMES).toHaveLength(10);
    expect(new Set(TIER_NAMES).size).toBe(10);
    expect(TIER_THRESHOLDS[0]).toBe(0);
  });
});

describe("calcTierProgress", () => {
  test("progress 0 di awal tier", () => {
    expect(calcTierProgress(0)).toBe(0);
  });

  test("progress 0.5 di tengah tier 1 (6500 threshold)", () => {
    expect(calcTierProgress(3250)).toBeCloseTo(0.5, 5);
  });

  test("progress 1 di tier maksimal", () => {
    expect(calcTierProgress(500000)).toBe(1);
    expect(calcTierProgress(9999999)).toBe(1);
  });

  test("progress selalu di rentang [0,1]", () => {
    for (const xp of [0, 1, 1000, 6500, 16500, 50000, 500000, 600000]) {
      const p = calcTierProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("penalti XP", () => {
  test("nilai penalti sesuai yang didokumentasikan", () => {
    expect(XP_PENALTY_CLUE_2).toBe(50);
    expect(XP_PENALTY_CLUE_3).toBe(100);
    expect(XP_PENALTY_REVEAL).toBe(75);
  });
});
