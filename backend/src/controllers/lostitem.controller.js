import { LostItem } from "../models/LostItem.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse }from "../utils/ApiResponse.js";
import matchingService from "../services/matching.service.js";
import {emailService} from "../services/email.service.js";
import { Notification } from "../models/Notification.model.js";
import { ITEM_STATUS, NOTIFICATION_TYPES } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";

export const submitLostItem = asyncHandler(async (req, res) => {
  const lostItemData = {
    ...req.body,
    userId: req.user.id,
  };
  if (req.body.photoUrl && req.body.photoPublicId) {
    lostItemData.images = [
      {
        url: req.body.photoUrl,
        publicId: req.body.photoPublicId,
      },
    ];
  }

  // Create lost item document
  const lostItem = await LostItem.create(lostItemData);

  const matches = await matchingService.findMatchesForLostItem(
    lostItem._id,
    70
  );

  let matchNotifications = [];
  if (matches.length > 0) {
    for (const match of matches.slice(0, 3)) {
      const notification = await Notification.create({
        userId: req.user.id,
        type: NOTIFICATION_TYPES.MATCH_FOUND,
        title: "Potential Match Found",
        message: `We found a ${match.matchScore}% match for your lost ${lostItem.name}. Please check ${match.foundItem.department}.`,
        data: {
          lostItemId: lostItem._id,
          foundItemId: match.foundItem._id,
          matchScore: match.matchScore,
          adminId: match.foundItem.adminId,
        },
        priority: match.matchScore > 85 ? "high" : "medium",
      });

      matchNotifications.push(notification);

      await emailService.sendMatchNotification(
        req.user.email,
        req.user.name,
        lostItem,
        match.foundItem,
        match.foundItem.department
      );

      const io = req.app.get("socket.io");
      if (io) {
        io.sendNotificationToUser(req.user.id, {
          ...notification.toObject(),
          foundItem: match.foundItem,
        });
      }
    }
  }

  const populatedItem = await LostItem.findById(lostItem._id).populate(
    "userId",
    "name email"
  );

  res.status(201).json(
    new ApiResponse(
      201,
      {
        lostItem: populatedItem,
        matches: matches.slice(0, 3),
        matchNotifications,
      },
      matches.length > 0
        ? `Lost item submitted successfully! Found ${matches.length} potential match(es).`
        : "Lost item submitted successfully. We will notify you if any matches are found."
    )
  );
});

export const getMyLostItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;

  const query = {
    userId: req.user.id,
    isActive: true,
  };

  if (status) {
    query.status = status;
  }

  const lostItems = await LostItem.find(query)
    .populate("matchedFoundItemId", "name department adminId")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await LostItem.countDocuments(query);
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
      "Item fetched successfully"
    )
  );
});

export const getLostItem = asyncHandler(async (req, res, next) => {
  const lostItem = await LostItem.findById(req.params.id)
    .populate("userId", "name email")
    .populate("matchedFoundItemId", "name department adminId");

  if (!lostItem) {
    throw new ApiError(404, "Lost Item not found");
  }
  if (lostItem.userId._id.toString() !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "Access denied");
  }
  res.status(200).json(
    new ApiResponse(
    200,
    {
      data: lostItem,
    },
    "data fetched successfully"
  )
  );
});

export const updateLostItem = asyncHandler(async (req, res) => {
  let lostItem = await LostItem.findById(req.params.id);
  if (!lostItem) {
    throw new ApiError(404,"Lost Item not found");
  } 
  //check ownership
  if (lostItem.userId.toString() !== req.user.id) {
    throw new ApiError(
      403,
      "Access denied. You can only update your own items."
    );
  }

  if (lostItem.status !== ITEM_STATUS.PENDING) {
    throw new ApiError(
      400,
      "Cannot update item that has already been processed"
    );
  }

  lostItem = await LostItem.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate("userId", "name email");

  const matches = await matchingService.findMatchesForLostItem(
    lostItem._id,
    70
  );
  res.status(200).json(
    new ApiResponse(
      200,
      {
        lostItem,
        newMatches: matches.slice(0, 3),
      },
      "Lost item updated successfully"
    )
  );
});

export const deleteLostItem = asyncHandler(async (req, res) => {
  const lostItem = await LostItem.findById(req.params.id);
  if (!lostItem) {
    throw new ApiError(404, "Lost Item not found");
  }

  if (lostItem.userId.toString() !== req.user.id) {
    throw new ApiError(
      403,
      "Access denied. You can only delete your own items."
    );
  }

  // Soft delete (mark as inactive)
  lostItem.isActive = false;
  await lostItem.save();
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Lost item deleted successfully"));
});

export const markAsCollected = asyncHandler(async (req, res) => {
  const lostItem = await LostItem.findById(req.params.id).populate(
    "userId",
    "name email"
  );

  if (!lostItem) {
    throw new ApiError(404, "Lost Item not found");
  }

  if (lostItem.status !== ITEM_STATUS.FOUND) {
    throw new ApiError(
      400,
      "Item must be in 'found' status to mark as collected"
    );
  }
  lostItem.status = ITEM_STATUS.COLLECTED;
  await lostItem.save();

  //create notification for the user
  await Notification.create({
    userId: lostItem.userId._id, //is this correct to write ?
    type: NOTIFICATION_TYPES.ITEM_RETURNED,
    title: "Item Successfully Returned",
    message: `Your ${lostItem.name} has been successfully returned to you.`,
    data: {
      lostItemId: lostItem._id,
      adminId: req.user.id,
    },
    priority: "high",
  });

  await emailService.sendItemReturnedConfirmation(
    lostItem.userId.email,
    lostItem.userId.name,
    lostItem.name
  );

  // Send real-time notification
  const io = req.app.get("socketio");
  if (io) {
    io.sendNotificationToUser(lostItem.userId._id, {
      type: NOTIFICATION_TYPES.ITEM_RETURNED,
      title: "Item Successfully Returned",
      message: `Your ${lostItem.name} has been successfully returned.`,
      priority: "High",
      timestamp: new Date(),
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          data: lostItem,
        },
        "Item marked as collected successfully"
      )
    );
  }
});

export const searchLostItems = asyncHandler(async (req, res) => {
  const { q, category, color, dateFrom, dateTo } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  let query = {
    isActive: true,
  };

  // Text search
  if (q) {
    query.$text = { $search: q };
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by color
  if (color) {
    query.color = color;
  }

  // Date range filter
  if (dateFrom || dateTo) {
    query.dateLost = {};
    if (dateFrom) query.dateLost.$gte = new Date(dateFrom);
    if (dateTo) query.dateLost.$lte = new Date(dateTo);
  }

  const lostItems = await LostItem.find(query)
    .populate("userId", "name email")
    .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await LostItem.countDocuments(query);
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
      "item search successfully"
    )
  );
});
