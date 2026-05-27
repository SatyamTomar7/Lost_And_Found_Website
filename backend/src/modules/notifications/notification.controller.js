import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../../config/constants.js";
import { buildMatchNotificationMessage } from "../matching/match-notification-message.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { Notification } from "./Notification.model.js";
export const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const query = { userId: req.user.id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("data.lostItemId", "name  color")
      .populate("data.foundItemId", "name color block originalBlock placeFound handledBy")
      .populate("data.createdBy", "name role block")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user.id, isRead: false }),
  ]);

  const hydratedNotifications = notifications.map((notification) => {
    if (
      notification.type === NOTIFICATION_TYPES.MATCH_FOUND &&
      notification.data?.lostItemId?.name &&
      notification.data?.foundItemId
    ) {
      return {
        ...notification,
        message: buildMatchNotificationMessage(
          notification.data.lostItemId.name,
          notification.data.matchScore,
          notification.data.foundItemId
        ),
      };
    }

    return notification;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications: hydratedNotifications,
        unreadCount,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
      "Notifications fetched successfully"
    )
  );
});
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = {
    userId: req.user.id,
    isRead: false,
  };

  // mark single notification
  if (id.toLowerCase() !== "all") {
    query._id = id;
  }

  const result = await Notification.updateMany(query, {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  });

  const newUnreadCount = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false,
  });

  if (
    id.toLowerCase() !== "all" &&
    result.matchedCount === 0
  ) {
    throw new ApiError(
      404,
      "Notification not found or already read"
    );
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        updatedCount: result.modifiedCount,
        newUnreadCount,
      },
      id.toLowerCase() === "all"
        ? "All notifications marked as read"
        : "Notification marked as read"
    )
  );
});


export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await Notification.updateMany(
    { userId, isRead: false },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        modifiedCount: result.modifiedCount,
        unreadCount: 0,
      },
      result.modifiedCount > 0
        ? `Marked ${result.modifiedCount} notifications as read`
        : "No unread notifications to mark"
    )
  );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    userId: req.user.id,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found or unauthorized");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { id }, "Notification deleted successfully"));
});

export const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const stats = await Notification.aggregate([
    { $match: { userId } },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
            },
          },
        ],

        byType: [
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              unreadCount: {
                $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
              },
            },
          },
        ],
      },
    },
  ]);

  const overview = stats[0]?.overall[0] || { total: 0, unread: 0 };
  const typeBreakdown = stats[0]?.byType || [];

  res.status(200).json(
    new ApiResponse(
      200,
      {
        total: overview.total,
        unread: overview.unread,
        byType: typeBreakdown,
      },
      "Notification stats fetched successfully"
    )
  );
});
