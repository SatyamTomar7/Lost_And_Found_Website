import mongoose from "mongoose";
import { COMMON_LOCATIONS, ITEM_STATUS } from "../../config/constants.js";
import { FoundItem } from "../found-items/FoundItem.model.js";
import { LostItem } from "../lost-items/LostItem.model.js";

/**
 * Weights are used to determine the importance of each matching factor.
 * Name, color, date, and place act as gates. Brand and condition are boosters.
 */
const WEIGHTS = Object.freeze({
  name: 0.45,
  color: 0.3,
  date: 0.1,
  place: 0.1,
  brand: 0.05,
});

const AMBIGUOUS_COLORS = Object.freeze(["Multi-colored", "Other"]);
const CONDITION_BONUS_POINTS = 3;
const ANYWHERE_LOCATION = "Unknown";
const WEAK_PLACE_SCORE = 0.1;
const WEAK_PLACE_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// LOCATION HELPERS
// ---------------------------------------------------------------------------

const extractBlockFromPlace = (place) => {
  if (!place) return null;
  const match = place.match(/^(Block [A-Z])\s*-/i);
  return match ? match[1] : null;
};

const isAnywherePlace = (place) => place?.trim() === ANYWHERE_LOCATION;

const isCommonPlace = (place) => {
  if (!place) return false;
  return COMMON_LOCATIONS.includes(place.trim());
};

const isGlobalScopePlace = (place) =>
  isAnywherePlace(place) || (isCommonPlace(place) && !extractBlockFromPlace(place));

const buildSameBlockOrCommonFilter = (fieldName, block) => ({
  $or: [
    { [fieldName]: { $regex: new RegExp(`^${block}\\s*-`, "i") } },
    { [fieldName]: { $in: COMMON_LOCATIONS } },
  ],
});

const buildPlaceLostFilter = (foundItem) => {
  const block = extractBlockFromPlace(foundItem.placeFound);
  if (!block || isGlobalScopePlace(foundItem.placeFound)) return null;
  return buildSameBlockOrCommonFilter("placeLost", block);
};

const buildPlaceFoundFilter = (lostItem) => {
  const block = extractBlockFromPlace(lostItem.placeLost);
  if (!block || isGlobalScopePlace(lostItem.placeLost)) return null;
  return buildSameBlockOrCommonFilter("placeFound", block);
};

class MatchingService {
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

  calculateColorSimilarity(color1, color2) {
    if (!color1 || !color2) return 0;
    if (color1 === color2) return 1;

    if (AMBIGUOUS_COLORS.includes(color1) && AMBIGUOUS_COLORS.includes(color2)) {
      return 0.4;
    }

    if (AMBIGUOUS_COLORS.includes(color1) || AMBIGUOUS_COLORS.includes(color2)) {
      return 0.2;
    }

    return 0;
  }

  checkDateProximity(dateLost, dateFound) {
    if (!dateLost || !dateFound) return 0;

    const diffDays = this.getDayDiff(dateLost, dateFound);
    if (diffDays > 7) return 0;

    return Math.round((1 - diffDays / 8) * 100) / 100;
  }

  calculatePlaceSimilarity(place1, place2) {
    if (!place1 || !place2) return 0;

    const p1 = place1.trim();
    const p2 = place2.trim();

    if (p1 === p2) return 1;
    if (isAnywherePlace(p1) || isAnywherePlace(p2)) return WEAK_PLACE_SCORE;

    const p1Block = extractBlockFromPlace(p1);
    const p2Block = extractBlockFromPlace(p2);
    const p1IsCommon = isCommonPlace(p1) && !p1Block;
    const p2IsCommon = isCommonPlace(p2) && !p2Block;

    if (p1Block && p2Block) {
      return p1Block === p2Block ? 0.6 : 0;
    }

    if ((p1Block && p2IsCommon) || (p2Block && p1IsCommon)) {
      return WEAK_PLACE_SCORE;
    }

    if (p1IsCommon && p2IsCommon) {
      return 0.2;
    }

    return 0;
  }

  calculateBrandSimilarity(brand1, brand2) {
    if (!brand1 || !brand2) return 0;
    return this.levenshteinSimilarity(
      brand1.toLowerCase().trim(),
      brand2.toLowerCase().trim()
    );
  }

  calculateMatchScore(lostItem, foundItem) {
    try {
      const nameSim = this.calculateNameSimilarity(lostItem.name, foundItem.name);
      if (nameSim < 0.85) return 0;

      const colorSim = this.calculateColorSimilarity(lostItem.color, foundItem.color);
      const eitherAmbiguous =
        AMBIGUOUS_COLORS.includes(lostItem.color) ||
        AMBIGUOUS_COLORS.includes(foundItem.color);
      const colorGate = eitherAmbiguous ? 0.15 : 0.85;
      if (colorSim < colorGate) return 0;

      const dateScore = this.checkDateProximity(lostItem.dateLost, foundItem.dateFound);
      if (dateScore === 0) return 0;

      const placeScore = this.calculatePlaceSimilarity(
        lostItem.placeLost,
        foundItem.placeFound
      );
      if (placeScore === 0) return 0;

      let totalScore = 0;
      let totalWeight = 0;

      const addMetric = (score, weight) => {
        totalScore += score * weight;
        totalWeight += weight;
      };

      addMetric(nameSim, WEIGHTS.name);
      addMetric(colorSim, WEIGHTS.color);
      addMetric(dateScore, WEIGHTS.date);
      addMetric(placeScore, WEIGHTS.place);

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

  getEffectiveThreshold(baseThreshold, lostItem, foundItem) {
    const placeScore = this.calculatePlaceSimilarity(
      lostItem.placeLost,
      foundItem.placeFound
    );

    if (placeScore === WEAK_PLACE_SCORE) {
      return Math.max(baseThreshold, WEAK_PLACE_THRESHOLD);
    }

    return baseThreshold;
  }

  getMatchScope(placeFound) {
    if (isGlobalScopePlace(placeFound)) {
      return "global";
    }

    return `block-local (${extractBlockFromPlace(placeFound) ?? "common"})`;
  }

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

      const colorFilter = { $in: [lostItem.color, ...AMBIGUOUS_COLORS] };
      const minDate = new Date(lostItem.dateLost);
      minDate.setDate(minDate.getDate() - 7);

      const maxDate = new Date(lostItem.dateLost);
      maxDate.setDate(maxDate.getDate() + 7);

      const placeFoundFilter = buildPlaceFoundFilter(lostItem);

      const foundItems = await FoundItem.find({
        isActive: true,
        status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
        name: lostItem.name,
        color: colorFilter,
        dateFound: {
          $gte: minDate,
          $lte: maxDate,
        },
        ...(placeFoundFilter ?? {}),
      })
        .populate("createdBy", "name role block")
        .session(session);

      const matches = [];
      const matchedIds = [];

      for (const foundItem of foundItems) {
        const matchScore = this.calculateMatchScore(lostItem, foundItem);
        const effectiveThreshold = this.getEffectiveThreshold(
          threshold,
          lostItem,
          foundItem
        );

        if (matchScore >= effectiveThreshold) {
          matches.push({
            foundItem,
            matchScore,
            matchDetails: this.getMatchDetails(lostItem, foundItem),
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
      return matches.sort((a, b) => b.matchScore - a.matchScore);
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
        throw new Error(
          "Found item not found, inactive, or not available for matching"
        );
      }

      const colorFilter = { $in: [foundItem.color, ...AMBIGUOUS_COLORS] };

      const minDate = new Date(foundItem.dateFound);
      minDate.setDate(minDate.getDate() - 7);
      const maxDate = new Date(foundItem.dateFound);
      maxDate.setDate(maxDate.getDate() + 7);

      const placeLostFilter = buildPlaceLostFilter(foundItem);

      const lostItems = await LostItem.find({
        isActive: true,
        status: { $in: [ITEM_STATUS.PENDING, ITEM_STATUS.MATCHED] },
        name: foundItem.name,
        color: colorFilter,
        dateLost: {
          $gte: minDate,
          $lte: maxDate,
        },
        ...(placeLostFilter ?? {}),
      })
        .populate(
          "userId",
          "name email enrollmentNumber phoneNumber course branch semester block"
        )
        .session(session);

      const matches = [];
      const matchedIds = [];

      for (const lostItem of lostItems) {
        const matchScore = this.calculateMatchScore(lostItem, foundItem);
        const effectiveThreshold = this.getEffectiveThreshold(
          threshold,
          lostItem,
          foundItem
        );

        if (matchScore >= effectiveThreshold) {
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
      console.error(
        "Transaction Aborted in findMatchesForFoundItem:",
        error.message
      );
      throw error;
    } finally {
      session.endSession();
    }
  }

  getMatchDetails(lostItem, foundItem) {
    const dateScore = this.checkDateProximity(
      lostItem.dateLost,
      foundItem.dateFound
    );
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
        matchScope: this.getMatchScope(foundItem.placeFound),
      },
    };
  }

  levenshteinSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    if (longer.length === 0) return 1;
    return (
      (longer.length - this.levenshteinDistance(str1, str2)) / longer.length
    );
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
