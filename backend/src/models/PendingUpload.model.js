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
    claimedAt: { type: Date, default: null }, // set when a LostItem is saved
  },
  { timestamps: true }
);

// TTL index — Mongo auto-deletes unclaimed docs after 2 hours
// The cleanup job runs at 1 hr, so this is a safety net
pendingUploadSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7200, partialFilterExpression: { claimedAt: null } }
);

export const PendingUpload = mongoose.model(
  "PendingUpload",
  pendingUploadSchema
);
