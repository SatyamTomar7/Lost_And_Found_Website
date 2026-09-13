import mongoose from "mongoose";

const pendingUploadSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimedAt: { type: Date, default: null },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// TTL index — Mongo auto-deletes unclaimed docs after 2 hours
// The cleanup job runs at 1 hr, so this is a safety net
pendingUploadSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7200, partialFilterExpression: { claimedAt: null } }
);
pendingUploadSchema.index(
  { claimedAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: { claimedAt: { $gt: new Date(0) } },
  }
);

export const PendingUpload = mongoose.model(
  "PendingUpload",
  pendingUploadSchema
);
