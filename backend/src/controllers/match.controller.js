import { FoundItem } from "../models/FoundItem.model.js";
import { LostItem } from "../models/LostItem.model.js";
import matchingService from "../services/matching.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ITEM_STATUS } from "../constants.js";
export const checkLostItemMatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const threshold = Math.min(
    100,
    Math.max(0, parseInt(req.query.threshold) || 60)
  );

  // 1. Authorized Fetch
  // We use .lean() because we don't need Mongoose methods (save, etc.)
  const lostItem = await LostItem.findById(id).lean();

  if (!lostItem) {
    throw new ApiError(404, "Lost item not found");
  }

  // 2. Strict Authorization
  const isOwner = lostItem.userId.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(
      403,
      "Access denied. You can only view matches for your own items."
    );
  }

  // 3. Find Matches
  const matches = await matchingService.findMatchesForLostItem(id, threshold);

  // 4. Structured Response
  // Note: I corrected a small bug in your original code where you mapped match.foundItem.name to the 'id' field
  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        lostItem: {
          id: lostItem._id,
          name: lostItem.name,
          category: lostItem.category,
          color: lostItem.color,
        },
        matches: matches.map((match) => ({
          foundItem: {
            id: match.foundItem._id,
            name: match.foundItem.name,
            category: match.foundItem.category,
            color: match.foundItem.color,
            department: match.foundItem.department,
            dateFound: match.foundItem.dateFound,
            placeFound: match.foundItem.placeFound,
          },
          matchScore: match.matchScore,
          matchDetails: match.matchDetails,
        })),
      },
      "Matches fetched successfully"
    )
  );
});
export const checkFoundItemMatches = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Sanitize Threshold
  const threshold = Math.min(
    100,
    Math.max(0, parseInt(req.query.threshold) || 60)
  );

  // 2. Optimized Fetch with Security
  // We fetch only the fields needed to verify ownership/department
  const foundItem = await FoundItem.findById(id).lean();

  if (!foundItem) throw new ApiError(404, "Found item not found");

  // Admin Security: Ensure admin only sees matches for their own department
  if (
    req.user.role === "admin" &&
    foundItem.department !== req.user.department
  ) {
    throw new ApiError(
      403,
      "Access denied. This item belongs to another department."
    );
  }

  // 3. Find Matches
  // We assume the service populates 'userId' for the lost items
  const matches = await matchingService.findMatchesForFoundItem(id, threshold);

  // 4. Safe Mapping Logic
  const mappedMatches = matches.map((match) => {
    const lostItem = match.lostItem || {};
    const owner = lostItem.userId || {}; // Handle case where user might be deleted

    return {
      lostItem: {
        id: lostItem._id,
        name: lostItem.name,
        category: lostItem.category,
        color: lostItem.color,
        dateLost: lostItem.dateLost,
        placeLost: lostItem.placeLost,
        user: {
          id: owner._id || "N/A",
          name: owner.name || "Unknown User",
          email: owner.email || "No Email",
        },
      },
      matchScore: match.matchScore,
      matchDetails: match.matchDetails,
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        foundItem: {
          id: foundItem._id,
          name: foundItem.name,
          category: foundItem.category,
          color: foundItem.color,
          department: foundItem.department,
        },
        matches: mappedMatches,
      },
      "Matches retrieved successfully"
    )
  );
});
export const getMatchingStats = asyncHandler(async (req, res) => {
  const department = req.user.role === "admin" ? req.user.department : null;

  const totalLostItems = await LostItem.countDocuments({
    isActive: true,
    ...(department && { placeLost: new RegExp(department, "i") }),
  });

  const totalFoundItems = await FoundItem.countDocuments({
    isActive: true,
    ...(department && { department }),
  });

  const matchedItems = await LostItem.countDocuments({
    matchedFoundItemId: { $ne: null },
    ...(department && { placeLost: new RegExp(department, "i") }),
  });

  const returnedItem = await FoundItem.countDocuments({
    status: ITEM_STATUS.RETURNED,
    ...(department && { department }),
  });

  const matchRate =
    totalLostItems > 0 ? ((matchedItems / totalLostItems) * 100).toFixed(2) : 0;
  const returnRate =
    totalFoundItems > 0
      ? ((returnedItem / totalFoundItems) * 100).toFixed(2)
      : 0;

  const categoryStats = await LostItem.aggregate([
    {
      $match: {
        isActive: true,
        ...(department && { placeLost: new RegExp(department, "i") }),
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: 1 },
        matched: {
          $sum: { $cond: [{ $ne: ["$matchedFoundItemId", null] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        category: "$_id",
        total: 1,
        matched: 1,
        matchRate: {
          $cond: [
            { $eq: ["$total", 0] },
            0,
            { $multiply: [{ $divide: ["$matched", "$total"] }, 100] },
          ],
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // ── Only fetch active, unresolved items for live matching ──────────────────
  const foundItems = await FoundItem.find({
    isActive: true,
    status: { $ne: ITEM_STATUS.RETURNED }, // exclude already returned
    ...(department && { department }),
  });

  const lostItems = await LostItem.find({
    isActive: true,
    status: { $nin: [ITEM_STATUS.COLLECTED, ITEM_STATUS.RETURNED] }, // exclude claimed
  });

  // ── Build matches ──────────────────────────────────────────────────────────
  const matches = [];

  // Batch fetch users to avoid N+1 queries
  const userIds = [...new Set(lostItems.map((l) => l.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  for (const foundItem of foundItems) {
    for (const lostItem of lostItems) {
      const matchScore = matchingService.calculateMatchScore(
        lostItem,
        foundItem
      );

      if (matchScore > 60) {
        const user = userMap[lostItem.userId.toString()];
        matches.push({
          foundItem: {
            id: foundItem._id,
            name: foundItem.name,
            category: foundItem.category,
            color: foundItem.color,
            department: foundItem.department,
            dateFound: foundItem.dateFound,
            placeFound: foundItem.placeFound,
          },
          lostItem: {
            id: lostItem._id,
            name: lostItem.name,
            category: lostItem.category,
            color: lostItem.color,
            dateLost: lostItem.dateLost,
            placeLost: lostItem.placeLost,
            description: lostItem.description,
          },
          similarity: matchScore,
          user: user || null,
        });
      }
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: {
          overview: {
            totalLostItems,
            totalFoundItems,
            matchedItems,
            returnedItem,
            matchRate: parseFloat(matchRate),
            returnRate: parseFloat(returnRate),
          },
          matches,
          categoryBreakdown: categoryStats,
          department: department || "All Department",
        },
      },
      "Matching Status fetched Successfully"
    )
  );
});
