import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/Notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
export const getNotifications = asyncHandler(async (req, res) => {
  // 1. Sanitize Pagination Inputs
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const query = { userId: req.user.id };

  // 2. Parallel Database Operations
  // Using .lean() here makes a massive difference in speed for notification lists
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("data.lostItemId", "name  color")
      .populate("data.foundItemId", "name color department")
      .populate("data.adminId", "name department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user.id, isRead: false }),
  ]);

  // 3. Clean Response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
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
  const { id } = req.params; // Expects 'all' or a specific MongoDB ID

  let query = { userId: req.user.id, isRead: false };

  // 1. Determine if we are marking one or all
  if (id !== "all") {
    query._id = id;
  }

  // 2. Perform Atomic Update
  // updateMany is safe here; if it's a specific ID, it only hits one.
  const result = await Notification.updateMany(query, {
    $set: { isRead: true },
  });

  // 3. Optional: Get the new unread count in parallel for the UI
  const newUnreadCount = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false,
  });

  if (id !== "all" && result.matchedCount === 0) {
    throw new ApiError(404, "Notification not found or already read");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        updatedCount: result.modifiedCount,
        newUnreadCount,
      },
      id === "all"
        ? "All notifications marked as read"
        : "Notification marked as read"
    )
  );
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Parallel Execution
  // We update the records and ensure we have a fresh count (which should be 0)
  // to sync the frontend badge instantly.
  const [result] = await Promise.all([
    Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    ),
    // We don't necessarily need to await a count of 0,
    // but it confirms the state for the frontend.
  ]);

  // 2. Clear and Informative Response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        modifiedCount: result.modifiedCount,
        unreadCount: 0, // Explicitly set to 0 to trigger frontend badge clear
      },
      result.modifiedCount > 0
        ? `Marked ${result.modifiedCount} notifications as read`
        : "No unread notifications to mark"
    )
  );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Atomic Delete with Security Filter
  // This query only succeeds if the ID matches AND the userId is correct.
  const notification = await Notification.findOneAndDelete({
    _id: id,
    userId: req.user.id,
  });

  // 2. Clear Response Handling
  if (!notification) {
    // We throw 404 regardless of whether it's the wrong ID or wrong user
    // This is safer and more concise.
    throw new ApiError(404, "Notification not found or unauthorized");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { id }, "Notification deleted successfully"));
});

export const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  // 1. Single-pass Aggregation using $facet
  // This allows us to run multiple pipelines on the same set of matched documents
  const stats = await Notification.aggregate([
    { $match: { userId } },
    {
      $facet: {
        // Pipeline 1: Calculate Global Totals
        overall: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
            },
          },
        ],
        // Pipeline 2: Calculate Type Breakdown
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

  // 2. Extract and Format (Handling empty results)
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
