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
          images: lostItem.images,
        },
        matches: matches.map((match) => ({
          foundItem: {
            id: match.foundItem._id,
            name: match.foundItem.name,
            color: match.foundItem.color,
            block: match.foundItem.block,
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

  if (req.user.role === "admin" && foundItem.block !== req.user.block) {
    throw new ApiError(
      403,
      "Access denied. This item belongs to another block."
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
        images: lostItem.images,
        user: {
          id: owner._id || "N/A",
          name: owner.name || "Unknown User",
          email: owner.email || "No Email",

          enrollmentNumber: owner.enrollmentNumber || "N/A",
          phoneNumber: owner.phoneNumber || "N/A",

          course: owner.course || "N/A",
          branch: owner.branch || "N/A",

          semester: owner.semester || "N/A",

          block: owner.block || "N/A",
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
          block: foundItem.block,
        },
        matches: mappedMatches,
      },
      "Matches retrieved successfully"
    )
  );
});
export const getMatchingStats = asyncHandler(async (req, res) => {
  const block = req.user.role === "admin" ? req.user.block : null;

  const [
    totalLostItems,
    totalFoundItems,
    matchedLostCount,
    returnedCount,
    itemStats,
    foundItems,
    lostItems,
  ] = await Promise.all([
    // Total active lost items — NO block filter (LostItem has no block field)
    LostItem.countDocuments({
      isActive: true,
    }),

    // Total active found items
    FoundItem.countDocuments({
      isActive: true,
      ...(block && { block }),
    }),

    // Matched lost items count — NO block filter
    LostItem.countDocuments({
      status: ITEM_STATUS.MATCHED,
    }),

    // Returned found items count
    FoundItem.countDocuments({
      status: ITEM_STATUS.RETURNED,
      ...(block && { block }),
    }),

    // Per-item breakdown — NO block filter on LostItem aggregate
    LostItem.aggregate([
      {
        $match: {
          isActive: true,
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

    // Active found items — block filter stays (FoundItem HAS block field)
    FoundItem.find({
      isActive: true,
      status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
      ...(block && { block }),
    }).lean(),

    // Active lost items — NO block filter (LostItem has no block field)
    LostItem.find({
      isActive: true,
      status: {
        $in: [ITEM_STATUS.PENDING, ITEM_STATUS.MATCHED],
      },
    }).lean(),
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
  const users = await User.find({
    _id: { $in: userIds },
  }).select(`
  name
  email
  enrollmentNumber
  phoneNumber
  course
  branch
  semester
  block
`);
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  // Build matches display list using already-stored matchedFoundItemIds
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
      const foundItem = foundItemMap.get(foundItemRef.toString());

      if (!foundItem) continue;

      matches.push({
        foundItem: {
          id: foundItem._id,
          name: foundItem.name,
          color: foundItem.color,
          block: foundItem.block,
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
          images: lostItem.images,
        },
        user: user
          ? {
              id: user._id || "N/A",
              name: user.name || "Unknown User",
              email: user.email || "No Email",
              enrollmentNumber: user.enrollmentNumber || "N/A",
              phoneNumber: user.phoneNumber || "N/A",
              course: user.course || "N/A",
              branch: user.branch || "N/A",
              semester: user.semester || "N/A",
              block: user.block || "N/A",
            }
          : null,
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
        block: block || "All Blocks",
      },
      "Matching stats fetched successfully"
    )
  );
});