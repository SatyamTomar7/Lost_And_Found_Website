import mongoose from "mongoose";

import { USER_ROLES } from "../../config/constants.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import {
  decodeCursor,
  encodeCursor,
  getCursorFilter,
  getPageLimit,
} from "../../shared/pagination/cursor.js";

import { User } from "../auth/User.model.js";
import { FoundItem } from "../found-items/FoundItem.model.js";
import { LostItem } from "../lost-items/LostItem.model.js";

import { reconcileLostItemStatus } from "../matching/reconcile-match-status.js";

const ensureObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid resource id");
  }
};

/**
 * Reconcile FoundItem status after one of its matched LostItems
 * has been deleted/unmatched.
 *
 * A FoundItem can have multiple matched LostItems.
 *
 * If at least one LostItem remains matched:
 *    status = "matched"
 *
 * If no LostItems remain:
 *    status = "found"
 */
const reconcileFoundItemStatus = async (foundItemId, session) => {
  const foundItem = await FoundItem.findById(
    foundItemId,
    "matchedLostItemIds",
    { session }
  );

  if (!foundItem) {
    return;
  }

  const status = foundItem.matchedLostItemIds?.length > 0 ? "matched" : "found";

  await FoundItem.updateOne(
    { _id: foundItemId },
    { $set: { status } },
    { session }
  );
};

export const deleteStudent = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const student = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      role: USER_ROLES.STUDENT,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
      },
    },
    {
      new: true,
    }
  );

  if (!student) {
    throw new ApiError(404, "Student not found or already deleted");
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Student deleted successfully"));
});

export const deleteLostItem = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Soft delete the LostItem
    const lostItem = await LostItem.findOneAndUpdate(
      {
        _id: req.params.id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
      {
        new: true,
        session,
      }
    );

    if (!lostItem) {
      throw new ApiError(404, "Lost item not found or already deleted");
    }

    // 2. Find all FoundItems that were matched with this LostItem
    const affectedFoundItems = await FoundItem.find(
      {
        matchedLostItemIds: req.params.id,
      },
      "_id",
      { session }
    );

    // 3. Remove the deleted LostItem ID from all affected FoundItems
    await FoundItem.updateMany(
      {
        matchedLostItemIds: req.params.id,
      },
      {
        $pull: {
          matchedLostItemIds: req.params.id,
        },
      },
      { session }
    );

    // 4. Reconcile every affected FoundItem
    //
    // If it still has other matched LostItems:
    //     status remains "matched"
    //
    // If no matched LostItems remain:
    //     status becomes "found"
    for (const foundItem of affectedFoundItems) {
      await reconcileFoundItemStatus(foundItem._id, session);
    }

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
    await session.endSession();
  }
});

export const deleteFoundItem = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Soft delete the FoundItem
    const foundItem = await FoundItem.findOneAndUpdate(
      {
        _id: req.params.id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
      {
        new: true,
        session,
      }
    );

    if (!foundItem) {
      throw new ApiError(404, "Found item not found or already deleted");
    }

    // 2. Find all LostItems matched with this FoundItem
    const affectedLostItems = await LostItem.find(
      {
        matchedFoundItemIds: req.params.id,
      },
      "_id",
      { session }
    );

    // 3. Remove the deleted FoundItem ID from all affected LostItems
    await LostItem.updateMany(
      {
        matchedFoundItemIds: req.params.id,
      },
      {
        $pull: {
          matchedFoundItemIds: req.params.id,
        },
      },
      { session }
    );

    // 4. Reconcile every affected LostItem
    //
    // If it still has other matched FoundItems:
    //     status remains "matched"
    //
    // If no matched FoundItems remain:
    //     status is recalculated by reconcileLostItemStatus()
    for (const lostItem of affectedLostItems) {
      await reconcileLostItemStatus(lostItem._id, session);
    }

    await session.commitTransaction();

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Found item deleted successfully"));
  } catch (error) {
    await session.abortTransaction();

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to delete found item"
    );
  } finally {
    await session.endSession();
  }
});
export const getDirectorAnalytics = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalAdmins,
    totalLostItems,
    totalFoundItems,
    totalMatchedLostItems,
    totalMatchedFoundItems,
  ] = await Promise.all([
    User.countDocuments({
      role: USER_ROLES.STUDENT,
    }),

    User.countDocuments({
      role: {
        $in: [USER_ROLES.ADMIN, USER_ROLES.SECURITY],
      },
    }),

    LostItem.countDocuments(),

    FoundItem.countDocuments(),

    LostItem.countDocuments({
      status: "matched",
    }),

    FoundItem.countDocuments({
      status: "matched",
    }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        analytics: {
          totalUsers,
          totalAdmins,
          totalLostItems,
          totalFoundItems,
          totalMatchedLostItems,
          totalMatchedFoundItems,
        },
      },
      "Director analytics fetched successfully"
    )
  );
});
export const getAllLostItems = asyncHandler(async (req, res) => {
  const limit = getPageLimit(req.query.limit);
  const cursor = decodeCursor(req.query.cursor);

  const { status, search } = req.query;

  const query = {
    isActive: true,
    ...getCursorFilter(cursor),
  };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Search by item name
  if (search) {
    query.name = {
      $regex: search,
      $options: "i",
    };
  }

  const lostItems = await LostItem.find(query)
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
    .populate(
      "matchedFoundItemIds",
      `
        name
        block
        status
        `
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const pageItems = lostItems.slice(0, limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: pageItems.length,

        pagination: {
          limit,
          nextCursor:
            lostItems.length > limit
              ? encodeCursor(pageItems[pageItems.length - 1])
              : null,
        },

        data: pageItems,
      },
      lostItems.length > 0
        ? "All lost items fetched successfully"
        : "No lost items found"
    )
  );
});
export const getAllFoundItems = asyncHandler(async (req, res) => {
  const limit = getPageLimit(req.query.limit);
  const cursor = decodeCursor(req.query.cursor);

  const { status, block, search } = req.query;

  const query = {
    isActive: true,
    ...getCursorFilter(cursor),
  };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by block
  if (block) {
    query.$or = [{ block }, { originalBlock: block }];
  }
  // Search by item name
  if (search) {
    query.name = {
      $regex: search,
      $options: "i",
    };
  }

  const foundItems = await FoundItem.find(query)
    .populate(
      "createdBy",
      `
    name
    email
    role
    block
  `
    )
    .populate({
      path: "matchedLostItemIds",
      select: `
          name
          status
          createdAt
          userId
        `,
      populate: {
        path: "userId",
        select: `
            name
            email
            enrollmentNumber
            phoneNumber
            course
            branch
            semester
            block
          `,
      },
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const pageItems = foundItems.slice(0, limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: pageItems.length,

        pagination: {
          limit,
          nextCursor:
            foundItems.length > limit
              ? encodeCursor(pageItems[pageItems.length - 1])
              : null,
        },

        data: pageItems,
      },
      foundItems.length > 0
        ? "All found items fetched successfully"
        : "No found items found"
    )
  );
});
export const getAllStudents = asyncHandler(async (req, res) => {
  const limit = getPageLimit(req.query.limit);
  const cursor = decodeCursor(req.query.cursor);

  const { block, search, course, branch, semester } = req.query;

  const query = {
    role: USER_ROLES.STUDENT,
    isActive: true,
    ...getCursorFilter(cursor),
  };

  // Filter by block
  if (block) {
    query.block = block;
  }

  // Filter by course
  if (course) {
    query.course = course;
  }

  // Filter by branch
  if (branch) {
    query.branch = branch;
  }

  // Filter by semester
  if (semester) {
    query.semester = Number(semester);
  }

  // Search by name or enrollment number
  if (search) {
    query.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        enrollmentNumber: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const students = await User.find(query)
    .select(
      `
        name
        email
        enrollmentNumber
        phoneNumber
        course
        branch
        semester
        section
        block
        profileImage
        profileCompleted
        createdAt
      `
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const pageItems = students.slice(0, limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: pageItems.length,

        pagination: {
          limit,
          nextCursor:
            students.length > limit
              ? encodeCursor(pageItems[pageItems.length - 1])
              : null,
        },

        data: pageItems,
      },
      students.length > 0
        ? "Students fetched successfully"
        : "No students found"
    )
  );
});
export const getAllAdmins = asyncHandler(async (req, res) => {
  const limit = getPageLimit(req.query.limit);
  const cursor = decodeCursor(req.query.cursor);

  const { role, block, search } = req.query;

  const query = {
    role: {
      $in: [USER_ROLES.ADMIN, USER_ROLES.SECURITY],
    },
    isActive: true,
    ...getCursorFilter(cursor),
  };

  // Filter by specific role
  if (role) {
    query.role = role;
  }

  // Filter by block
  if (block) {
    query.block = block;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const admins = await User.find(query)
    .select(
      `
        name
        email
        role
        block
        profileImage
        isActive
        lastLogin
        createdAt
      `
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const pageItems = admins.slice(0, limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: pageItems.length,

        pagination: {
          limit,
          nextCursor:
            admins.length > limit
              ? encodeCursor(pageItems[pageItems.length - 1])
              : null,
        },

        data: pageItems,
      },
      admins.length > 0 ? "Admins fetched successfully" : "No admins found"
    )
  );
});
