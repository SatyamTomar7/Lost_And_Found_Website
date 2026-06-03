import { ITEM_STATUS } from "../../config/constants.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { User } from "../auth/User.model.js";
import { FoundItem } from "../found-items/FoundItem.model.js";
import { LostItem } from "../lost-items/LostItem.model.js";
import matchingService from "./matching.service.js";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Extract block prefix from a place string.
 * "Block A - Library" → "Block A"
 * "Main Ground"       → null
 */
const extractBlock = (place) => {
  if (!place) return null;
  const match = place.match(/^(Block [A-Z])\s*-/i);
  return match ? match[1] : null;
};

const isGlobalScopePlace = (place) => !extractBlock(place);

/**
 * Normalize a populated userId object into a safe user response shape.
 * Works whether userId is a plain object (lean) or a Mongoose doc.
 */
const normalizeUser = (owner) => {
  if (!owner || typeof owner !== "object") return null;
  return {
    id: owner._id ?? "N/A",
    name: owner.name ?? "Unknown User",
    email: owner.email ?? "No Email",
    enrollmentNumber: owner.enrollmentNumber ?? "N/A",
    phoneNumber: owner.phoneNumber ?? "N/A",
    course: owner.course ?? "N/A",
    branch: owner.branch ?? "N/A",
    semester: owner.semester ?? "N/A",
    block: owner.block ?? "N/A",
  };
};

// ---------------------------------------------------------------------------
// CHECK MATCHES FOR A LOST ITEM  (student / staff view)
// ---------------------------------------------------------------------------
export const checkLostItemMatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const threshold = Math.min(100, Math.max(0, parseInt(req.query.threshold) || 60));

  const lostItem = await LostItem.findById(id).lean();
  if (!lostItem) throw new ApiError(404, "Lost item not found");

  const isOwner = lostItem.userId.toString() === req.user.id;
  const isStaff = req.user.role === "admin" || req.user.role === "security";

  if (!isOwner && !isStaff) {
    throw new ApiError(403, "Access denied. You can only view matches for your own items.");
  }

  const matches = await matchingService.findMatchesForLostItem(id, threshold);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        lostItem: {
          id: lostItem._id,
          name: lostItem.name,
          color: lostItem.color,
          placeLost: lostItem.placeLost,
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
            handledBy: match.foundItem.handledBy,
          },
          matchScore: match.matchScore,
          matchDetails: match.matchDetails,
        })),
      },
      "Matches fetched successfully"
    )
  );
});

// ---------------------------------------------------------------------------
// CHECK MATCHES FOR A FOUND ITEM  (staff only)
//
// Auth rules (viewing):
//   Admin    -> can view their own admin items by stored block ownership,
//               and any security-handled item.
//   Security -> can view any item where handledBy === "security".
//
// Matching scope itself is enforced inside matchingService.findMatchesForFoundItem
// from placeFound, not just role.
// ---------------------------------------------------------------------------
export const checkFoundItemMatches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const threshold = Math.min(100, Math.max(0, parseInt(req.query.threshold) || 60));

  const foundItem = await FoundItem.findById(id).lean();
  if (!foundItem) throw new ApiError(404, "Found item not found");

  if (req.user.role !== "admin" && req.user.role !== "security") {
    throw new ApiError(403, "Access denied. Staff access only.");
  }

  if (req.user.role === "admin") {
    const isOwnBlockItem =
      foundItem.handledBy === "admin" && foundItem.block === req.user.block;
    const isSecurityItem = foundItem.handledBy === "security";
    if (!isOwnBlockItem && !isSecurityItem) {
      throw new ApiError(403, "Access denied. This item belongs to another block.");
    }
  } else if (req.user.role === "security") {
    // Security can only access items they handle
    if (foundItem.handledBy !== "security") {
      throw new ApiError(403, "Access denied. This item is handled by block admin.");
    }
  }

  const matches = await matchingService.findMatchesForFoundItem(id, threshold);

  const mappedMatches = matches.map((match) => {
    const lostItem = match.lostItem ?? {};
    return {
      lostItem: {
        id: lostItem._id,
        name: lostItem.name,
        color: lostItem.color,
        dateLost: lostItem.dateLost,
        placeLost: lostItem.placeLost,
        images: lostItem.images,
        user: normalizeUser(lostItem.userId),
      },
      matchScore: match.matchScore,
      matchDetails: match.matchDetails,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        foundItem: {
          id: foundItem._id,
          name: foundItem.name,
          color: foundItem.color,
          placeFound: foundItem.placeFound,
          handledBy: foundItem.handledBy,
          matchScope: isGlobalScopePlace(foundItem.placeFound)
            ? "global"
            : `block-local (${extractBlock(foundItem.placeFound) ?? "common"})`,
        },
        matches: mappedMatches,
      },
      "Matches retrieved successfully"
    )
  );
});

// ---------------------------------------------------------------------------
// MATCHING STATS  (staff dashboard)
// ---------------------------------------------------------------------------
export const getMatchingStats = asyncHandler(async (req, res) => {
  // FoundItem query scoped by role
  const foundItemQuery =
    req.user.role === "admin"
      ? { block: req.user.block, handledBy: "admin" }
      : req.user.role === "security"
        ? { handledBy: "security" }
        : {};

  const [
    totalLostItems,
    totalFoundItems,
    matchedLostCount,
    returnedCount,
    itemStats,
    lostItems,
  ] = await Promise.all([
    LostItem.countDocuments({ isActive: true }),

    FoundItem.countDocuments({ isActive: true, ...foundItemQuery }),

    LostItem.countDocuments({ status: ITEM_STATUS.MATCHED }),

    FoundItem.countDocuments({ status: ITEM_STATUS.RETURNED, ...foundItemQuery }),

    LostItem.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$name",
          total: { $sum: 1 },
          matched: {
            $sum: { $cond: [{ $eq: ["$status", ITEM_STATUS.MATCHED] }, 1, 0] },
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

    LostItem.find({
      isActive: true,
      status: { $in: [ITEM_STATUS.PENDING, ITEM_STATUS.MATCHED] },
      matchedFoundItemIds: { $exists: true, $ne: [] },
    })
      .select(
        "name color dateLost placeLost description images userId matchedFoundItemIds"
      )
      .lean(),
  ]);

  const matchRate =
    totalLostItems > 0
      ? ((matchedLostCount / totalLostItems) * 100).toFixed(2)
      : 0;

  const returnRate =
    totalFoundItems > 0
      ? ((returnedCount / totalFoundItems) * 100).toFixed(2)
      : 0;

  const referencedFoundIds = [
    ...new Set(
      lostItems.flatMap((lostItem) =>
        (lostItem.matchedFoundItemIds || []).map((foundId) => foundId.toString())
      )
    ),
  ];

  const foundItems = referencedFoundIds.length
    ? await FoundItem.find({
        _id: { $in: referencedFoundIds },
        isActive: true,
        status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
        ...foundItemQuery,
      })
        .select("name color block placeFound handledBy dateFound")
        .lean()
    : [];

  // Batch fetch users — avoids N+1
  const userIds = [...new Set(lostItems.map((l) => l.userId.toString()))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select(
    "name email enrollmentNumber phoneNumber course branch semester block"
      )
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  // Build matches list from stored matchedFoundItemIds
  const foundItemMap = new Map(foundItems.map((f) => [f._id.toString(), f]));
  const matches = [];

  for (const lostItem of lostItems) {
    if (!lostItem.matchedFoundItemIds?.length) continue;

    const user = userMap[lostItem.userId.toString()] ?? null;

    for (const foundItemRef of lostItem.matchedFoundItemIds) {
      const foundItem = foundItemMap.get(foundItemRef.toString());
      if (!foundItem) continue;

      matches.push({
        foundItem: {
          id: foundItem._id,
          name: foundItem.name,
          color: foundItem.color,
          block: foundItem.block,
          placeFound: foundItem.placeFound,
          handledBy: foundItem.handledBy,
          dateFound: foundItem.dateFound,
          matchScope: isGlobalScopePlace(foundItem.placeFound)
            ? "global"
            : `block-local (${extractBlock(foundItem.placeFound) ?? "common"})`,
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
        user: normalizeUser(user),
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
        scope:
          req.user.role === "admin"
            ? `Block ${req.user.block}`
            : req.user.role === "security"
              ? "University Security Department"
              : "All Items",
      },
      "Matching stats fetched successfully"
    )
  );
});
