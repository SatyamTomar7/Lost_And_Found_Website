import mongoose, { Schema } from "mongoose";
import { NOTIFICATION_TYPES } from "../constants.js";
const notificationSchema = new Schema(
  {
    userid: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
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
      LostItemId: {
        type: Schema.Types.ObjectId,
        ref: "LostItem",
      },
      foundItemId: {
        type: Schema.Types.ObjectId,
        ref: "FoundItem",
      },
      matchScore: Number,
      adminId: {
        type: Schema.Types.ObjectId,
        ref: "User",
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
  },
  {
    timestamps: true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
  }
);

notificationSchema.index({userid:1,createdAt:-1});
notificationSchema.index({isRead:1,priority:-1})
notificationSchema.index({expiresAt:1},{expireAfterSeconds:0})
//Mark as read method

notificationSchema.methods.markAsRead=function(){
    this.isRead=true;
    this.readAt=new Date();
    return this.save();
}

export const Notification = mongoose.model("Notification", notificationSchema);
