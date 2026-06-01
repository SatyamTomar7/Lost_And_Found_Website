import mongoose, { Schema } from "mongoose";
import { NOTIFICATION_TYPES } from "../../config/constants.js";
const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    data: {
      lostItemId: {
        type: Schema.Types.ObjectId,
        ref: "LostItem",
      },
      foundItemId: {
        type: Schema.Types.ObjectId,
        ref: "FoundItem",
      },
      matchScore: Number,
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      outdatedMessage: {
        type: String,
        trim: true,
        maxlength: [300, "Outdated message cannot exceed 300 characters"],
      },
      transferredFromBlock: {
        type: String,
        trim: true,
        maxlength: [20, "Transferred block cannot exceed 20 characters"],
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
    },
    isOutdated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, priority: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index(
  {
    userId: 1,
    type: 1,
    "data.foundItemId": 1,
    "data.lostItemId": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: NOTIFICATION_TYPES.ITEM_TRANSFERRED_TO_SECURITY,
      "data.foundItemId": { $exists: true },
      "data.lostItemId": { $exists: true },
    },
  }
);
//Mark as read method

notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

export const Notification = mongoose.model("Notification", notificationSchema);
