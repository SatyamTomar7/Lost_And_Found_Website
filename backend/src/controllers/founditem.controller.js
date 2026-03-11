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
  const {
    name,
    color,
    dateFound,
    placeFound,
    photoUrl,
    photoPublicId,
    brand,
    condition,
  } = req.body;

  // 1. Prepare and create foundItem
  const foundItemData = {
    name,
    color,
    dateFound,
    placeFound,
    brand,
    condition,
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

  // 2. Build Query - Filtering by the admin's department
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
      // UPDATED: Populate the array of potential lost item matches
      .populate({
        path: "matchedLostItemIds",
        select: "name userId category status createdAt",
        // Deep populate userId to see the name/email of the person who lost it
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(),
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
      foundItems.length > 0
        ? "Department data fetched"
        : "No items found for this department"
    )
  );
});

export const getFoundItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Build a secure query
  // Security check: Admins can only view items assigned to their specific department
  const query = { _id: id };
  if (req.user.role === "admin") {
    query.department = req.user.department;
  }

  // 2. Execute query with Deep Population
  const foundItem = await FoundItem.findOne(query)
    .populate("adminId", "name department")
    .populate("claimedBy", "name email")
    // UPDATED: Populate the array of potential matches
    .populate({
      path: "matchedLostItemIds",
      select: "name userId status  createdAt",
      // Deep populate to see who lost each matching item
      populate: { path: "userId", select: "name email" },
    })
    .lean();

  // 3. Simple error handling
  if (!foundItem) {
    throw new ApiError(
      404,
      "Found item not found or access denied for your department"
    );
  }

  // 4. Response
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

  // 1. Destructure only the fields allowed to be updated
  // Prevents users from overwriting adminId or department
  const { name, color, condition, dateFound, placeFound, status, brand } =
    req.body;
  const updateData = {
    name,
    color,
    condition,
    dateFound,
    placeFound,
    status,
    brand,
  };

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
  const { id } = req.params; // FoundItem ID
  const { lostItemId, claimedByUserId } = req.body;
  if (!lostItemId || !claimedByUserId) {
    throw new ApiError(
      400,
      "Lost Item ID and Claimant ID are required for handover"
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Update the FoundItem
    // Array ko clear kar rahe hain aur final matched ID set kar rahe hain
    const foundItem = await FoundItem.findOneAndUpdate(
      { _id: id, department: req.user.department, status: ITEM_STATUS.FOUND },
      {
        $set: {
          status: ITEM_STATUS.RETURNED,
          claimedBy: claimedByUserId,
          matchedLostItemId: lostItemId, // Ye final 1-to-1 link hai
          returnedAt: new Date(),
          matchedLostItemIds: [], // Cleanup: Potential matches ab valid nahi rahe
        },
      },
      { new: true, session, runValidators: true }
    ).populate("claimedBy", "name email");

    if (!foundItem) {
      throw new ApiError(404, "Found item not found or access denied");
    }

    // 2. Update the specific LostItem
    const lostUpdate = await LostItem.findOneAndUpdate(
      { _id: lostItemId, userId: claimedByUserId },
      {
        $set: {
          status: ITEM_STATUS.COLLECTED, // Ya COLLECTED jo bhi aapka constant ho
          matchedFoundItemId: foundItem._id, // Final 1-to-1 link
          matchedFoundItemIds: [], // Cleanup potential matches for this specific item
        },
      },
      { session, new: true }
    );

    if (!lostUpdate) {
      throw new ApiError(
        400,
        "Specific lost item record not found or user mismatch"
      );
    }

    // 3. GLOBAL CLEANUP (Many-to-Many Cleanup)
    // Ye FoundItem ab system se bahar hai, isliye ise baaki sabhi LostItems ke
    // "potential matches" array se nikal dena chahiye.
    await LostItem.updateMany(
      { matchedFoundItemIds: foundItem._id },
      { $pull: { matchedFoundItemIds: foundItem._id } },
      { session }
    );

    // Same for FoundItems (Agar ye LostItem kisi aur FoundItem se match ho raha tha)
    await FoundItem.updateMany(
      { matchedLostItemIds: lostItemId },
      { $pull: { matchedLostItemIds: lostItemId } },
      { session }
    );

    await session.commitTransaction();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { foundItem },
          "Item returned and all related potential matches cleared"
        )
      );
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
});

export const markAsUnclaimed = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Update the FoundItem
    // Status change karein aur potential matches ke arrays ko clear kar dein
    const foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        department: req.user.department,
        status: ITEM_STATUS.FOUND,
      },
      {
        $set: {
          status: ITEM_STATUS.UNCLAIMED,
          matchedLostItemIds: [], // Ab ye kisi se match nahi ho raha
        },
        $unset: {
          claimedBy: "",
          claimedAt: "",
          returnedAt: "",
          matchedLostItemId: "", // Final match field bhi clear karein agar thi toh
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      }
    ).populate("adminId", "name department");

    if (!foundItem) {
      throw new ApiError(
        404,
        "Found item not found or you lack permission for this department"
      );
    }

    // 2. Global Cleanup in LostItem Collection
    // Jitne bhi Lost Items is Found Item ko "Potential Match" dikha rahe the,
    // wahan se iski ID remove ($pull) karein taaki user ka UI update ho jaye.
    await LostItem.updateMany(
      { matchedFoundItemIds: id },
      { $pull: { matchedFoundItemIds: id } },
      { session }
    );

    await session.commitTransaction();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { data: foundItem },
          "Item marked as unclaimed and all potential links removed"
        )
      );
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
});
export const markAsCollectedOffline = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: id,
        department: req.user.department,
        status: ITEM_STATUS.FOUND, // only allow if still active
      },
      {
        $set: {
          status: ITEM_STATUS.OFFLINE_RETURNED,
          returnedAt: new Date(),
          matchedLostItemIds: [], // stop matching
        },
        $unset: {
          claimedBy: "",
          matchedLostItemId: "",
        },
      },
      { new: true, session, runValidators: true }
    ).populate("adminId", "name department");

    if (!foundItem) {
      throw new ApiError(
        404,
        "Found item not found, access denied, or already resolved"
      );
    }

    // Remove this found item from all lost items' potential match arrays
    await LostItem.updateMany(
      { matchedFoundItemIds: id },
      { $pull: { matchedFoundItemIds: id } },
      { session }
    );

    await session.commitTransaction();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { data: foundItem },
          "Item marked as collected offline. All potential matches cleared."
        )
      );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to mark item as collected offline"
    );
  } finally {
    session.endSession();
  }
});
export const getMatchedLostItemsForItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const foundItem = await FoundItem.findOne({
    _id: id,
    department: req.user.department,
  })
    .select("matchedLostItemIds name")
    .populate({
      path: "matchedLostItemIds",
      select: "name color placeLost dateLost userId status",
      populate: {
        path: "userId",
        select: "name email",
      },
    });

  if (!foundItem) {
    throw new ApiError(404, "Found item not found or access denied");
  }

  if (
    !foundItem.matchedLostItemIds ||
    foundItem.matchedLostItemIds.length === 0
  ) {
    return res
      .status(200)
      .json(new ApiResponse(200, { data: [] }, "No matched lost items found"));
  }

  // Filter out already returned/resolved lost items
  const activeMatches = foundItem.matchedLostItemIds.filter(
    (lostItem) =>
      lostItem.status !== "Returned" && lostItem.status !== "Collected"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: activeMatches },
        "Matched lost items fetched successfully"
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
  const { q, color, department, dateFrom, dateTo } = req.query;
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
