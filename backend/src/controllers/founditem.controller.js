import { NOTIFICATION_TYPES } from "../constants.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { LostItem } from "../models/LostItem.model.js";
import { emailService } from "../services/email.service.js";
import matchingService from "../services/matching.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/Notification.model.js";

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
