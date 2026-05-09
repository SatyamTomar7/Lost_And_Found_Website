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

export const addFoundItem = asyncHandler(async (req, res) => {
  const { name, color, dateFound, placeFound, brand, condition } = req.body;

  const foundItemData = {
    name,
    color,
    dateFound,
    placeFound,
    brand,
    condition,
    adminId: req.user.id,
    block: req.user.block,
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
            message: `We found a ${match.matchScore}% match for your lost ${match.lostItem.name} in ${req.user.block} block.`,
            data: {
              lostItemId: match.lostItem._id,
              foundItemId: foundItem._id,
              matchScore: match.matchScore,
              adminId: req.user.id,
            },
            priority: match.matchScore > 85 ? "high" : "medium",
          });

          emailService
            .sendMatchNotification(
              match.lostItem.userId.email,
              match.lostItem.userId.name,
              match.lostItem,
              foundItem,
              req.user.block
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

  const populatedItem = await foundItem.populate("adminId", "name block");
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
    block: req.user.block,
    isActive: true,
  };
  if (status) query.status = status;

  const [foundItems, total] = await Promise.all([
    FoundItem.find(query)
      .populate("adminId", "name")
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
        ? "block data fetched"
        : "No items found for this block"
    )
  );
});

export const getFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = { _id: id };
  if (req.user.role === "admin") {
    query.block = req.user.block;
  }

  const foundItem = await FoundItem.findOne(query)
    .populate("adminId", "name block")
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
export const updateFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { name, color, condition, dateFound, placeFound, brand } = req.body;

  const updateData = { name, color, condition, dateFound, placeFound, brand };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const foundItem = await FoundItem.findOneAndUpdate(
    {
      _id: id,
      block: req.user.block,
    },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  ).populate("adminId", "name block");

  if (!foundItem) {
    throw new ApiError(
      404,
      "Found item not found or you lack permission to update it"
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: foundItem },
        "Found Item updated successfully"
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

  try {
    claimant = await User.findById(claimedByUserId)
      .select(
        `
        name
        email
        enrollmentNumber
        phoneNumber
        course
        branch
        semester
        block
      `
      )
      .session(session);

    if (!claimant) {
      throw new ApiError(404, "Claimant user not found");
    }

    foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        block: req.user.block,
        status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
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
      {
        new: true,
        session,
        runValidators: true,
      }
    );

    if (!foundItem) {
      throw new ApiError(404, "Found item not found or access denied");
    }

    const lostUpdate = await LostItem.findOneAndUpdate(
      {
        _id: lostItemId,
        userId: claimedByUserId,
      },
      {
        $set: {
          status: ITEM_STATUS.COLLECTED,
          matchedFoundItemId: foundItem._id,
          matchedFoundItemIds: [],
        },
      },
      {
        session,
        new: true,
      }
    );

    if (!lostUpdate) {
      throw new ApiError(
        400,
        "Specific lost item record not found or user mismatch"
      );
    }

    await LostItem.updateMany(
      {
        matchedFoundItemIds: foundItem._id,
      },
      {
        $pull: {
          matchedFoundItemIds: foundItem._id,
        },
      },
      { session }
    );

    await FoundItem.updateMany(
      {
        matchedLostItemIds: lostItemId,
      },
      {
        $pull: {
          matchedLostItemIds: new mongoose.Types.ObjectId(lostItemId),
        },
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

  // Notifications after successful commit
  const io = req.app.get("socketio");

  const notification = await Notification.create({
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

  // realtime socket notification
  if (io) {
    io.sendNotificationToUser(claimedByUserId, {
      ...notification.toObject(),
    });
  }

  // email notification
  emailService
    .sendItemReturnedNotification(
      claimant.email,
      claimant.name,
      foundItem.name,
      req.user.block
    )
    .catch((err) => console.error("Email Error:", err));

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
    block: req.user.block,
    status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
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
        block: req.user.block,
        status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
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
    ).populate("adminId", "name block");

    if (!foundItem) {
      throw new ApiError(
        409,
        "Item status changed during processing. Please retry."
      );
    }

    // Remove this found item from all lost item match arrays
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

    // Revert matched lost items back to pending
    await LostItem.updateMany(
      {
        _id: {
          $in: existingFoundItem.matchedLostItemIds.map((l) => l._id),
        },

        status: ITEM_STATUS.MATCHED,
      },
      {
        $set: {
          status: ITEM_STATUS.PENDING,
        },
      },
      { session }
    );

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
            req.user.block
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
  const { collectorName, collectorContact } = req.body;

  // Fetch before transaction
  const existingFoundItem = await FoundItem.findOne({
    _id: id,
    block: req.user.block,
    status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
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
  session.startTransaction();

  try {
    foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        block: req.user.block,
        status: {
          $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED],
        },
      },
      {
        $set: {
          status: ITEM_STATUS.OFFLINE_RETURNED,

          returnedAt: new Date(),

          matchedLostItemIds: [],

          claimedBy: {
            name: collectorName || "Unknown",
            contact: collectorContact || "N/A",
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
    ).populate("adminId", "name block");

    if (!foundItem) {
      throw new ApiError(
        409,
        "Item status changed during processing. Please retry."
      );
    }

    // Revert matched lost items back to pending
    await LostItem.updateMany(
      {
        _id: {
          $in: existingFoundItem.matchedLostItemIds.map((l) => l._id),
        },

        status: ITEM_STATUS.MATCHED,
      },
      {
        $set: {
          status: ITEM_STATUS.PENDING,
        },
      },
      { session }
    );

    // Remove this found item from all lost item match arrays
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

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to mark item as collected offline"
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

          message: `Sorry, the ${existingFoundItem.name} that matched your report has been collected by its owner in person.`,

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
            req.user.block
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
        `Item marked as collected offline. ${previousMatches.length} user(s) notified.`
      )
    );
});

export const getMatchedLostItemsForItem = asyncHandler(
  async (req, res) => {
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
      block: req.user.block,
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
      throw new ApiError(
        404,
        "Found item not found or access denied"
      );
    }

    if (
      !foundItem.matchedLostItemIds ||
      foundItem.matchedLostItemIds.length === 0
    ) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { data: [] },
          "No matched lost items found"
        )
      );
    }

    // Only active matches
    const activeMatches =
      foundItem.matchedLostItemIds.filter(
        (lostItem) =>
          lostItem.status !==
            ITEM_STATUS.RETURNED &&
          lostItem.status !==
            ITEM_STATUS.COLLECTED &&
          lostItem.status !==
            ITEM_STATUS.SELF_RESOLVED
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
  }
);
export const deleteFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        block: req.user.block,
        isActive: true,
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

    // Revert matched lost items back to PENDING
    // IMPORTANT: must run BEFORE pull
    await LostItem.updateMany(
      {
        matchedFoundItemIds: id,
        status: ITEM_STATUS.MATCHED,
      },
      {
        $set: {
          status: ITEM_STATUS.PENDING,
        },
      },
      { session }
    );

    // Remove this found item from all lost item match arrays
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
  } else if (block) {
    query.block = block;
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
      .populate("adminId", "name block")
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
