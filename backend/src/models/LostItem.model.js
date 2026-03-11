import mongoose, { Schema } from "mongoose";
import {
  COLORS,
  ITEM_STATUS,
  ITEM_CONDITIONS,
} from "../constants.js";
const lostItemSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Item name can not exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description can not exceed 500 characters"],
    },
    color: {
      type: String,
      required: [true, "Color is required"],
      enum: COLORS,
    },
    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum:ITEM_CONDITIONS,
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [50, "Brand can not exceed 50 characters"],
    },
    dateLost: {
      type: Date,
      required: [true, "Date lost is required"],
      validate: {
        validator: function (date) {
          return date <= new Date();
        },
        message: "Date lost can not be in the future",
      },
    },
    placeLost: {
      type: String,
      required: [true, "Place lost is required"],
      trim: true,
      maxlength: [100, "Place lost can not exceed 100 characters"],
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    status: {
      type: String,
      enum: Object.values(ITEM_STATUS),
      default: ITEM_STATUS.PENDING,
    },

    matchedFoundItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "FoundItem",
        index: true, // Indexing zaroori hai fast lookup ke liye
      },
    ],

    // Ek extra field "Final Match" ke liye (Optional but Recommended)
    matchedFoundItemId: {
      type: Schema.Types.ObjectId,
      ref: "FoundItem",
      default: null,
    },

    contactInfo: {
      phone: { type: String, trim: true },
      alternateEmail: { type: String, trim: true, lowercase: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [String], // For search optimization
    searchKeywords: String, // Combined searchable text
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

lostItemSchema.pre("save", function (next) {
  this.searchKeywords = [
    this.name,
    this.description,
    this.category,
    this.color,
    this.brand,
    this.placeLost,
    ...(this.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  next();
});

lostItemSchema.index({
  name: "text",
  description: "text",
  category: "text",
  color: "text",
  brand: "text",
  placeLost: "text",
  searchKeywords: "text",
});
// lostItemSchema.index({ searchKeywords: "text" });

lostItemSchema.index({ userId: 1, createdAt: -1 });
lostItemSchema.index({ status: 1, dateLost: -1 });
lostItemSchema.index({ category: 1, color: 1 });
lostItemSchema.index({ matchedFoundItemIds: 1 }); // Array indexing

export const LostItem = mongoose.model("LostItem", lostItemSchema);
