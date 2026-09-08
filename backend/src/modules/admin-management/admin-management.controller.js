import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import {
  applyAssignmentChanges,
  getAssignmentHistory,
  getAssignmentSnapshot,
} from "./department-assignment.service.js";

export const getAdminAssignments = asyncHandler(async (_req, res) => {
  const snapshot = await getAssignmentSnapshot();
  res
    .status(200)
    .json(
      new ApiResponse(200, snapshot, "Admin assignments fetched successfully")
    );
});

export const updateAdminAssignments = asyncHandler(async (req, res) => {
  const result = await applyAssignmentChanges({
    assignments: req.body.assignments,
    version: req.body.version,
    performedBy: req.user._id,
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.changed
          ? "Department assignments updated successfully"
          : "No department assignments changed"
      )
    );
});

export const listAssignmentHistory = asyncHandler(async (_req, res) => {
  const history = await getAssignmentHistory();
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { history },
        "Assignment history fetched successfully"
      )
    );
});
