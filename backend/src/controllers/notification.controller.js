import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/Notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const isRead = req.query.isRead;

  const query = { userId: req.user.id };
  if (isRead !== undefined) {
    query.isRead = isRead === "true";
  }
  const notifications = await Notification.find(query)
    .populate("data.lostItemId", "name category color")
    .populate("data.foundItemId", "name category color department")
    .populate("data.adminId", "name department")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false,
  });
  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: notifications.length,
        unreadCount,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
        data: notifications,
      },
      "Motification Fetched Successfully"
    )
  );
});

// export const markAsRead = asyncHandler(async (req, res) => {
//   const notification = await Notification.findById(req.params.id);
//   if (!notification) throw new ApiError(404, "Notification not found");
//   if (notification.userId.toString() !== req.user.id) {
//     throw new ApiError(403, "Access denied");
//   }
//   await notification.markAsRead();

//   res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         data: notification,
//       },
//       "Notification marked as read"
//     )
//   );
// });

export const markAsRead = asyncHandler(async (req, res) => {
  // Find and update in one go, ensuring the user owns the notification
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id }, 
    { $set: { isRead: true } }, // Or whatever your method does internally
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found or unauthorized");
  }

  res.status(200).json(
    new ApiResponse(200, { id: notification._id }, "Notification marked as read")
  );
});



export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: { modifiedCount: result.modifiedCount } },
        `Marked ${result.modifiedCount} notifications as read`
      )
    );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification =await Notification.findById(req.params.id);
  if (!notification) throw new ApiError(404, "Notification not found");
  if (notification.userId.toString() !== req.user.id) {
    throw new ApiError(403, "Access denied");
  }
  await notification.deleteOne();
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Notification deleted successfully"));
});

export const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await Notification.aggregate([
    { $match: { userId: userId } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
        },
      },
    },
  ]);
  const totalNotifications = await Notification.countDocuments({ userId });
  const totalUnread = await Notification.countDocuments({
    userId,
    isRead: false,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: {
          total: totalNotifications,
          unread: totalUnread,
          byType: stats,
        },
      },
      "Notification stats fetched successfully"
    )
  );
});
