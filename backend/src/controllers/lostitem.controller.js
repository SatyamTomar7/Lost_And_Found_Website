import { LostItem } from "../models/LostItem.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import matchingService from "../services/matching.service.js";
import { emailService } from "../services/email.service.js";
import { Notification } from "../models/Notification.model.js";
import { ITEM_STATUS, NOTIFICATION_TYPES } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";

export const submitLostItem = asyncHandler(async (req, res) => {
  // 1. Prepare and Create
  const lostItemData = {
    ...req.body,
    userId: req.user.id,
    images:
      req.body.photoUrl && req.body.photoPublicId
        ? [{ url: req.body.photoUrl, publicId: req.body.photoPublicId }]
        : [],
  };

  // Create and populate in memory to avoid a second findById call
  const lostItem = await LostItem.create(lostItemData);
  await lostItem.populate("userId", "name email");

  // 2. Find Matches
  const matches = await matchingService.findMatchesForLostItem(
    lostItem._id,
    70
  );
  const topMatches = matches.slice(0, 3);

  let matchNotifications = [];

  if (topMatches.length > 0) {
    const io = req.app.get("socket.io");

    // 3. Parallel Processing (The "Now" standard)
    // We start all notifications and emails simultaneously
    matchNotifications = await Promise.all(
      topMatches.map(async (match) => {
        const notification = await Notification.create({
          userId: req.user.id,
          type: NOTIFICATION_TYPES.MATCH_FOUND,
          title: "Potential Match Found",
          message: `We found a ${match.matchScore}% match for your lost ${lostItem.name} in ${match.foundItem.department}.`,
          data: {
            lostItemId: lostItem._id,
            foundItemId: match.foundItem._id,
            matchScore: match.matchScore,
          },
          priority: match.matchScore > 85 ? "high" : "medium",
        });

        // Background Task: Email
        emailService
          .sendMatchNotification(
            req.user.email,
            req.user.name,
            lostItem,
            match.foundItem,
            match.foundItem.department
          )
          .catch((err) => console.error("Match Email Failed:", err));

        // Background Task: Socket
        if (io) {
          io.sendNotificationToUser(req.user.id, {
            ...notification.toObject(),
            foundItem: match.foundItem,
          });
        }

        return notification;
      })
    );
  }

  // 4. Response
  res.status(201).json(
    new ApiResponse(
      201,
      {
        lostItem,
        matches: topMatches,
        matchNotifications,
      },
      matches.length > 0
        ? `Submitted! Found ${matches.length} potential matches.`
        : "Submitted successfully. We'll notify you of matches."
    )
  );
});

export const getMyLostItems = asyncHandler(async (req, res) => {
  // 1. Sanitize Pagination
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const { status } = req.query;

  // 2. Build Query
  const query = {
    userId: req.user.id,
    isActive: true,
  };
  if (status) query.status = status;

  // 3. Execute in Parallel (The "Now" standard)
  const [lostItems, total] = await Promise.all([
    LostItem.find(query)
      // UPDATED: Populate the array of IDs and include nested admin details if needed
      .populate({
        path: "matchedFoundItemIds",
        select: "name department adminId status",
        populate: { path: "adminId", select: "name department" },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(), // lean() makes it a plain JS object, much faster for reading
    LostItem.countDocuments(query),
  ]);

  // 4. Calculate Metadata
  const totalPages = Math.ceil(total / limit);

  // 5. Response
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

  // 1. Build an Authorized Query
  const query = { _id: id };

  // Security check: Only the owner or an admin can view the details
  if (req.user.role !== "admin") {
    query.userId = req.user.id;
  }

  // 2. Optimized Fetch with Deep Population
  const lostItem = await LostItem.findOne(query)
    .populate("userId", "name email")
    // UPDATED: Changed to array field and added admin population for matches
    .populate({
      path: "matchedFoundItemIds",
      select: "name department adminId status createdAt",
      populate: { path: "adminId", select: "name department" },
    })
    .lean();

  // 3. Simple Error Handling
  if (!lostItem) {
    throw new ApiError(404, "Lost item not found or access denied");
  }

  // 4. Response
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
export const updateLostItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Destructure allowed fields only
  const { name, color, condition, dateLost, placeLost, description } = req.body;
  const updateData = {
    name,
    color,
    condition,
    dateLost,
    placeLost,
    description,
  };

  // 2. Atomic Update with Security Filter
  // We only update if the ID matches, the USER matches, and the status is PENDING
  const lostItem = await LostItem.findOneAndUpdate(
    {
      _id: id,
      userId: req.user.id,
      status: ITEM_STATUS.PENDING,
    },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  ).populate("userId", "name email");

  // 3. Handle Unauthorized/Not Found/Invalid Status
  if (!lostItem) {
    throw new ApiError(
      400,
      "Item not found, unauthorized, or already processed."
    );
  }

  // 4. Re-run matching with updated data
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
  const { id } = req.params;

  // 1. Atomic Soft Delete
  // We only match the item if it belongs to the user AND is currently active
  const lostItem = await LostItem.findOneAndUpdate(
    {
      _id: id,
      userId: req.user.id,
      isActive: true,
    },
    {
      $set: { isActive: false },
    },
    { new: true }
  );

  // 2. Response Handling
  // If no item was found matching those criteria, we throw a 404
  if (!lostItem) {
    throw new ApiError(404, "Lost item not found or already deleted");
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Lost item deleted successfully"));
});
export const markAsCollected = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Atomic Update & Verification
  // We only update if status is currently 'FOUND'
  const lostItem = await LostItem.findOneAndUpdate(
    {
      _id: id,
      status: ITEM_STATUS.FOUND,
    },
    {
      $set: { status: ITEM_STATUS.COLLECTED },
    },
    { new: true }
  ).populate("userId", "name email");

  if (!lostItem) {
    throw new ApiError(400, "Item not found or it's not in 'found' status");
  }

  // 2. Background Tasks (The "Now" standard)
  // We create notifications and emails in the background
  const triggerNotifications = async () => {
    try {
      // Create DB Notification
      const notification = await Notification.create({
        userId: lostItem.userId._id,
        type: NOTIFICATION_TYPES.ITEM_RETURNED,
        title: "Item Successfully Returned",
        message: `Your ${lostItem.name} has been successfully returned to you.`,
        data: { lostItemId: lostItem._id, adminId: req.user.id },
        priority: "high",
      });

      // Send Email
      emailService.sendItemReturnedConfirmation(
        lostItem.userId.email,
        lostItem.userId.name,
        lostItem.name
      );

      // Real-time Socket
      const io = req.app.get("socketio");
      if (io) {
        io.sendNotificationToUser(lostItem.userId._id, {
          ...notification.toObject(),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Background Notification Error:", error);
    }
  };

  // Execute background tasks without 'await' to speed up the API response
  triggerNotifications();

  // 3. Guaranteed Immediate Response
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: lostItem },
        "Item marked as collected successfully"
      )
    );
});

export const searchLostItems = asyncHandler(async (req, res) => {
  const { q, color, dateFrom, dateTo } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  // 1. Build Query Object
  const query = { isActive: true };

  // Fuzzy Search (Partial matches for name or description)
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  if (color) query.color = color;

  // Date Range
  if (dateFrom || dateTo) {
    query.dateLost = {};
    if (dateFrom) query.dateLost.$gte = new Date(dateFrom);
    if (dateTo) query.dateLost.$lte = new Date(dateTo);
  }

  // 2. Execute Parallel Queries (The "Now" standard)
  const [lostItems, total] = await Promise.all([
    LostItem.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(), // Performance boost for read-only lists
    LostItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: lostItems.length,
        pagination: { page, pages: totalPages, total, limit },
        data: lostItems,
      },
      "Items searched successfully"
    )
  );
});
