import mongoose, { Schema } from "mongoose";
import {
  COLORS,
  ITEM_CONDITIONS_VALUES,
  ITEM_STATUS,
} from "../../config/constants.js";
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
      enum: ITEM_CONDITIONS_VALUES,
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() - 6);

  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate >= minDate && inputDate <= today;
},
        message: "Date lost must be within the last 7 days and cannot be in the future",
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
      enum: [
        ITEM_STATUS.PENDING,
        ITEM_STATUS.COLLECTED,
        ITEM_STATUS.SELF_RESOLVED,
        ITEM_STATUS.MATCHED,
      ],
      default: ITEM_STATUS.PENDING,
    },

    matchedFoundItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "FoundItem",
      },
    ],

    matchedFoundItemId: {
      type: Schema.Types.ObjectId,
      ref: "FoundItem",
      default: null,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

lostItemSchema.pre("save", function (next) {
  this.searchKeywords = [
    this.name,
    this.description,
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
  color: "text",
  brand: "text",
  placeLost: "text",
  searchKeywords: "text",
});
lostItemSchema.index({
  name: 1,
  color: 1,
  dateLost: 1,
  status: 1,
  isActive: 1,
});
lostItemSchema.index({ userId: 1, createdAt: -1 });
lostItemSchema.index({ status: 1, dateLost: -1 });
lostItemSchema.index({ matchedFoundItemIds: 1 });

export const LostItem = mongoose.model("LostItem", lostItemSchema);
