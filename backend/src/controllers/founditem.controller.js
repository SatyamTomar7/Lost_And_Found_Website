import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { ITEM_STATUS, NOTIFICATION_TYPES } from "../constants.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { LostItem } from "../models/LostItem.model.js";
import { emailService } from "../services/email.service.js";
import matchingService from "../services/matching.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Notification } from "../models/Notification.model.js";
import {
  reconcileLostItemStatus,
} from "../utils/reconcileMatchStatus.js";
import {
  buildMatchNotificationMessage,
} from "../utils/matchNotificationMessage.js";
export const addFoundItem = asyncHandler(async (req, res) => {
  const { name, color, dateFound, placeFound, brand, condition } = req.body;

  const foundItemData = {
    name,
    color,
    dateFound,
    placeFound,
    brand,
    condition,

    createdBy: req.user.id,

    handledBy: req.user.role,

    block: req.user.role === "admin" ? req.user.block : null,

    originalBlock: req.user.role === "admin" ? req.user.block : null,
  };
  const foundItem = await FoundItem.create(foundItemData);

  const matches = await matchingService.findMatchesForFoundItem(
    foundItem._id,
    70
  );
  const topMatches = matches.slice(0, 5);

  let matchNotifications = [];
  if (topMatches.length > 0) {
    const io = req.app.get("socketio");

    matchNotifications = (
      await Promise.all(
        topMatches.map(async (match) => {
          if (!match?.lostItem?.userId) {
            return null;
          }
          const notification = await Notification.create({
            userId: match.lostItem.userId._id,
            type: NOTIFICATION_TYPES.MATCH_FOUND,
            title: "Your Lost Item Might Be Found!",
            message: buildMatchNotificationMessage(
              match.lostItem.name,
              match.matchScore,
              match.foundItem
            ),
            data: {
              lostItemId: match.lostItem._id,
              foundItemId: foundItem._id,
              matchScore: match.matchScore,
              createdBy: req.user.id,
            },
            priority: match.matchScore > 85 ? "high" : "medium",
          });

          emailService
            .sendMatchNotification(
              match.lostItem.userId.email,
              match.lostItem.userId.name,
              match.lostItem,
              foundItem
            )
            .catch((err) => console.error("Email Error:", err));
          if (io && match?.lostItem?.userId?._id) {
            io.sendNotificationToUser(match.lostItem.userId._id, {
              ...notification.toObject(),
              foundItem,
            });
          }

          return { ...notification.toObject(), lostItem: match.lostItem };
        })
      )
    ).filter(Boolean);
  }

  const populatedItem = await foundItem.populate(
    "createdBy",
    "name block role"
  );
  res.status(201).json(
    new ApiResponse(
      201,
      {
        foundItem: populatedItem,
        matches: topMatches,
        matchNotifications,
      },
      topMatches.length > 0
        ? `Item added! Notified ${topMatches.length} potential owner(s).`
        : "Found item added successfully."
    )
  );
});

export const getDepartmentFoundItems = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const { status } = req.query;

  const query = {
    isActive: true,
  };

  if (req.user.role === "admin") {
    query.block = req.user.block;
    query.handledBy = "admin";
  }

  if (req.user.role === "security") {
    query.handledBy = "security";
  }
  if (status) query.status = status;

  const [foundItems, total] = await Promise.all([
    FoundItem.find(query)
      .populate("createdBy", "name role block")
      .populate({
        path: "matchedLostItemIds",
        select: "name userId status createdAt",

        populate: {
          path: "userId",
          select: `
  name
  email
  enrollmentNumber
`,
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(),
    FoundItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: foundItems.length,
        pagination: {
          page,
          pages: totalPages,
          total,
          limit,
        },
        data: foundItems,
      },
      foundItems.length > 0
        ? "Found items fetched successfully"
        : "No found items available"
    )
  );
});

export const getFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = { _id: id };
  if (req.user.role === "admin") {
    query.block = req.user.block;
    query.handledBy = "admin";
  }

  if (req.user.role === "security") {
    query.handledBy = "security";
  }

  const foundItem = await FoundItem.findOne(query)
    .populate("createdBy", "name role block")
    .populate({
      path: "matchedLostItemIds",
      select: "name userId status createdAt",
      populate: {
        path: "userId",
        select: `
        name
        email
        enrollmentNumber
        phoneNumber
        course
        branch
        semester
        block
      `,
      },
    })
    .lean();

  if (!foundItem) {
    throw new ApiError(
      404,
      "Found item not found or access denied for your block"
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: foundItem },
        "Found item details and potential claimants fetched successfully"
      )
    );
});

export const markAsReturned = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lostItemId, claimedByUserId } = req.body;

  if (!lostItemId || !claimedByUserId) {
    throw new ApiError(
      400,
      "Lost Item ID and Claimant ID are required for handover"
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let foundItem;
  let claimant;
  let affectedLostItems = [];

  try {
    claimant = await User.findById(claimedByUserId)
      .select(
        "name email enrollmentNumber phoneNumber course branch semester block"
      )
      .session(session);

    if (!claimant) throw new ApiError(404, "Claimant user not found");

    foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },

        ...(req.user.role === "admin"
          ? {
              block: req.user.block,
              handledBy: "admin",
            }
          : {
              handledBy: "security",
            }),
      },
      {
        $set: {
          status: ITEM_STATUS.RETURNED,
          claimedBy: {
            name: claimant.name || "Unknown User",
            email: claimant.email || "No Email",
            enrollmentNumber: claimant.enrollmentNumber || "N/A",
            phoneNumber: claimant.phoneNumber || "N/A",
            course: claimant.course || "N/A",
            branch: claimant.branch || "N/A",
            semester: claimant.semester || "N/A",
            block: claimant.block || "N/A",
          },
          matchedLostItemId: lostItemId,
          returnedAt: new Date(),
          matchedLostItemIds: [],
        },
      },
      { new: true, session, runValidators: true }
    );

    if (!foundItem)
      throw new ApiError(404, "Found item not found or access denied");

    const lostUpdate = await LostItem.findOneAndUpdate(
      { _id: lostItemId, userId: claimedByUserId },
      {
        $set: {
          status: ITEM_STATUS.COLLECTED,
          matchedFoundItemId: foundItem._id,
          matchedFoundItemIds: [],
        },
      },
      { session, new: true }
    );

    if (!lostUpdate) {
      throw new ApiError(
        400,
        "Specific lost item record not found or user mismatch"
      );
    }

    // ── STEP 1: Capture affected lost items BEFORE the pull ───────────────
    // Populate userId so we have name/email ready for notifications post-commit
    const potentiallyAffected = await LostItem.find({
      status: ITEM_STATUS.MATCHED,
      matchedFoundItemIds: foundItem._id,
      _id: { $ne: lostItemId },
    })
      .populate("userId", "name email")
      .session(session);

    // ── STEP 2: Pull foundItem._id from all those lost items ──────────────
    await LostItem.updateMany(
      {
        matchedFoundItemIds: foundItem._id,
        _id: { $ne: lostItemId },
      },
      { $pull: { matchedFoundItemIds: foundItem._id } },
      { session }
    );

    // ── STEP 3: Re-fetch those specific items after pull ──────────────────
    // Only keep items that now have zero matches left (were single-matched)
    const affectedIds = potentiallyAffected.map((i) => i._id);

    if (affectedIds.length > 0) {
      // re-fetch affected items
      affectedLostItems = await LostItem.find({
        _id: { $in: affectedIds },
        status: ITEM_STATUS.MATCHED,
      })
        .populate("userId", "name email")
        .session(session);

      // keep only items with NO matches left
      affectedLostItems = affectedLostItems.filter(
        (item) => item.matchedFoundItemIds.length === 0
      );

      // reset status to pending
for (const item of affectedLostItems) {
  await reconcileLostItemStatus(
    item._id,
    session
  );
}
    }

    // ── STEP 4: Pull lostItemId from other found items ────────────────────
    await FoundItem.updateMany(
      { matchedLostItemIds: lostItemId },
      {
        $pull: { matchedLostItemIds: new mongoose.Types.ObjectId(lostItemId) },
      },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error("Handover Error:", error);
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Internal Server Error during handover"
    );
  } finally {
    session.endSession();
  }

  // ── All notifications run AFTER commit ───────────────────────────────────
  const io = req.app.get("socketio");

  // 1. Notify each affected user whose item went back to PENDING
  for (const item of affectedLostItems) {
    try {
      if (!item.userId) {
        console.warn(
          `[markAsReturned] Skipping — no userId on lost item ${item._id}`
        );
        continue;
      }

      // Handle both populated object and raw ObjectId
      const userId = item.userId._id || item.userId;
      const userIdStr = userId.toString();
      const userEmail = item.userId.email || null;
      const userName = item.userId.name || "User";

      const pendingNotification = await Notification.create({
        userId,
        type: NOTIFICATION_TYPES.MATCH_REMOVED,
        title: "Match Removed",
        message:
          "A matched item was returned to its original owner. Your item is now back in pending status.",
        data: {
          lostItemId: item._id,
          foundItemId: foundItem._id,
        },
        priority: "medium",
      });

      if (io) {
        io.sendNotificationToUser(userIdStr, {
          ...pendingNotification.toObject(),
        });
      } else {
        console.warn("[markAsReturned] Socket.io instance not found on app");
      }

      if (userEmail) {
        emailService
          .sendMatchRemovedNotification(
            userEmail,
            userName,
            item.name,
            req.user.role === "admin"
              ? `Block ${req.user.block}`
              : "University Security Department"
          )
          .catch((err) => console.error("Match Removed Email Error:", err));
      } else {
        console.warn(`[markAsReturned] No email found for user ${userIdStr}`);
      }
    } catch (err) {
      console.error(
        `[markAsReturned] Failed to notify user ${item.userId} for match removal:`,
        err
      );
    }
  }

  // 2. Notify the claimant that their item was successfully returned
  try {
    const returnedNotification = await Notification.create({
      userId: claimedByUserId,
      type: NOTIFICATION_TYPES.ITEM_RETURNED,
      title: "Item Returned Successfully",
      message: `Your lost item "${foundItem.name}" has been successfully returned.`,
      data: {
        foundItemId: foundItem._id,
        lostItemId,
      },
      priority: "high",
    });

    if (io) {
      io.sendNotificationToUser(claimedByUserId.toString(), {
        ...returnedNotification.toObject(),
      });
    }

    emailService
      .sendItemReturnedNotification(
        claimant.email,
        claimant.name,
        foundItem.name,
        req.user.role === "admin"
          ? `Block ${req.user.block}`
          : "University Security Department"
      )
      .catch((err) => console.error("Item Returned Email Error:", err));
  } catch (err) {
    console.error("[markAsReturned] Failed to notify claimant:", err);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { foundItem },
        "Item returned and all related potential matches cleared"
      )
    );
});
export const markAsUnclaimed = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch before update — capture matched users for notifications
  const existingFoundItem = await FoundItem.findOne({
    _id: id,
    status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },

    ...(req.user.role === "admin"
      ? {
          block: req.user.block,
          handledBy: "admin",
        }
      : {
          handledBy: "security",
        }),
  }).populate({
    path: "matchedLostItemIds",
    select: "userId name",
    populate: {
      path: "userId",
      select: "name email",
    },
  });

  if (!existingFoundItem) {
    throw new ApiError(
      404,
      "Found item not found or you lack permission for this block"
    );
  }

  let foundItem;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        status: {
          $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED],
        },

        ...(req.user.role === "admin"
          ? {
              block: req.user.block,
              handledBy: "admin",
            }
          : {
              handledBy: "security",
            }),
      },
      {
        $set: {
          status: ITEM_STATUS.UNCLAIMED,
          matchedLostItemIds: [],
        },

        $unset: {
          claimedBy: "",
          claimedAt: "",
          returnedAt: "",
          matchedLostItemId: "",
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      }
    ).populate("createdBy", "name role block");

    if (!foundItem) {
      throw new ApiError(
        409,
        "Item status changed during processing. Please retry."
      );
    }

const affectedLostItems = await LostItem.find(
  {
    matchedFoundItemIds: id,
  },
  "_id",
  { session }
);
await LostItem.updateMany(
  {
    matchedFoundItemIds: id,
  },
  {
    $pull: {
      matchedFoundItemIds: new mongoose.Types.ObjectId(id),
    },
  },
  { session }
);
for (const lostItem of affectedLostItems) {
  await reconcileLostItemStatus(
    lostItem._id,
    session
  );
}

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    console.error("Unclaimed Status Error:", error);

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to mark item as unclaimed"
    );
  } finally {
    session.endSession();
  }

  // Notifications after commit
  const io = req.app.get("socketio");

  const previousMatches = existingFoundItem.matchedLostItemIds || [];

  if (previousMatches.length > 0) {
    await Promise.all(
      previousMatches.map(async (lostItem) => {
        if (!lostItem.userId) return;

        const notification = await Notification.create({
          userId: lostItem.userId._id,

          type: NOTIFICATION_TYPES.ITEM_UNAVAILABLE,

          title: "Item No Longer Available",

          message: `The ${existingFoundItem.name} that matched your report is no longer available. It may have been re-entered with corrected details — please check again soon.`,

          data: {
            lostItemId: lostItem._id,
            foundItemId: id,
          },

          priority: "medium",
        });

        // realtime socket notification
        if (io) {
          io.sendNotificationToUser(lostItem.userId._id, {
            ...notification.toObject(),
          });
        }

        // email notification
        emailService
          .sendItemUnavailableNotification(
            lostItem.userId.email,
            lostItem.userId.name,
            existingFoundItem.name,
            req.user.role === "admin"
              ? `Block ${req.user.block}`
              : "University Security Department"
          )
          .catch((err) => console.error("Email Error:", err));
      })
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: foundItem },
        `Item marked as unclaimed. ${previousMatches.length} user(s) notified.`
      )
    );
});

export const markAsCollectedOffline = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    name,
    email,
    enrollmentNumber,
    phoneNumber,
    course,
    branch,
    semester,
    block,
  } = req.body;

  // Fetch existing item before transaction
  const existingFoundItem = await FoundItem.findOne({
    _id: id,
    status: {
      $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED],
    },

    ...(req.user.role === "admin"
      ? {
          block: req.user.block,
          handledBy: "admin",
        }
      : {
          handledBy: "security",
        }),
  }).populate({
    path: "matchedLostItemIds",
    select: "userId name",
    populate: {
      path: "userId",
      select: "name email",
    },
  });

  if (!existingFoundItem) {
    throw new ApiError(
      409,
      "Item has already been resolved and cannot be updated again."
    );
  }

  let foundItem;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,

        status: {
          $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED],
        },

        ...(req.user.role === "admin"
          ? {
              block: req.user.block,
              handledBy: "admin",
            }
          : {
              handledBy: "security",
            }),
      },
      {
        $set: {
          status: ITEM_STATUS.OFFLINE_RETURNED,

          returnedAt: new Date(),

          matchedLostItemIds: [],

          claimedBy: {
            name: name || "Unknown",
            email: email || "N/A",
            enrollmentNumber: enrollmentNumber || "N/A",
            phoneNumber: phoneNumber || "N/A",
            course: course || "N/A",
            branch: branch || "N/A",
            semester: semester || "N/A",
            block: block || "N/A",
            isOffline: true,
          },
        },

        $unset: {
          matchedLostItemId: "",
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      }
    ).populate("createdBy", "name role block");

    if (!foundItem) {
      throw new ApiError(
        409,
        "Item status changed during processing. Please retry."
      );
    }

    // Revert matched lost items back to pending
const affectedLostItems = await LostItem.find(
  {
    matchedFoundItemIds: id,
  },
  "_id",
  { session }
);

await LostItem.updateMany(
  {
    matchedFoundItemIds: id,
  },
  {
    $pull: {
      matchedFoundItemIds: new mongoose.Types.ObjectId(id),
    },
  },
  { session }
);

for (const lostItem of affectedLostItems) {
  await reconcileLostItemStatus(
    lostItem._id,
    session
  );
}

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    throw new ApiError(
      error.statusCode || 500,
      error.message ||
        "Failed to mark item as collected offline"
    );
  } finally {
    session.endSession();
  }

  // Notifications after successful commit
  const io = req.app.get("socketio");

  const previousMatches =
    existingFoundItem.matchedLostItemIds || [];

  if (previousMatches.length > 0) {
    await Promise.all(
      previousMatches.map(async (lostItem) => {
        if (!lostItem.userId) return;

        const notification = await Notification.create({
          userId: lostItem.userId._id,

          type: NOTIFICATION_TYPES.ITEM_UNAVAILABLE,

          title: "Item No Longer Available",

          message: `Sorry, the ${existingFoundItem.name} that matched your report has been collected by its owner in person.`,

          data: {
            lostItemId: lostItem._id,
            foundItemId: id,
          },

          priority: "medium",
        });

        // Realtime socket notification
        if (io) {
          io.sendNotificationToUser(
            lostItem.userId._id,
            {
              ...notification.toObject(),
            }
          );
        }

        // Email notification
        emailService
          .sendItemUnavailableNotification(
            lostItem.userId.email,
            lostItem.userId.name,
            existingFoundItem.name,
            req.user.role === "admin"
              ? `Block ${req.user.block}`
              : "University Security Department"
          )
          .catch((err) =>
            console.error("Email Error:", err)
          );
      })
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: foundItem,
      },
      `Item marked as collected offline. ${previousMatches.length} user(s) notified.`
    )
  );
});

export const getMatchedLostItemsForItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Role-based user detail visibility
  const userSelect =
    req.user.role === "admin"
      ? `
            name
            email
            enrollmentNumber
            phoneNumber
            course
            branch
            semester
            block
          `
      : `
            name
            branch
            semester
            block
          `;

  const foundItem = await FoundItem.findOne({
    _id: id,

    ...(req.user.role === "admin"
      ? {
          block: req.user.block,
          handledBy: "admin",
        }
      : {
          handledBy: "security",
        }),
  })
    .select("matchedLostItemIds name")
    .populate({
      path: "matchedLostItemIds",

      select: `
          name
          color
          placeLost
          dateLost
          userId
          status
          images
        `,

      populate: {
        path: "userId",
        select: userSelect,
      },
    })
    .lean();

  if (!foundItem) {
    throw new ApiError(404, "Found item not found or access denied");
  }

  if (
    !foundItem.matchedLostItemIds ||
    foundItem.matchedLostItemIds.length === 0
  ) {
    return res
      .status(200)
      .json(new ApiResponse(200, { data: [] }, "No matched lost items found"));
  }

  // Only active matches
  const activeMatches = foundItem.matchedLostItemIds.filter(
    (lostItem) =>
      lostItem.status !== ITEM_STATUS.RETURNED &&
      lostItem.status !== ITEM_STATUS.COLLECTED &&
      lostItem.status !== ITEM_STATUS.SELF_RESOLVED
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: activeMatches.length,

        foundItem: {
          id,
          name: foundItem.name,
        },

        data: activeMatches,
      },

      "Matched lost items fetched successfully"
    )
  );
});
export const deleteFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        isActive: true,

        ...(req.user.role === "admin"
          ? {
              block: req.user.block,
              handledBy: "admin",
            }
          : {
              handledBy: "security",
            }),
      },
      {
        $set: { isActive: false },
      },
      {
        new: true,
        session,
      }
    );

    if (!foundItem) {
      throw new ApiError(
        404,
        "Found item not found or you lack permission to delete it"
      );
    }

    const affectedLostItems = await LostItem.find(
  {
    matchedFoundItemIds: id,
  },
  "_id",
  { session }
);


await LostItem.updateMany(
  {
    matchedFoundItemIds: id,
  },
  {
    $pull: {
      matchedFoundItemIds: new mongoose.Types.ObjectId(id),
    },
  },
  { session }
);
for (const lostItem of affectedLostItems) {
  await reconcileLostItemStatus(
    lostItem._id,
    session
  );
}

    await session.commitTransaction();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Found item deleted successfully"));
  } catch (error) {
    await session.abortTransaction();

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to delete found item"
    );
  } finally {
    session.endSession();
  }
});
export const searchFoundItems = asyncHandler(async (req, res) => {
  const { q, color, block, dateFrom, dateTo } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  let query = { isActive: true };

  if (req.user.role === "admin") {
    query.block = req.user.block;
    query.handledBy = "admin";
  }

  if (req.user.role === "security") {
    query.handledBy = "security";
  }

  if (q) {
    query.$text = { $search: q };
  }

  if (color) {
    query.color = color;
  }

  if (dateFrom || dateTo) {
    query.dateFound = {};
    if (dateFrom) query.dateFound.$gte = new Date(dateFrom);
    if (dateTo) query.dateFound.$lte = new Date(dateTo);
  }

  const [foundItems, total] = await Promise.all([
    FoundItem.find(query)
      .populate("createdBy", "name role block")
      .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),

    FoundItem.countDocuments(query),
  ]);
  const totalPages = Math.ceil(total / limit);
  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: foundItems.length,
        pagination: {
          page,
          pages: totalPages,
          total,
          limit,
        },
        data: foundItems,
      },
      "Items searched successfully"
    )
  );
});
