import mongoose, { Schema } from "mongoose";
import {
  COLORS,
  DEPARTMENTS,
  ITEM_CATEGORIES,
  ITEM_STATUS,
} from "../constants.js";
const foundItemSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: DEPARTMENTS,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [100, "Item can not exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description can not exceed 500 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ITEM_CATEGORIES,
    },
    color: {
      type: String,
      required: [true, "Color is required"],
      enum: COLORS,
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [50, "Brand can not exceed 50 characters"],
    },
    dateFound: {
      type: Date,
      required: [true, "Date found is required"],
      validate: {
        validator: function (date) {
          return date <= new Date();
        },
        message: "Date found cannot be in the future",
      },
    },
    placeFound: {
      type: String,
      required: [true, "PlaceFound is required"],
      trim: true,
      maxlength: [100, "Place found can not exceed 100 characters"],
    },

    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    status: {
      type: String,
      enum: [ITEM_STATUS.FOUND, ITEM_STATUS.RETURNED, ITEM_STATUS.UNCLAIMED],
      default: ITEM_STATUS.FOUND,
    },

    matchedLostItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "LostItem",
      },
    ],

    // Ye field pehle se hai, iska use 'Handover' ke waqt karein
    // Isko hum change nahi karenge, ye final 1-to-1 match rahega
    matchedLostItemId: {
      type: Schema.Types.ObjectId,
      ref: "LostItem",
      default: null,
    },

    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    claimedAt: Date,
    returnedAt: Date,
    storageLocation: {
      type: String,
      trim: true,
      maxlength: [100, "Storage location can not exceed 100 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [String],
    searchKeywords: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

// Create search keywords before saving
foundItemSchema.pre("save", function (next) {
  this.searchKeywords = [
    this.name,
    this.description,
    this.category,
    this.color,
    this.brand,
    this.placeFound,
    this.department,
    ...(this.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  next();
});

// Index for text search
foundItemSchema.index({
  name: "text",
  description: "text",
  category: "text",
  color: "text",
  brand: "text",
  placeFound: "text",
  searchKeywords: "text",
});

foundItemSchema.index({ department: 1, createdAt: -1 });
foundItemSchema.index({ status: 1, dateFound: -1 });
foundItemSchema.index({ category: 1, color: 1 });
foundItemSchema.index({ adminId: 1 });
foundItemSchema.index({ matchedLostItemIds: 1 }); // Multi-key index for the array
export const FoundItem = mongoose.model("FoundItem", foundItemSchema);
