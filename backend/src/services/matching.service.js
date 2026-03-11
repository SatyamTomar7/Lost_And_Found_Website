import { LostItem } from "../models/LostItem.model.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { ITEM_STATUS } from "../constants.js";

const WEIGHTS = Object.freeze({
  name:      0.45,  // GATE + highest weight (fixed dropdown = reliable)
  color:     0.30,  // GATE + second highest (fixed dropdown = reliable)
  date:      0.10,  // GATE + booster (±3 days window)
  place:     0.10,  // booster only
  brand:     0.05,  // booster only (optional field)
});

const CONDITION_BONUS = 0.03; // +3 points if condition matches (booster, never a gate)

class MatchingService {

  // ---------------------------------------------------------------------------
  // NAME SIMILARITY
  // Fixed ITEM_NAME list → exact match is the norm, fuzzy only for "Other"
  // ---------------------------------------------------------------------------
  calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;

    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    if (n1 === n2) return 1; // Exact match (standard case from dropdown)

    // Fuzzy only for "Other" free-text or minor typos
    const levenScore  = this.levenshteinSimilarity(n1, n2);
    const tokenScore  = this.tokenOverlapScore(n1, n2);
    const substrScore = n1.includes(n2) || n2.includes(n1) ? 0.9 : 0;

    return Math.max(levenScore, tokenScore, substrScore);
  }

  // ---------------------------------------------------------------------------
  // COLOR SIMILARITY
  // Fixed COLORS list → exact match is the norm
  // ---------------------------------------------------------------------------
  calculateColorSimilarity(color1, color2) {
    if (!color1 || !color2) return 0;

    if (color1 === color2) return 1;

    const ambiguous = ["Multi-colored", "Other"];

    // Both ambiguous → small partial credit
    if (ambiguous.includes(color1) && ambiguous.includes(color2)) return 0.4;

    // One side is "Other" → finder may not know exact color
    if (color1 === "Other" || color2 === "Other") return 0.2;

    return 0; // Different specific colors = definite no match
  }

  // ---------------------------------------------------------------------------
  // DATE: ±3 DAYS WINDOW (hard gate)
  // ---------------------------------------------------------------------------
  checkDateProximity(dateLost, dateFound) {
    if (!dateLost || !dateFound) return 0;

    const lost  = new Date(dateLost);
    const found = new Date(dateFound);

    lost.setHours(0, 0, 0, 0);
    found.setHours(0, 0, 0, 0);

    const diffDays = Math.abs((found - lost) / (1000 * 60 * 60 * 24));

    if (diffDays > 3) return 0; // Hard cutoff

    // Same day = 1.0, day 3 = 0.33
    return Math.round((1 - diffDays / 3) * 100) / 100;
  }

  // ---------------------------------------------------------------------------
  // PLACE SIMILARITY
  // Follows "Block X - Area" pattern from CAMPUS_LOCATIONS
  // ---------------------------------------------------------------------------
  calculatePlaceSimilarity(place1, place2) {
    if (!place1 || !place2) return 0;

    const p1 = place1.toLowerCase().trim();
    const p2 = place2.toLowerCase().trim();

    if (p1 === p2) return 1; // Exact location

    // Same block, different area → partial credit
    const block1 = p1.split(" - ")[0];
    const block2 = p2.split(" - ")[0];
    if (block1 === block2 && block1 !== "") return 0.5;

    // Fuzzy fallback for general/sports areas
    return this.levenshteinSimilarity(p1, p2) * 0.4;
  }

  // ---------------------------------------------------------------------------
  // BRAND SIMILARITY (free text, optional)
  // ---------------------------------------------------------------------------
  calculateBrandSimilarity(brand1, brand2) {
    if (!brand1 || !brand2) return 0;
    return this.levenshteinSimilarity(
      brand1.toLowerCase().trim(),
      brand2.toLowerCase().trim()
    );
  }

  // ---------------------------------------------------------------------------
  // CONDITION BONUS (+3 pts if match, 0 penalty if not)
  // Never a gate — finder is guessing, owner knows exactly
  // ---------------------------------------------------------------------------
  calculateConditionBonus(condition1, condition2) {
    if (!condition1 || !condition2) return 0;
    return condition1 === condition2 ? CONDITION_BONUS : 0;
  }

  // ---------------------------------------------------------------------------
  // MAIN MATCH SCORE
  // ---------------------------------------------------------------------------
  /**
   * GATES (all must pass or score = 0):
   *   1. Name similarity    ≥ 0.85  (same fixed dropdown)
   *   2. Color similarity   ≥ 0.85  (same fixed dropdown)
   *   3. Date within ±3 days
   *
   * BOOSTERS (improve score, no penalty if missing):
   *   - Place similarity
   *   - Brand similarity
   *   - Condition match (+3 pts flat bonus)
   *
   * NOTE: No category gate — replaced by stronger name gate since
   *       ITEM_NAME list is now the single source of truth.
   */
  calculateMatchScore(lostItem, foundItem) {

    // ── GATE 1: Name ──
    const nameSim = this.calculateNameSimilarity(lostItem.name, foundItem.name);
    if (nameSim < 0.85) return 0;

    // ── GATE 2: Color ──
    const colorSim = this.calculateColorSimilarity(lostItem.color, foundItem.color);
    if (colorSim < 0.85) return 0;

    // ── GATE 3: Date ±3 days ──
    const dateScore = this.checkDateProximity(lostItem.dateLost, foundItem.dateFound);
    if (dateScore === 0) return 0;

    // ── All gates passed → calculate weighted score ──
    let totalScore  = 0;
    let totalWeight = 0;

    // Name (45%)
    totalScore  += nameSim * WEIGHTS.name;
    totalWeight += WEIGHTS.name;

    // Color (30%)
    totalScore  += colorSim * WEIGHTS.color;
    totalWeight += WEIGHTS.color;

    // Date (10%)
    totalScore  += dateScore * WEIGHTS.date;
    totalWeight += WEIGHTS.date;

    // Place (10%) — only when both sides provided
    if (lostItem.placeLost && foundItem.placeFound) {
      const placeSim = this.calculatePlaceSimilarity(
        lostItem.placeLost,
        foundItem.placeFound
      );
      totalScore  += placeSim * WEIGHTS.place;
      totalWeight += WEIGHTS.place;
    }

    // Brand (5%) — only when both sides provided
    if (lostItem.brand && foundItem.brand) {
      const brandSim = this.calculateBrandSimilarity(lostItem.brand, foundItem.brand);
      totalScore  += brandSim * WEIGHTS.brand;
      totalWeight += WEIGHTS.brand;
    }

    // Normalize to 0–100
    let matchScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    // Condition bonus — flat +3 pts, capped inside final score
    matchScore += this.calculateConditionBonus(
      lostItem.condition,
      foundItem.condition
    ) * 100;

    return Math.min(Math.round(matchScore), 100);
  }

  // ---------------------------------------------------------------------------
  // FIND MATCHES FOR A LOST ITEM
  // ---------------------------------------------------------------------------
  async findMatchesForLostItem(lostItemId, threshold = 60) {
    const lostItem = await LostItem.findById(lostItemId);
    if (!lostItem) return [];

    // DB-level pre-filter: exact name + color + active status
    // This narrows the scan drastically before JS-level scoring
    const foundItems = await FoundItem.find({
      isActive: true,
      status: "found",
      name: lostItem.name,    // exact name match at DB level (fixed list)
      color: lostItem.color,  // exact color match at DB level (fixed list)
    }).populate("adminId", "name department");

    const matches    = [];
    const matchedIds = [];

    for (const foundItem of foundItems) {
      const matchScore = this.calculateMatchScore(lostItem, foundItem);

      if (matchScore >= threshold) {
        matches.push({
          foundItem,
          matchScore,
          matchDetails: this.getMatchDetails(lostItem, foundItem),
        });
        matchedIds.push(foundItem._id);
      }
    }

    // Atomic DB sync
    if (matchedIds.length > 0) {
      const session = await LostItem.startSession();
      try {
        await session.withTransaction(async () => {
          await LostItem.findByIdAndUpdate(
            lostItemId,
            { $addToSet: { matchedFoundItemIds: { $each: matchedIds } } },
            { session }
          );
          await FoundItem.updateMany(
            { _id: { $in: matchedIds } },
            { $addToSet: { matchedLostItemIds: lostItemId } },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ---------------------------------------------------------------------------
  // FIND MATCHES FOR A FOUND ITEM
  // ---------------------------------------------------------------------------
  async findMatchesForFoundItem(foundItemId, threshold = 60) {
    const foundItem = await FoundItem.findById(foundItemId);
    if (!foundItem) return [];

    // DB-level pre-filter: exact name + color
    const lostItems = await LostItem.find({
      isActive: true,
      status: ITEM_STATUS.PENDING,
      name: foundItem.name,    // exact name match at DB level
      color: foundItem.color,  // exact color match at DB level
    }).populate("userId", "name email");

    const matches    = [];
    const matchedIds = [];

    for (const lostItem of lostItems) {
      const matchScore = this.calculateMatchScore(lostItem, foundItem);

      if (matchScore >= threshold) {
        matches.push({
          lostItem,
          matchScore,
          matchDetails: this.getMatchDetails(lostItem, foundItem),
        });
        matchedIds.push(lostItem._id);
      }
    }

    // Atomic DB sync
    if (matchedIds.length > 0) {
      const session = await FoundItem.startSession();
      try {
        await session.withTransaction(async () => {
          await FoundItem.findByIdAndUpdate(
            foundItemId,
            { $addToSet: { matchedLostItemIds: { $each: matchedIds } } },
            { session }
          );
          await LostItem.updateMany(
            { _id: { $in: matchedIds } },
            { $addToSet: { matchedFoundItemIds: foundItemId } },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ---------------------------------------------------------------------------
  // MATCH DETAILS (for UI breakdown display)
  // ---------------------------------------------------------------------------
  getMatchDetails(lostItem, foundItem) {
    const dateScore = this.checkDateProximity(lostItem.dateLost, foundItem.dateFound);
    const diffDays  = this.getDayDiff(lostItem.dateLost, foundItem.dateFound);

    return {
      nameMatch: {
        score:    Math.round(this.calculateNameSimilarity(lostItem.name, foundItem.name) * 100),
        lostValue:  lostItem.name,
        foundValue: foundItem.name,
        isExact:  lostItem.name === foundItem.name,
      },
      colorMatch: {
        score:    Math.round(this.calculateColorSimilarity(lostItem.color, foundItem.color) * 100),
        lostValue:  lostItem.color,
        foundValue: foundItem.color,
        isExact:  lostItem.color === foundItem.color,
      },
      dateMatch: {
        score:        Math.round(dateScore * 100),
        dateLost:     lostItem.dateLost,
        dateFound:    foundItem.dateFound,
        diffDays,
        withinWindow: diffDays <= 3,
      },
      placeMatch: {
        score: Math.round(
          this.calculatePlaceSimilarity(lostItem.placeLost, foundItem.placeFound) * 100
        ),
        lostValue:  lostItem.placeLost,
        foundValue: foundItem.placeFound,
      },
      brandMatch:
        lostItem.brand && foundItem.brand
          ? {
              score:      Math.round(this.calculateBrandSimilarity(lostItem.brand, foundItem.brand) * 100),
              lostValue:  lostItem.brand,
              foundValue: foundItem.brand,
            }
          : null,
      conditionMatch: {
        lostValue:  lostItem.condition,
        foundValue: foundItem.condition,
        matched:    lostItem.condition === foundItem.condition,
        bonus:      lostItem.condition === foundItem.condition ? "+3 pts" : "0",
      },
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  levenshteinSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    if (longer.length === 0) return 1;
    return (longer.length - this.levenshteinDistance(str1, str2)) / longer.length;
  }

  tokenOverlapScore(str1, str2) {
    const tokens1 = str1.split(/\s+/);
    const tokens2 = str2.split(/\s+/);
    const overlap = tokens1.filter((t) => tokens2.includes(t)).length;
    return overlap / Math.min(tokens1.length, tokens2.length);
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        matrix[i][j] =
          str2[i - 1] === str1[j - 1]
            ? matrix[i - 1][j - 1]
            : Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
      }
    }
    return matrix[str2.length][str1.length];
  }

  getDayDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
  }
}

export default new MatchingService();