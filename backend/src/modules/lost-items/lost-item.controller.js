import mongoose from "mongoose";
import { ITEM_STATUS, NOTIFICATION_TYPES } from "../../config/constants.js";
import { emailService } from "../../shared/services/email.service.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { FoundItem } from "../found-items/FoundItem.model.js";
import matchingService from "../matching/matching.service.js";
import { buildMatchNotificationMessage } from "../matching/match-notification-message.js";
import { Notification } from "../notifications/Notification.model.js";
import { PendingUpload } from "../uploads/PendingUpload.model.js";
import { deleteImage } from "../uploads/upload.service.js";
import { LostItem } from "./LostItem.model.js";

export const submitLostItem = asyncHandler(async (req, res) => {
  if (!req.user.profileCompleted) {
    throw new ApiError(403, "Complete profile first");
  }
  let uploadedPublicId = null; // track so we can rollback on failure
  // --- Build image array from whichever mode was used ---
  let images = [];

  if (req.file) {
    // Mode A: file came directly with this request
    uploadedPublicId = req.file.filename;
    images = [{ url: req.file.path, publicId: req.file.filename }];
  } else if (req.body.photoPublicId) {
    // Mode B: client pre-uploaded, sends publicId in body
    const publicId = req.body.photoPublicId;

    // Validate: must be a PendingUpload owned by this user, not yet claimed
    const pending = await PendingUpload.findOne({
      publicId,
      userId: req.user.id,
      claimedAt: null,
    });
    if (!pending) {
      throw new ApiError(400, "Invalid or already used image reference");
    }

    images = [{ url: pending.url, publicId }];
    uploadedPublicId = publicId; // for rollback if DB save fails
  }

  // --- Save to DB ---
  let lostItem;
  try {
    const {
      name,
      color,
      condition,
      dateLost,
      placeLost,
      description,
      brand
    } = req.body;
    lostItem = await LostItem.create({
      name,
      color,
      condition,
      dateLost,
      placeLost,
      description,
      brand,
      userId: req.user.id,
      images,
    });
  } catch (err) {
    // Rollback: delete the Cloudinary image if DB failed
    if (uploadedPublicId) {
      await deleteImage(uploadedPublicId).catch((e) =>
        console.error("Rollback delete failed:", e)
      );
      // Also remove the pending record
      await PendingUpload.deleteOne({ publicId: uploadedPublicId }).catch(
        () => {}
      );
    }
    throw new ApiError(500, err.message || "Failed to save lost item");
  }

  // --- Mark pending upload as claimed (Mode B) ---
  if (req.body.photoPublicId) {
    await PendingUpload.updateOne(
      { publicId: req.body.photoPublicId },
      { $set: { claimedAt: new Date() } }
    );
  }

  await lostItem.populate(
    "userId",
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
  );

  // ... rest of your matching + notification logic unchanged ...
  const matches = await matchingService.findMatchesForLostItem(
    lostItem._id,
    70
  );
  const topMatches = matches.slice(0, 3);
  let matchNotifications = [];
  if (topMatches.length > 0) {
    const io = req.app.get("socketio");
    matchNotifications = (
      await Promise.all(
        topMatches.map(async (match) => {
          const notification = await Notification.create({
            userId: req.user.id,
            type: NOTIFICATION_TYPES.MATCH_FOUND,
            title: "Potential Match Found",
            message: buildMatchNotificationMessage(
              lostItem.name,
              match.matchScore,
              match.foundItem
            ),
            data: {
              lostItemId: lostItem._id,
              foundItemId: match.foundItem._id,
              matchScore: match.matchScore,
            },
            priority: match.matchScore > 85 ? "high" : "medium",
          });

          const emailSent = await emailService.sendMatchNotification(
            req.user.email,
            req.user.name,
            lostItem,
            match.foundItem
          );
          if (!emailSent) {
            console.error(
              `[submitLostItem] Match email failed for lost item ${lostItem._id} and found item ${match.foundItem._id}`
            );
          }

          if (io) {
            io.sendNotificationToUser(req.user.id, {
              ...notification.toObject(),
              foundItem: match.foundItem,
            });
          }
          return notification;
        })
      )
    ).filter(Boolean);
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { lostItem, matches: topMatches, matchNotifications },
        topMatches.length > 0
          ? `Submitted! Found ${topMatches.length} potential matches.`
          : "Submitted successfully. We'll notify you of matches."
      )
    );
});

export const getMyLostItems = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const { status } = req.query;

  const query = {
    userId: req.user.id,
    isActive: true,
  };
  if (status) query.status = status;

  const [lostItems, total] = await Promise.all([
    LostItem.find(query)

      .populate({
        path: "matchedFoundItemIds",
        select: "name block originalBlock handledBy createdBy status",
        populate: {
          path: "createdBy",
          select: "name role block",
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(),
    LostItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: lostItems.length,
        pagination: {
          page,
          pages: totalPages,
          total,
          limit,
        },
        data: lostItems,
      },
      lostItems.length > 0
        ? "Items fetched successfully"
        : "No lost items found."
    )
  );
});
export const getLostItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = { _id: id };

  if (req.user.role !== "admin" && req.user.role !== "security") {
    query.userId = req.user.id;
  }

  const lostItem = await LostItem.findOne(query)
    .populate(
      "userId",
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
    .populate({
      path: "matchedFoundItemIds",
      select: "name block originalBlock handledBy createdBy status createdAt",
      populate: {
        path: "createdBy",
        select: "name role block",
      },
    })
    .lean();
  if (!lostItem) {
    throw new ApiError(404, "Lost item not found or access denied");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: lostItem },
        "Lost item details and potential matches fetched successfully"
      )
    );
});
export const deleteLostItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lostItem = await LostItem.findOneAndUpdate(
      { _id: id, userId: req.user.id, isActive: true },
      { $set: { isActive: false } },
      { new: true, session }
    );

    if (!lostItem) {
      throw new ApiError(404, "Lost item not found or already deleted");
    }
    await FoundItem.updateMany(
      {
        matchedLostItemIds: id,
        status: ITEM_STATUS.MATCHED,
      },
      {
        $set: {
          status: ITEM_STATUS.FOUND,
        },
      },
      { session }
    );

    await FoundItem.updateMany(
      { matchedLostItemIds: id },
      { $pull: { matchedLostItemIds: id } },
      { session }
    );

    await session.commitTransaction();

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Lost item deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to delete lost item"
    );
  } finally {
    session.endSession();
  }
});
export const searchLostItems = asyncHandler(async (req, res) => {
  const { q, color, dateFrom, dateTo } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);

  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const query = {
    isActive: true,
  };

  if (q) {
    query.$text = {
      $search: q,
    };
  }

  if (color) {
    query.color = color;
  }

  if (dateFrom || dateTo) {
    query.dateLost = {};

    if (dateFrom) {
      query.dateLost.$gte = new Date(dateFrom);
    }

    if (dateTo) {
      query.dateLost.$lte = new Date(dateTo);
    }
  }

  // Role-based user detail visibility
  const userSelect =
    req.user.role === "admin" || req.user.role === "security"
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

  const [lostItems, total] = await Promise.all([
    LostItem.find(query)
      .populate("userId", userSelect)
      .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(),

    LostItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: lostItems.length,

        pagination: {
          page,
          pages: totalPages,
          total,
          limit,
        },

        data: lostItems,
      },

      "Items searched successfully"
    )
  );
});
export const selfResolveLostItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lostItem = await LostItem.findById(id).session(session);

    if (!lostItem) {
      throw new ApiError(404, "Lost item not found");
    }

    if (lostItem.userId.toString() !== req.user.id) {
      throw new ApiError(
        403,
        "Access denied. You can only resolve your own lost item reports."
      );
    }

    const resolvableStatuses = [ITEM_STATUS.PENDING, ITEM_STATUS.MATCHED];

    if (!resolvableStatuses.includes(lostItem.status)) {
      throw new ApiError(
        400,
        `Cannot self-resolve an item with status "${lostItem.status}".`
      );
    }

    // Pull this lost item from all matched found items
    const matchedFoundItemIds = lostItem.matchedFoundItemIds || [];

    if (matchedFoundItemIds.length > 0) {
      await FoundItem.updateMany(
        {
          _id: {
            $in: matchedFoundItemIds,
          },
        },
        {
          $pull: {
            matchedLostItemIds: new mongoose.Types.ObjectId(lostItem._id),
          },
        },
        { session }
      );

      // Revert found items back to FOUND
      // if no matched lost items remain
      await FoundItem.updateMany(
        {
          _id: {
            $in: matchedFoundItemIds,
          },

          matchedLostItemIds: {
            $size: 0,
          },
        },
        {
          $set: {
            status: ITEM_STATUS.FOUND,
          },
        },
        { session }
      );
    }

    // Update lost item
    lostItem.status = ITEM_STATUS.SELF_RESOLVED;

    lostItem.selfResolvedAt = new Date();

    lostItem.matchedFoundItemId = null;

    lostItem.matchedFoundItemIds = [];

    await lostItem.save({ session });

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          id: lostItem._id,
          status: lostItem.status,
          selfResolvedAt: lostItem.selfResolvedAt,
        },
        "Your lost item report has been closed. Glad you found it!"
      )
    );
  } catch (error) {
    await session.abortTransaction();

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to self resolve lost item"
    );
  } finally {
    session.endSession();
  }
});
