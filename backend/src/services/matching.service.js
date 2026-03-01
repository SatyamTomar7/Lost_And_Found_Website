import { LostItem } from "../models/LostItem.model.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { ITEM_STATUS } from "../constants.js";
class MatchingService {
  constructor() {
    // Weights for different matching criteria
    this.weights = {
      name: 0.3,
      category: 0.25,
      color: 0.2,
      brand: 0.15,
      place: 0.1,
    };
  }

  // Calculate similarity between two strings using Levenshtein distance
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    if (str1 === str2) return 1;

    const longer = str1.length > str2.length ? str1 : str2;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return (longer.length - distance) / longer.length;
  }

  // Levenshtein distance algorithm
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Check if dates are within reasonable proximity (7 days)
  checkDateProximity(dateLost, dateFound) {
    const lostDate = new Date(dateLost);
    const foundDate = new Date(dateFound);
    const diffTime = Math.abs(foundDate - lostDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 7 ? Math.max(0, 1 - diffDays / 7) : 0;
  }

  // Calculate match score between lost and found item
  calculateMatchScore(lostItem, foundItem) {
    let totalScore = 0;
    let totalWeight = 0;

    // Name similarity
    const nameSimilarity = this.calculateStringSimilarity(
      lostItem.name,
      foundItem.name
    );
    totalScore += nameSimilarity * this.weights.name;
    totalWeight += this.weights.name;

    // Category match (exact match required)
    if (lostItem.category === foundItem.category) {
      totalScore += this.weights.category;
    }
    totalWeight += this.weights.category;

    // Color match (exact match required)
    if (lostItem.color === foundItem.color) {
      totalScore += this.weights.color;
    }
    totalWeight += this.weights.color;

    // Brand similarity (if both have brands)
    if (lostItem.brand && foundItem.brand) {
      const brandSimilarity = this.calculateStringSimilarity(
        lostItem.brand,
        foundItem.brand
      );
      totalScore += brandSimilarity * this.weights.brand;
    }
    totalWeight += this.weights.brand;

    // Place similarity
    const placeSimilarity = this.calculateStringSimilarity(
      lostItem.placeLost,
      foundItem.placeFound
    );
    totalScore += placeSimilarity * this.weights.place;
    totalWeight += this.weights.place;

    // Date proximity bonus
    const dateProximity = this.checkDateProximity(
      lostItem.dateLost,
      foundItem.dateFound
    );
    if (dateProximity > 0) {
      totalScore += dateProximity * 0.1; // 10% bonus for date proximity
    }

    // Calculate final score as percentage
    const matchScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    return Math.round(matchScore);
  }

  // Find potential matches for a lost item
  // async findMatchesForLostItem(lostItemId, threshold = 60) {
  //   try {
  //     const lostItem = await LostItem.findById(lostItemId);
  //     if (!lostItem) return [];

  //     const foundItems = await FoundItem.find({
  //       isActive: true,
  //       status: "found",
  //     }).populate("adminId", "name department");

  //     const matches = [];

  //     for (const foundItem of foundItems) {
  //       const matchScore = this.calculateMatchScore(lostItem, foundItem);

  //       if (matchScore >= threshold) {
  //         matches.push({
  //           foundItem,
  //           matchScore,
  //           matchDetails: this.getMatchDetails(lostItem, foundItem),
  //         });
  //       }
  //     }

  //     matches.sort((a, b) => b.matchScore - a.matchScore);

  //     return matches;
  //   } catch (error) {
  //     console.error("Error finding matches for lost item:", error);
  //     return [];
  //   }
  // }

  async findMatchesForLostItem(lostItemId, threshold = 60) {
    try {
      const lostItem = await LostItem.findById(lostItemId);
      if (!lostItem) return [];

      // 1. Optimization: Filter by category early to reduce the loop size
      const foundItems = await FoundItem.find({
        isActive: true,
        status: "found",
        category: lostItem.category, // Performance boost: only compare same categories
      }).populate("adminId", "name department");

      const matches = [];
      const matchedIds = [];

      for (const foundItem of foundItems) {
        const matchScore = this.calculateMatchScore(lostItem, foundItem);

        if (matchScore >= threshold) {
          matches.push({
            foundItem,
            matchScore,
            matchDetails: this.getMatchDetails(lostItem, foundItem),
          });

          // Collect IDs for database sync
          matchedIds.push(foundItem._id);
        }
      }

      // 2. DATABASE SYNC: Update both sides so the UI stays consistent
      if (matchedIds.length > 0) {
        // Add found item IDs to the Lost Item record
        await LostItem.findByIdAndUpdate(lostItemId, {
          $addToSet: { matchedFoundItemIds: { $each: matchedIds } },
        });

        // Add this Lost Item ID to all matching Found Item records
        await FoundItem.updateMany(
          { _id: { $in: matchedIds } },
          { $addToSet: { matchedLostItemIds: lostItemId } }
        );
      }

      // Sort by highest score first
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error("Error finding matches for lost item:", error);
      return [];
    }
  }

  // Find potential matches for a found item
  async findMatchesForFoundItem(foundItemId, threshold = 60) {
    try {
      const foundItem = await FoundItem.findById(foundItemId);
      if (!foundItem) return [];

      // 1. Potential candidates dhoondein (Category match hona compulsory rakhein performance ke liye)
      const lostItems = await LostItem.find({
        isActive: true,
        status: ITEM_STATUS.PENDING,
        category: foundItem.category, // Filter early for performance
      }).populate("userId", "name email");

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

          // ID collect karein sync ke liye
          matchedIds.push(lostItem._id);
        }
      }

      // 2. DATABASE SYNC: Dono sides update karein
      if (matchedIds.length > 0) {
        // Found Item mein saare Lost Item IDs push karein ($addToSet avoids duplicates)
        await FoundItem.findByIdAndUpdate(foundItemId, {
          $addToSet: { matchedLostItemIds: { $each: matchedIds } },
        });

        // Har ek Lost Item mein ye Found Item ID push karein
        await LostItem.updateMany(
          { _id: { $in: matchedIds } },
          { $addToSet: { matchedFoundItemIds: foundItemId } }
        );
      }

      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error("Error finding matches:", error);
      return [];
    }
  }

  // Get detailed match information
  getMatchDetails(lostItem, foundItem) {
    return {
      nameMatch:
        this.calculateStringSimilarity(lostItem.name, foundItem.name) * 100,
      categoryMatch: lostItem.category === foundItem.category,
      colorMatch: lostItem.color === foundItem.color,
      brandMatch:
        lostItem.brand && foundItem.brand
          ? this.calculateStringSimilarity(lostItem.brand, foundItem.brand) *
            100
          : null,
      placeMatch:
        this.calculateStringSimilarity(
          lostItem.placeLost,
          foundItem.placeFound
        ) * 100,
      dateProximity:
        this.checkDateProximity(lostItem.dateLost, foundItem.dateFound) * 100,
    };
  }
}

export default new MatchingService();
