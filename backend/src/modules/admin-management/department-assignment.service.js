import mongoose from "mongoose";
import { USER_ROLES } from "../../config/constants.js";
import { User } from "../auth/User.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { DepartmentAssignmentHistory } from "./DepartmentAssignmentHistory.model.js";
import { DepartmentAssignmentState } from "./DepartmentAssignmentState.model.js";

const STATE_ID = "admin-block-assignments";
const VALID_BLOCKS = new Set(["A", "B", "C", "D", "E"]);

const ensureAssignmentState = async () => {
  try {
    return await DepartmentAssignmentState.findByIdAndUpdate(
      STATE_ID,
      { $setOnInsert: { version: 0, nextBatchNumber: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return DepartmentAssignmentState.findById(STATE_ID);
  }
};

const getActiveAdmins = (session = null) => {
  const query = User.find({
    role: USER_ROLES.ADMIN,
    isActive: true,
  })
    .select("name email block updatedAt")
    .sort({ name: 1, _id: 1 });

  return session ? query.session(session) : query;
};

export const validateFinalAssignments = (assignments, admins) => {
  const currentAdminIds = new Set(admins.map((admin) => admin._id.toString()));
  const submittedAdminIds = new Set();
  const assignedBlocks = new Set();

  if (assignments.length !== admins.length) {
    throw new ApiError(
      400,
      "Submit the complete current admin assignment list before saving"
    );
  }

  for (const assignment of assignments) {
    const adminId = assignment.adminId?.toString();

    if (!adminId || !currentAdminIds.has(adminId)) {
      throw new ApiError(
        400,
        "Every assignment must reference a current admin"
      );
    }
    if (submittedAdminIds.has(adminId)) {
      throw new ApiError(400, "An admin can only be assigned once");
    }
    if (!VALID_BLOCKS.has(assignment.block)) {
      throw new ApiError(400, "Block must be A, B, C, D, or E");
    }
    if (assignedBlocks.has(assignment.block)) {
      throw new ApiError(400, "A block can only be assigned to one admin");
    }

    submittedAdminIds.add(adminId);
    assignedBlocks.add(assignment.block);
  }
};

export const getAssignmentSnapshot = async () => {
  const [state, admins] = await Promise.all([
    ensureAssignmentState(),
    getActiveAdmins(),
  ]);

  return {
    version: state.version,
    admins: admins.map((admin) => ({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      block: admin.block,
    })),
  };
};

export const applyAssignmentChanges = async ({
  assignments,
  version,
  performedBy,
}) => {
  await ensureAssignmentState();
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const state =
        await DepartmentAssignmentState.findById(STATE_ID).session(session);
      if (!state || state.version !== version) {
        throw new ApiError(
          409,
          "The department assignments have changed since you opened this page. Please refresh and try again."
        );
      }

      const admins = await getActiveAdmins(session);
      validateFinalAssignments(assignments, admins);

      const assignmentByAdminId = new Map(
        assignments.map((assignment) => [
          assignment.adminId.toString(),
          assignment.block,
        ])
      );
      const changes = admins
        .map((admin) => ({
          admin,
          oldBlock: admin.block,
          newBlock: assignmentByAdminId.get(admin._id.toString()),
        }))
        .filter(({ oldBlock, newBlock }) => oldBlock !== newBlock);

      if (changes.length === 0) {
        result = { changed: false, version: state.version, changes: [] };
        return;
      }

      const updatedState = await DepartmentAssignmentState.findOneAndUpdate(
        { _id: STATE_ID, version },
        { $inc: { version: 1, nextBatchNumber: 1 } },
        { new: true, session }
      );
      if (!updatedState) {
        throw new ApiError(
          409,
          "The department assignments have changed since you opened this page. Please refresh and try again."
        );
      }

      await User.bulkWrite(
        changes.map(({ admin, newBlock }) => ({
          updateOne: {
            filter: { _id: admin._id, role: USER_ROLES.ADMIN, isActive: true },
            update: { $set: { block: newBlock } },
          },
        })),
        { session }
      );

      const history = await DepartmentAssignmentHistory.create(
        [
          {
            batchNumber: state.nextBatchNumber,
            performedBy,
            changes: changes.map(({ admin, oldBlock, newBlock }) => ({
              adminId: admin._id,
              oldBlock,
              newBlock,
            })),
          },
        ],
        { session }
      );

      result = {
        changed: true,
        version: updatedState.version,
        batchNumber: history[0].batchNumber,
        changes: changes.map(({ admin, oldBlock, newBlock }) => ({
          adminId: admin._id,
          name: admin.name,
          oldBlock,
          newBlock,
        })),
      };
    });

    return result;
  } finally {
    session.endSession();
  }
};

export const getAssignmentHistory = async () =>
  DepartmentAssignmentHistory.find()
    .populate("performedBy", "name email")
    .populate("changes.adminId", "name email")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
