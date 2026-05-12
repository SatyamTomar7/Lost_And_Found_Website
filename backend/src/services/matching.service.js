import { LostItem } from "../models/LostItem.model.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { ITEM_STATUS, COMMON_LOCATIONS } from "../constants.js";
import mongoose from "mongoose";

/**
 * Weights are used to determine the importance of each matching factor.
 * Gates (Name, Color, Date) must pass a minimum threshold before
 * boosters (Place, Brand, Condition) are applied.
 */
const WEIGHTS = Object.freeze({
  name: 0.45,  // GATE + highest weight (fixed dropdown = reliable)
  color: 0.3,  // GATE + second highest (fixed dropdown = reliable)
  date: 0.1,   // GATE + booster (±7 days window)
  place: 0.1,  // booster only
  brand: 0.05, // booster only (optional field)
});

const AMBIGUOUS_COLORS = Object.freeze(["Multi-colored", "Other"]);
const CONDITION_BONUS_POINTS = 3; // Flat points added to final 0-100 score

// ---------------------------------------------------------------------------
// LOCATION SCOPE HELPERS
// ---------------------------------------------------------------------------

/**
 * Extract the block prefix from a campus location string.
 * "Block A - Library"  → "Block A"
 * "Main Ground"        → null  (common location, no block)
 */
const extractBlockFromPlace = (place) => {
  if (!place) return null;
  const match = place.match(/^(Block [A-Z])\s*-/i);
  return match ? match[1] : null;
};

/**
 * Build the placeLost MongoDB filter for a found item based on its scope.
 *
 * Admin found item  → match lost items from the SAME block OR any common location.
 * Security found item → no restriction (match everything).
 *
 * @param {object} foundItem  - the FoundItem document
 * @returns {object|null}     - a Mongo query fragment, or null (no filter)
 */
const buildPlaceLostFilter = (foundItem) => {
  if (foundItem.handledBy === "security") {
    return null; // Security items match globally — no location restriction
  }

  // Admin item: derive block from placeFound
  const block = extractBlockFromPlace(foundItem.placeFound);

  if (block) {
    // Match same-block locations OR any common location
    return {
      $or: [
        { placeLost: { $regex: new RegExp(`^${block}\\s*-`, "i") } },
        { placeLost: { $in: COMMON_LOCATIONS } },
      ],
    };
  }

  // Found item itself is at a common location (no block prefix)
  // → only match lost items that are also at common locations
  return { placeLost: { $in: COMMON_LOCATIONS } };
};

// ---------------------------------------------------------------------------

class MatchingService {
  // ---------------------------------------------------------------------------
  // NAME SIMILARITY
  // Fixed ITEM_NAME list → exact match is the norm, fuzzy only for "Other"
  // ---------------------------------------------------------------------------
  calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;

    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    if (n1 === n2) return 1;

    const levenScore = this.levenshteinSimilarity(n1, n2);
    const tokenScore = this.tokenOverlapScore(n1, n2);
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

    if (AMBIGUOUS_COLORS.includes(color1) && AMBIGUOUS_COLORS.includes(color2))
      return 0.4;

    if (AMBIGUOUS_COLORS.includes(color1) || AMBIGUOUS_COLORS.includes(color2))
      return 0.2;

    return 0;
  }

  // ---------------------------------------------------------------------------
  // DATE: ±7 DAYS WINDOW (hard gate)
  // ---------------------------------------------------------------------------
  checkDateProximity(dateLost, dateFound) {
    if (!dateLost || !dateFound) return 0;

    const diffDays = this.getDayDiff(dateLost, dateFound);
    if (diffDays > 7) return 0;

    // Linear decay: same day = 1.0, day 7 ≈ 0.13
    return Math.round((1 - diffDays / 8) * 100) / 100;
  }

  // ---------------------------------------------------------------------------
  // PLACE SIMILARITY
  // Follows "Block X - Area" pattern from CAMPUS_LOCATIONS
  // ---------------------------------------------------------------------------
  calculatePlaceSimilarity(place1, place2) {
    if (!place1 || !place2) return 0;

    const p1 = place1.trim();
    const p2 = place2.trim();

    if (p1 === p2) return 1;

    const isBlockLocation = (p) => /^Block [A-Z] - /i.test(p);

    const p1IsBlock = isBlockLocation(p1);
    const p2IsBlock = isBlockLocation(p2);

    if (p1IsBlock && p2IsBlock) {
      return extractBlockFromPlace(p1) === extractBlockFromPlace(p2) ? 0.7 : 0;
    }

    if (p1 === "Anywhere" || p2 === "Anywhere") return 0.5;

    return 0.6; // both are common/general areas
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
  // MAIN MATCH SCORE
  // ---------------------------------------------------------------------------
  /**
   * GATES (all must pass or score = 0):
   *   1. Name similarity  ≥ 0.85
   *   2. Color similarity ≥ 0.85 (or ≥ 0.15 if either side is ambiguous)
   *   3. Date within ±7 days
   *
   * BOOSTERS (improve score, no penalty if missing):
   *   - Place similarity
   *   - Brand similarity
   *   - Condition match (+3 pts flat bonus)
   */
  calculateMatchScore(lostItem, foundItem) {
    try {
      // ── GATE 1: Name ──
      const nameSim = this.calculateNameSimilarity(lostItem.name, foundItem.name);
      if (nameSim < 0.85) return 0;

      // ── GATE 2: Color ──
      const colorSim = this.calculateColorSimilarity(lostItem.color, foundItem.color);
      const eitherAmbiguous =
        AMBIGUOUS_COLORS.includes(lostItem.color) ||
        AMBIGUOUS_COLORS.includes(foundItem.color);
      const colorGate = eitherAmbiguous ? 0.15 : 0.85;
      if (colorSim < colorGate) return 0;

      // ── GATE 3: Date ±7 days ──
      const dateScore = this.checkDateProximity(lostItem.dateLost, foundItem.dateFound);
      if (dateScore === 0) return 0;

      // ── All gates passed → calculate weighted score ──
      let totalScore = 0;
      let totalWeight = 0;

      const addMetric = (score, weight) => {
        totalScore += score * weight;
        totalWeight += weight;
      };

      addMetric(nameSim, WEIGHTS.name);
      addMetric(colorSim, WEIGHTS.color);
      addMetric(dateScore, WEIGHTS.date);

      if (lostItem.placeLost && foundItem.placeFound) {
        addMetric(
          this.calculatePlaceSimilarity(lostItem.placeLost, foundItem.placeFound),
          WEIGHTS.place
        );
      }

      if (lostItem.brand && foundItem.brand) {
        addMetric(
          this.calculateBrandSimilarity(lostItem.brand, foundItem.brand),
          WEIGHTS.brand
        );
      }

      let matchScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

      if (
        lostItem.condition &&
        foundItem.condition &&
        lostItem.condition === foundItem.condition
      ) {
        matchScore += CONDITION_BONUS_POINTS;
      }

      return Math.min(Math.round(matchScore), 100);
    } catch (err) {
      console.error("Match Score Calculation Error:", err);
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // FIND MATCHES FOR A LOST ITEM
  // No scope restriction here — a student's lost item should see ALL eligible
  // found items regardless of which admin/security added them. Scope is enforced
  // on the found-item side when staff run matching.
  // ---------------------------------------------------------------------------
async findMatchesForLostItem(lostItemId, threshold = 60) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const lostItem = await LostItem.findById(lostItemId).session(session);

    if (
      !lostItem ||
      !lostItem.isActive ||
      lostItem.status !== ITEM_STATUS.PENDING
    ) {
      throw new Error(
        "Lost item not found, inactive, or not in pending state"
      );
    }

    const colorFilter = {
      $in: [lostItem.color, ...AMBIGUOUS_COLORS],
    };

    const minDate = new Date(lostItem.dateLost);
    minDate.setDate(minDate.getDate() - 7);

    const maxDate = new Date(lostItem.dateLost);
    maxDate.setDate(maxDate.getDate() + 7);

    // ---------------------------------------------------
    // LOCATION FILTER LOGIC
    //
    // If lost item belongs to a block:
    //   → match same block + common places
    //
    // If lost item belongs to a common place:
    //   → search ALL found items
    // ---------------------------------------------------

    const lostItemBlock = extractBlockFromPlace(
      lostItem.placeLost
    );

    const placeFoundFilter = lostItemBlock
      ? {
          $or: [
            {
              placeFound: {
                $regex: new RegExp(
                  `^${lostItemBlock}\\s*-`,
                  "i"
                ),
              },
            },
            {
              placeFound: {
                $in: COMMON_LOCATIONS,
              },
            },
          ],
        }
      : {};

    const foundItems = await FoundItem.find({
      isActive: true,
      status: {
        $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED],
      },
      name: lostItem.name,
      color: colorFilter,
      dateFound: {
        $gte: minDate,
        $lte: maxDate,
      },
      ...placeFoundFilter,
    })
      .populate("createdBy", "name role block")
      .session(session);

    const matches = [];
    const matchedIds = [];

    for (const foundItem of foundItems) {
      const matchScore = this.calculateMatchScore(
        lostItem,
        foundItem
      );

      if (matchScore >= threshold) {
        matches.push({
          foundItem,
          matchScore,
          matchDetails: this.getMatchDetails(
            lostItem,
            foundItem
          ),
        });

        matchedIds.push(foundItem._id);
      }
    }

    if (matchedIds.length > 0) {
      await LostItem.findByIdAndUpdate(
        lostItemId,
        {
          $addToSet: {
            matchedFoundItemIds: {
              $each: matchedIds,
            },
          },
          $set: {
            status: ITEM_STATUS.MATCHED,
          },
        },
        { session }
      );

      await FoundItem.updateMany(
        {
          _id: {
            $in: matchedIds,
          },
        },
        {
          $addToSet: {
            matchedLostItemIds: {
              $each: [lostItemId],
            },
          },
          $set: {
            status: ITEM_STATUS.MATCHED,
          },
        },
        { session }
      );
    }

    await session.commitTransaction();

    return matches.sort(
      (a, b) => b.matchScore - a.matchScore
    );
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Transaction Aborted in findMatchesForLostItem:",
      error.message
    );

    throw error;
  } finally {
    session.endSession();
  }
}

  // ---------------------------------------------------------------------------
  // FIND MATCHES FOR A FOUND ITEM  (location-scoped)
  //
  // Admin found item  → placeLost must be same block OR a common location
  // Security found item → no placeLost restriction (global university match)
  // ---------------------------------------------------------------------------
  async findMatchesForFoundItem(foundItemId, threshold = 60) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const foundItem = await FoundItem.findById(foundItemId).session(session);
      if (
        !foundItem ||
        !foundItem.isActive ||
        ![ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED].includes(foundItem.status)
      ) {
        throw new Error("Found item not found, inactive, or not available for matching");
      }

      const colorFilter = { $in: [foundItem.color, ...AMBIGUOUS_COLORS] };

      const minDate = new Date(foundItem.dateFound);
      minDate.setDate(minDate.getDate() - 7);
      const maxDate = new Date(foundItem.dateFound);
      maxDate.setDate(maxDate.getDate() + 7);

      // ── Location scope filter (the core of this feature) ──
      const placeLostFilter = buildPlaceLostFilter(foundItem);

      const lostItems = await LostItem.find({
        isActive: true,
        status: { $in: [ITEM_STATUS.PENDING, ITEM_STATUS.MATCHED] },
        name: foundItem.name,
        color: colorFilter,
        dateLost: { $gte: minDate, $lte: maxDate },
        ...(placeLostFilter ?? {}), // spread nothing for security items
      })
        .populate("userId", "name email enrollmentNumber phoneNumber course branch semester block")
        .session(session);

      const matches = [];
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

      if (matchedIds.length > 0) {
        await FoundItem.findByIdAndUpdate(
          foundItemId,
          {
            $addToSet: { matchedLostItemIds: { $each: matchedIds } },
            $set: { status: ITEM_STATUS.MATCHED },
          },
          { session }
        );
        await LostItem.updateMany(
          { _id: { $in: matchedIds } },
          {
            $addToSet: { matchedFoundItemIds: { $each: [foundItemId] } },
            $set: { status: ITEM_STATUS.MATCHED },
          },
          { session }
        );
      }

      await session.commitTransaction();
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      await session.abortTransaction();
      console.error("Transaction Aborted in findMatchesForFoundItem:", error.message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------------------------------
  // RE-MATCH AFTER TRANSFER TO SECURITY
  //
  // Called when handledBy changes from "admin" → "security".
  // 1. Clears all previous matches from the found item
  // 2. Removes this found item from every previously-matched lost item
  // 3. Resets statuses back to their pre-match states
  // 4. Runs a fresh global match (no location filter = security scope)
  // Returns the new matches array so the caller can send notifications.
  // ---------------------------------------------------------------------------
  async rematchAfterTransferToSecurity(foundItemId, threshold = 60) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const foundItem = await FoundItem.findById(foundItemId).session(session);
      if (!foundItem || !foundItem.isActive) {
        throw new Error("Found item not found or inactive");
      }
      if (foundItem.handledBy !== "security") {
        throw new Error(
          "rematchAfterTransferToSecurity called but handledBy is not 'security'"
        );
      }

      const previouslyMatchedLostIds = foundItem.matchedLostItemIds ?? [];

      // ── Step 1: Clear the found item's match state ──
      await FoundItem.findByIdAndUpdate(
        foundItemId,
        {
          $set: {
            matchedLostItemIds: [],
            status: ITEM_STATUS.FOUND, // reset to base found state
          },
        },
        { session }
      );

      // ── Step 2: Remove this found item from every previously-matched lost item ──
      if (previouslyMatchedLostIds.length > 0) {
        await LostItem.updateMany(
          { _id: { $in: previouslyMatchedLostIds } },
          {
            $pull: { matchedFoundItemIds: foundItem._id },
          },
          { session }
        );

        // For each previously-matched lost item, if it now has no remaining
        // matched found items, revert it back to PENDING
        const prevLostItems = await LostItem.find(
          { _id: { $in: previouslyMatchedLostIds } },
          { matchedFoundItemIds: 1, status: 1 }
        ).session(session);

for (const lostItem of prevLostItems) {
  await reconcileLostItemStatus(
    lostItem._id,
    session
  );
}
      }

      await session.commitTransaction();
    

      // ── Step 3: Run fresh global match (security scope = no location filter) ──
      // findMatchesForFoundItem now opens its own session, which is correct
      // since handledBy === "security" so buildPlaceLostFilter returns null
      const newMatches = await this.findMatchesForFoundItem(foundItemId, threshold);
      return newMatches;
    } catch (error) {
      await session.abortTransaction();
      console.error("Transaction Aborted in rematchAfterTransferToSecurity:", error.message);
      throw error;
    }
    finally {
   session.endSession();
}
  }

  // ---------------------------------------------------------------------------
  // MATCH DETAILS (for UI breakdown display)
  // ---------------------------------------------------------------------------
  getMatchDetails(lostItem, foundItem) {
    const dateScore = this.checkDateProximity(lostItem.dateLost, foundItem.dateFound);
    const diffDays = this.getDayDiff(lostItem.dateLost, foundItem.dateFound);

    return {
      nameMatch: {
        score: Math.round(
          this.calculateNameSimilarity(lostItem.name, foundItem.name) * 100
        ),
        lostValue: lostItem.name,
        foundValue: foundItem.name,
        isExact: lostItem.name === foundItem.name,
      },
      colorMatch: {
        score: Math.round(
          this.calculateColorSimilarity(lostItem.color, foundItem.color) * 100
        ),
        lostValue: lostItem.color,
        foundValue: foundItem.color,
        isExact: lostItem.color === foundItem.color,
      },
      dateMatch: {
        score: Math.round(dateScore * 100),
        dateLost: lostItem.dateLost,
        dateFound: foundItem.dateFound,
        diffDays,
        withinWindow: diffDays <= 7,
      },
      placeMatch: {
        score: Math.round(
          this.calculatePlaceSimilarity(lostItem.placeLost, foundItem.placeFound) * 100
        ),
        lostValue: lostItem.placeLost,
        foundValue: foundItem.placeFound,
      },
      brandMatch:
        lostItem.brand && foundItem.brand
          ? {
              score: Math.round(
                this.calculateBrandSimilarity(lostItem.brand, foundItem.brand) * 100
              ),
              lostValue: lostItem.brand,
              foundValue: foundItem.brand,
            }
          : null,
      conditionMatch: {
        lostValue: lostItem.condition,
        foundValue: foundItem.condition,
        matched: lostItem.condition === foundItem.condition,
        bonus: lostItem.condition === foundItem.condition ? "+3 pts" : "0",
      },
      scopeInfo: {
        handledBy: foundItem.handledBy,
        matchScope:
          foundItem.handledBy === "security"
            ? "global"
            : `block-local (${extractBlockFromPlace(foundItem.placeFound) ?? "common"})`,
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