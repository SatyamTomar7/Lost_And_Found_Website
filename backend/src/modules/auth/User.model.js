import crypto from "crypto";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { USER_ROLES } from "../../config/constants.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,

      validate: {
        validator: function (v) {
          return (
            /^[\w.-]+@s\.amity\.edu$/.test(v) ||
            /^[\w.-]+@gwa\.amity\.edu$/.test(v)
          );
        },
        message:
          "Please use a valid @s.amity.edu or @gwa.amity.edu email address.",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,

      validate: {
        validator: function (v) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(v);
        },
        message: "Password must include uppercase, lowercase, and a number",
      },
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetOTP: { type: String, default: null, select: false },
    passwordResetOTPExpiry: {
      type: Date,
      default: null,
    },
    passwordResetOTPLastSentAt: {
      type: Date,
      default: null,
    },
    passwordResetOTPUsed: {
      type: Boolean,
      default: false,
    },
    passwordResetVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    emailVerificationOTP: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationOTPUsed: { type: Boolean, default: false },
    emailVerificationExpire: {
      type: Date,
      default: null,
    },

    otpLastSentAt: {
      type: Date,
      default: null,
    },
    block: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],

      required: function () {
        // Admin always needs block
        if (this.role === USER_ROLES.ADMIN) {
          return true;
        }

        // Student needs block only after profile completion
        if (this.role === USER_ROLES.STUDENT && this.profileCompleted) {
          return true;
        }

        return false;
      },
    },
    profileImage: {
      type: String,
      default: null,
    },
    enrollmentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, "Please enter valid phone number"],
    },

    course: {
      type: String,
    },

    branch: {
      type: String,
    },
    section: {
      type: String,
    },

    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    year: {
      type: String,
      enum: ["1", "2", "3", "4"],
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getJWTToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "24h",
  });
};

userSchema.methods.generateEmailVerificationOTP = async function () {
  const otp = crypto.randomInt(100000, 1000000).toString();
  this.emailVerificationOTP = await bcrypt.hash(otp, 10);
  this.emailVerificationOTPUsed = false;
  this.otpLastSentAt = new Date();
  const expireMinutes = parseInt(process.env.OTP_EXPIRE) || 10;
  this.emailVerificationExpire = new Date(
    Date.now() + expireMinutes * 60 * 1000
  );
  return otp;
};
userSchema.methods.generatePasswordResetOTP = async function () {
  const otp = crypto.randomInt(100000, 1000000).toString();
  this.passwordResetOTP = await bcrypt.hash(otp, 10);
  this.passwordResetOTPUsed = false;
  this.passwordResetOTPLastSentAt = new Date();
  const expireMinutes = parseInt(process.env.OTP_EXPIRE) || 10;
  this.passwordResetOTPExpiry = new Date(
    Date.now() + expireMinutes * 60 * 1000
  );
  return otp;
};
export const User = mongoose.model("User", userSchema);
