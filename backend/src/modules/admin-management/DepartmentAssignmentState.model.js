import mongoose, { Schema } from "mongoose";

// A singleton used to detect stale assignment screens and serialize changes.
const departmentAssignmentStateSchema = new Schema(
  {
    _id: {
      type: String,
      default: "admin-block-assignments",
    },
    version: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextBatchNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true, versionKey: false }
);

export const DepartmentAssignmentState = mongoose.model(
  "DepartmentAssignmentState",
  departmentAssignmentStateSchema
);
