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
  const {
    name,
    color,
    category,
    dateFound,
    placeFound,
    photoUrl,
    photoPublicId,
  } = req.body;

  // 1. Prepare and create foundItem
  const foundItemData = {
    name,
    color,
    category,
    dateFound,
    placeFound,
    adminId: req.user.id,
    department: req.user.department,
    images: photoUrl ? [{ url: photoUrl, public: photoPublicId }] : [],
  };

  const foundItem = await FoundItem.create(foundItemData);

  // 2. Immediate Match Check
  const matches = await matchingService.findMatchesForFoundItem(
    foundItem._id,
    70
  );
  const topMatches = matches.slice(0, 5);

  // 3. Process Notifications and Emails in parallel (optimization)
  let matchNotifications = [];
  if (topMatches.length > 0) {
    const io = req.app.get("socketio");

    matchNotifications = await Promise.all(
      topMatches.map(async (match) => {
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

        // Background tasks: Don't strictly need to await these for the HTTP response
        emailService
          .sendMatchNotification(
            match.lostItem.userId.email,
            match.lostItem.userId.name,
            match.lostItem,
            foundItem,
            req.user.department
          )
          .catch((err) => console.error("Email Error:", err));

        if (io) {
          io.sendNotificationToUser(match.lostItem.userId._id, {
            ...notification.toObject(),
            foundItem,
          });
        }

        return { ...notification.toObject(), lostItem: match.lostItem };
      })
    );
  }

  // 4. Final Population for Response
  const populatedItem = await foundItem.populate("adminId", "name department");

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
  // 1. Parse and sanitize inputs
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const { status } = req.query;

  // 2. Build Query
  const query = {
    department: req.user.department,
    isActive: true,
  };
  if (status) query.status = status;

  // 3. Execute in Parallel (Major Performance Gain)
  const [foundItems, total] = await Promise.all([
    FoundItem.find(query)
      .populate("adminId", "name")
      .populate("claimedBy", "name email")
      .populate("matchedLostItemId", "name userID")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(), // Added .lean() for faster, read-only performance
    FoundItem.countDocuments(query),
  ]);

  // 4. Calculate Meta
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
  const { id } = req.params;

  // 1. Build a secure query
  // If the user is an admin, they can only "find" it if it belongs to their department
  const query = { _id: id };
  if (req.user.role === "admin") {
    query.department = req.user.department;
  }

  // 2. Execute query with .lean() for performance
  const foundItem = await FoundItem.findOne(query)
    .populate("adminId", "name department")
    .populate("claimedBy", "name email")
    .populate("matchedLostItemId", "name userId")
    .lean();

  // 3. Simple error handling
  if (!foundItem) {
    // This will trigger if the ID is wrong OR if the department doesn't match
    throw new ApiError(404, "Found item not found or access denied");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, { data: foundItem }, "Data fetched successfully")
    );
});

export const updateFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Destructure only the fields allowed to be updated
  // Prevents users from overwriting adminId or department
  const { name, color, category, dateFound, placeFound, status } = req.body;
  const updateData = { name, color, category, dateFound, placeFound, status };

  // 2. Perform Atomic Update
  // We include department in the filter to ensure security in one step
  const foundItem = await FoundItem.findOneAndUpdate(
    {
      _id: id,
      department: req.user.department, // Security: prevents updating other dept items
    },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  ).populate("adminId", "name department");

  // 3. Handle result
  if (!foundItem) {
    // If null, either the ID is wrong OR it's not in the user's department
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
  const { claimedByUserId } = req.body;

  // 1. Update FoundItem in one step
  // We include department security in the filter
  const foundItem = await FoundItem.findOneAndUpdate(
    {
      _id: id,
      department: req.user.department,
    },
    {
      $set: {
        status: ITEM_STATUS.RETURNED,
        claimedBy: claimedByUserId,
        claimedAt: new Date(),
        returnedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  )
    .populate("adminId", "name department")
    .populate("claimedBy", "name email");

  if (!foundItem) {
    throw new ApiError(404, "Found item not found or access denied");
  }

  // 2. Link with LostItem if applicable
  // We don't need to 'await' the populated fetch again later
  if (foundItem.matchedLostItemId) {
    await LostItem.findByIdAndUpdate(foundItem.matchedLostItemId, {
      $set: {
        status: ITEM_STATUS.COLLECTED,
        matchedFoundItemId: foundItem._id,
      },
    });
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: foundItem },
        "Item marked as returned successfully"
      )
    );
});
export const markAsUnclaimed = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Update and Security Check in one go
  // The query filter ensures the item exists AND belongs to the admin's department
  const foundItem = await FoundItem.findOneAndUpdate(
    {
      _id: id,
      department: req.user.department,
    },
    {
      $set: { status: ITEM_STATUS.UNCLAIMED },
      // Optional: Clear claiming data if previously present
      $unset: { claimedBy: "", claimedAt: "", returnedAt: "" },
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate("adminId", "name department");

  // 2. Error handling
  if (!foundItem) {
    throw new ApiError(
      404,
      "Found item not found or you lack permission for this department"
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: foundItem },
        "Item marked as unclaimed successfully"
      )
    );
});
export const deleteFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Perform Atomic Soft Delete
  // Filters by ID AND department to ensure the admin is authorized
  const foundItem = await FoundItem.findOneAndUpdate(
    {
      _id: id,
      department: req.user.department,
      isActive: true, // Optimization: Don't try to delete if already deleted
    },
    {
      $set: { isActive: false },
    },
    { new: true }
  );

  // 2. Direct check
  if (!foundItem) {
    throw new ApiError(
      404,
      "Found item not found or you lack permission to delete it"
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Found item deleted successfully"));
});
export const searchFoundItems = asyncHandler(async (req, res) => {
  const { q, category, color, department, dateFrom, dateTo } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  let query = { isActive: true };

  // If admin, filter by their department
  if (req.user.role === "admin") {
    query.department = req.user.department;
  } else if (department) {
    query.department = department;
  }

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
    query.dateFound = {};
    if (dateFrom) query.dateFound.$gte = new Date(dateFrom);
    if (dateTo) query.dateFound.$lte = new Date(dateTo);
  }

  const foundItems = await FoundItem.find(query)
    .populate("adminId", "name department")
    .populate("claimedBy", "name email")
    .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
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
      "Items searched successfully"
    )
  );
});
