/* The above code is a JavaScript module that defines several functions related to matching lost and
found items. Here is a summary of what each function does: */
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

  const lostItem = await LostItem.findById(id).lean();

  if (!lostItem) {
    throw new ApiError(404, "Lost item not found");
  }

  const isOwner = lostItem.userId.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(
      403,
      "Access denied. You can only view matches for your own items."
    );
  }

  const matches = await matchingService.findMatchesForLostItem(id, threshold);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        lostItem: {
          id: lostItem._id,
          name: lostItem.name,
          color: lostItem.color,
        },
        matches: matches.map((match) => ({
          foundItem: {
            id: match.foundItem._id,
            name: match.foundItem.name,
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
  const threshold = Math.min(
    100,
    Math.max(0, parseInt(req.query.threshold) || 60)
  );

  const foundItem = await FoundItem.findById(id).lean();

  if (!foundItem) throw new ApiError(404, "Found item not found");

  if (
    req.user.role === "admin" &&
    foundItem.department !== req.user.department
  ) {
    throw new ApiError(
      403,
      "Access denied. This item belongs to another department."
    );
  }

  const matches = await matchingService.findMatchesForFoundItem(id, threshold);

  const mappedMatches = matches.map((match) => {
    const lostItem = match.lostItem || {};
    const owner = lostItem.userId || {};

    return {
      lostItem: {
        id: lostItem._id,
        name: lostItem.name,
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

  const [
    totalLostItems,
    totalFoundItems,
    matchedLostCount,
    returnedCount,
    itemStats,
    foundItems,
    lostItems,
  ] = await Promise.all([
    // Total active lost items
    LostItem.countDocuments({
      isActive: true
    }),

    // Total active found items
    FoundItem.countDocuments({
      isActive: true,
      ...(department && { department }),
    }),

    // Matched lost items count — status based
    LostItem.countDocuments({
      status: ITEM_STATUS.MATCHED
    }),

    // Returned found items count
    FoundItem.countDocuments({
      status: ITEM_STATUS.RETURNED,
      ...(department && { department }),
    }),

    // Per-item breakdown
    LostItem.aggregate([
      {
        $match: {
          isActive: true
        },
      },
      {
        $group: {
          _id: "$name",
          total: { $sum: 1 },
          matched: {
            $sum: {
              $cond: [{ $eq: ["$status", ITEM_STATUS.MATCHED] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          itemName: "$_id",
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
    ]),

    // Active found items available for matching display
    FoundItem.find({
      isActive: true,
      status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
      ...(department && { department }),
    }),

    // Active lost items — both PENDING and MATCHED included for stats display
    LostItem.find({
      isActive: true,
      status: { $in: [ITEM_STATUS.PENDING, ITEM_STATUS.MATCHED] }
    }),
  ]);

  const matchRate =
    totalLostItems > 0
      ? ((matchedLostCount / totalLostItems) * 100).toFixed(2)
      : 0;

  const returnRate =
    totalFoundItems > 0
      ? ((returnedCount / totalFoundItems) * 100).toFixed(2)
      : 0;

  // Batch fetch users for all lost items in one query — avoids N+1
  const userIds = [...new Set(lostItems.map((l) => l.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  // Build matches display list using already-stored matchedFoundItemIds
  // Avoids O(n*m) loop — only crosses pairs that are actually matched
  const matches = [];

  const foundItemMap = new Map(foundItems.map((f) => [f._id.toString(), f]));
  for (const lostItem of lostItems) {
    if (
      !lostItem.matchedFoundItemIds ||
      lostItem.matchedFoundItemIds.length === 0
    )
      continue;

    const user = userMap[lostItem.userId.toString()] || null;
    for (const foundItemRef of lostItem.matchedFoundItemIds) {
      // foundItems array se match karo — avoids extra DB call
      const foundItem = foundItemMap.get(foundItemRef.toString());

      if (!foundItem) continue; // already returned/collected — skip

      matches.push({
        foundItem: {
          id: foundItem._id,
          name: foundItem.name,
          color: foundItem.color,
          department: foundItem.department,
          dateFound: foundItem.dateFound,
          placeFound: foundItem.placeFound,
        },
        lostItem: {
          id: lostItem._id,
          name: lostItem.name,
          color: lostItem.color,
          dateLost: lostItem.dateLost,
          placeLost: lostItem.placeLost,
          description: lostItem.description,
        },
        user,
        similarity: matchingService.calculateMatchScore(lostItem, foundItem),
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: {
          totalLostItems,
          totalFoundItems,
          matchedItems: matchedLostCount,
          returnedItems: returnedCount,
          matchRate: parseFloat(matchRate),
          returnRate: parseFloat(returnRate),
        },
        matches,
        itemBreakdown: itemStats,
        department: department || "All Departments",
      },
      "Matching stats fetched successfully"
    )
  );
});
