import mongoose, { Schema } from "mongoose";
import { USER_ROLES } from "../constants.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
      select: false,
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
    passwordResetOTP: {
      type: String,
      default: null,
    },
    passwordResetOTPExpiry: {
      type: Date,
      default: null,
    },
    passwordResetOTPUsed: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    emailVerificationOTP: String,
    emailVerificationExpire: Date,
    department: {
      type: String,
      required: function () {
        return this.role === USER_ROLES.ADMIN;
      },
    },
    profileImage: {
      type: String,
      default: null,
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

 
  if (this.department) {
    payload.department = this.department;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "24h",
  });
};

userSchema.methods.generateEmailVerificationOTP = async function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationOTP = await bcrypt.hash(otp, 10); 
  const expireMinutes = parseInt(process.env.OTP_EXPIRE) || 10; 
  this.emailVerificationExpire = Date.now() + expireMinutes * 60 * 1000;
  return otp;
};
export const User = mongoose.model("User", userSchema);
