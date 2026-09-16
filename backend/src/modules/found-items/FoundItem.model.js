import mongoose, { Schema } from "mongoose";
import {
  COLORS,
  FOUND_ITEM_RECOVERY_MODES,
  ITEM_CONDITIONS_VALUES,
  ITEM_NAME,
  ITEM_STATUS,
} from "../../config/constants.js";

const getMinAllowedDate = (recoveryMode) => {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(
    minDate.getDate() -
      (recoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED ? 29 : 6)
  );
  return minDate;
};

const foundItemSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    block: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],
      required: false,
    },

    originalBlock: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],
      required: false,
    },

    handledBy: {
      type: String,
      enum: ["admin", "security"],
      required: true,
      default: "admin",
    },
    transferState: {
      type: String,
      enum: ["pending", "processing", "completed", "retryable"],
      default: "pending",
      index: true,
    },
    transferJobId: {
      type: String,
      default: null,
      select: false,
    },
    transferStartedAt: {
      type: Date,
      default: null,
      select: false,
    },
    transferCompletedAt: {
      type: Date,
      default: null,
      select: false,
    },
    transferLastError: {
      type: String,
      default: null,
      select: false,
      maxlength: 500,
    },
    recoveryMode: {
      type: String,
      enum: Object.values(FOUND_ITEM_RECOVERY_MODES),
      default: FOUND_ITEM_RECOVERY_MODES.NORMAL,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      enum: ITEM_NAME,
      trim: true,
      maxlength: [100, "Item can not exceed 100 characters"],
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
    dateFound: {
      type: Date,
      required: [true, "Date found is required"],
      validate: {
        validator: function (date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const minDate = getMinAllowedDate(this.recoveryMode);
          const inputDate = new Date(date);
          inputDate.setHours(0, 0, 0, 0);

          return inputDate >= minDate && inputDate <= today;
        },
        message:
          "Date found must be within the allowed recovery window and cannot be in the future",
      },
    },
    placeFound: {
      type: String,
      required: [true, "PlaceFound is required"],
      trim: true,
      maxlength: [100, "Place found can not exceed 100 characters"],
    },
    status: {
      type: String,
      enum: [
        ITEM_STATUS.FOUND,
        ITEM_STATUS.RETURNED,
        ITEM_STATUS.UNCLAIMED,
        ITEM_STATUS.OFFLINE_RETURNED,
        ITEM_STATUS.MATCHED,
      ],
      default: ITEM_STATUS.FOUND,
    },

    matchedLostItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "LostItem",
      },
    ],

    matchedLostItemId: {
      type: Schema.Types.ObjectId,
      ref: "LostItem",
      default: null,
    },

    claimedBy: {
      name: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
      },

      enrollmentNumber: {
        type: String,
        trim: true,
      },

      phoneNumber: {
        type: String,
        trim: true,
      },

      course: {
        type: String,
        trim: true,
      },

      branch: {
        type: String,
        trim: true,
      },

      semester: {
        type: Number,
      },

      block: {
        type: String,
        trim: true,
      },

      // used for offline collection
      contact: {
        type: String,
        trim: true,
      },
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

foundItemSchema.pre("save", function (next) {
  this.searchKeywords = [
    this.name,
    this.description,
    this.color,
    this.brand,
    this.placeFound,
    this.block,
    this.originalBlock,
    this.handledBy,
    ...(this.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  next();
});

foundItemSchema.index({
  name: "text",
  description: "text",
  color: "text",
  brand: "text",
  placeFound: "text",
  searchKeywords: "text",
});
foundItemSchema.index({
  name: 1,
  color: 1,
  dateFound: 1,
  status: 1,
  isActive: 1,
});
foundItemSchema.index({
  handledBy: 1,
  block: 1,
  status: 1,
});

foundItemSchema.index({ block: 1, createdAt: -1 });
foundItemSchema.index({ status: 1, dateFound: -1 });
foundItemSchema.index({ handledBy: 1, recoveryMode: 1, createdAt: -1 });
foundItemSchema.index({ handledBy: 1, recoveryMode: 1, dateFound: -1 });
foundItemSchema.index({ handledBy: 1, transferState: 1, dateFound: 1 });
foundItemSchema.index({ createdBy: 1 });
foundItemSchema.index({ matchedLostItemIds: 1 });
export const FoundItem = mongoose.model("FoundItem", foundItemSchema);
