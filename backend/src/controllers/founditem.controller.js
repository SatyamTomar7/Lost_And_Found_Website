import { NOTIFICATION_TYPES } from "../constants.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { LostItem } from "../models/LostItem.model.js";
import { emailService } from "../services/email.service.js";
import matchingService from "../services/matching.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Notification } from "../models/Notification.model.js";
import { isValidObjectId } from "mongoose";

export const addFoundItem = asyncHandler(async (req, res) => {
  //prepare foundItem data
  const foundItemData = {
    ...req.body,
    adminId: req.user.id,
    department: req.user.department,
  };
  //add image info into images array if provided
  if (req.body.photoUrl && req.body.photoPublicId) {
    foundItemData.images = [
      {
        url: req.body.photoUrl,
        public: req.body.photoPublicId,
      },
    ];
  }
  //create found Item document
  const foundItem = await FoundItem.create(foundItemData);

  //check for potential matched immediately
  const matches = await matchingService.findMatchesForFoundItem(
    foundItem._id,
    70
  );

  let matchNotifications = [];
  if (matches.length > 0) {
    //create notification for matches
    for (const match of matches.slice(0, 5)) {
      const notification = await Notification.create({
        userId: match.lostItem.userId._id,
        type: NOTIFICATION_TYPES.MATCH_FOUND,
        title: "Your Lost Item Might Be Found!",
        message: `We found a ${match.matchScore}% match for your lost ${match.lostItem.name} in ${req.user.department}.`,
        data: {
          lostItemId: match.lostItem._id,
          foundItemId: foundItem._id,
          matchScore: match.matchScore,
          adminId: req.user.id,
        },
        priority: match.matchScore > 85 ? "high" : "medium",
      });
      matchNotifications.push({
        ...notification.toObject(),
        lostItem: match.lostItem,
      });

      await emailService.sendMatchNotification(
        match.lostItem.userId.email,
        match.lostItem.userId.name,
        match.lostItem,
        foundItem,
        req.user.department
      );
      const io = req.app.get("socketio");
      if (io) {
        io.sendNotificationToUser(match.lostItem.userId._id, {
          ...notification.toObject(),
          foundItem: foundItem,
        });
      }
    }
  }

  const populatedItem = await FoundItem.findById(foundItem._id).populate(
    "adminId",
    "name department"
  );

  res.status(201).json(
    new ApiResponse(
      201,
      {
        data: {
          foundItem: populatedItem,
          matches: matches.slice(0, 5),
          matchNotifications,
        },
      },
      matches.length > 0
        ? `Found item added successfully! Notified ${matches.length} potential owner(s).`
        : "Found item added successfully."
    )
  );
});
export const getDepartmentFoundItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;

  const query = {
    department: req.user.department,
    isActive: true,
  };
  if (status) query.status = status;
  const foundItems = await FoundItem.find(query)
    .populate("adminId", "name")
    .populate("claimedBy", "name email")
    .populate("matchedLostItemId", "name userID")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await FoundItem.countDocuments(query);
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
      "Data fetched successfully"
    )
  );
});
export const getFoundItem = asyncHandler(async (req, res) => {
  const foundItem = await FoundItem.findById(req.params.id)
    .populate("adminId", "name department")
    .populate("claimedBy", "name email")
    .populate("matchedLostItemId", "name userId");

  if (!foundItem) {
    throw new ApiError(404, "Found item not found");
  }
  if (
    req.user.role === "admin" &&
    foundItem.department !== req.user.department
  ) {
    throw new ApiError(
      403,
      "Access denied. You can only view items from your department."
    );
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: foundItem,
      },
      "Data fetched successfully"
    )
  );
});
