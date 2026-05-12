import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { USER_ROLES } from "../constants.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { LostItem } from "../models/LostItem.model.js";
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
      role: USER_ROLES.ADMIN,
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
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const { status, search } = req.query;

  const query = {
    isActive: true,
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

  const [lostItems, total] = await Promise.all([
    LostItem.find(query)
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    LostItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: lostItems.length,

        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
        },

        data: lostItems,
      },
      lostItems.length > 0
        ? "All lost items fetched successfully"
        : "No lost items found"
    )
  );
});
export const getAllFoundItems = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const { status, block, search } = req.query;

  const query = {
    isActive: true,
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

  const [foundItems, total] = await Promise.all([
    FoundItem.find(query)
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    FoundItem.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: foundItems.length,

        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
        },

        data: foundItems,
      },
      foundItems.length > 0
        ? "All found items fetched successfully"
        : "No found items found"
    )
  );
});
export const getAllStudents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const { block, search, course, branch, semester } = req.query;

  const query = {
    role: USER_ROLES.STUDENT,
    isActive: true,
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

  const [students, total] = await Promise.all([
    User.find(query)
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: students.length,

        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
        },

        data: students,
      },
      students.length > 0
        ? "Students fetched successfully"
        : "No students found"
    )
  );
});
export const getAllAdmins = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const { role, block, search } = req.query;

  const query = {
    role: {
      $in: [USER_ROLES.ADMIN, USER_ROLES.SECURITY],
    },
    isActive: true,
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

  const [admins, total] = await Promise.all([
    User.find(query)
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: admins.length,

        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
        },

        data: admins,
      },
      admins.length > 0 ? "Admins fetched successfully" : "No admins found"
    )
  );
});
