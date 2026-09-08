import mongoose, { Schema } from "mongoose";

const departmentAssignmentHistorySchema = new Schema(
  {
    batchNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changes: [
      {
        adminId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        oldBlock: {
          type: String,
          enum: ["A", "B", "C", "D", "E"],
          required: true,
        },
        newBlock: {
          type: String,
          enum: ["A", "B", "C", "D", "E"],
          required: true,
        },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

departmentAssignmentHistorySchema.index({ createdAt: -1 });

export const DepartmentAssignmentHistory = mongoose.model(
  "DepartmentAssignmentHistory",
  departmentAssignmentHistorySchema
);
