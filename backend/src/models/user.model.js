// import mongoose, { Schema } from "mongoose";
// import { USER_ROLES } from "../constants.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// const userSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Name is required"],
//       trim: true,
//       maxlength: [50, "Name cannot exceed 50 characters"],
//     },
//     // email: {
//     //   type: String,
//     //   required: [true, "Email is required"],
//     //   unique: true,
//     //   trim: true,
//     //   lowercase: true,
//     //   validate: {
//     //     validator: function (v) {
//     //       // 1. List of your 5 pre-saved Admin emails
//     //       const adminEmails = [
//     //         "rktripathi@gwa.amity.edu",
//     //         "spsharma@gwa.amity.edu",
//     //         "rac@gwa.amity.edu",
//     //         "rbayadav@gwa.amity.edu",
//     //         "ksingh2@gwa.amity.edu",
//     //       ];

//     //       // 2. Allow if it's one of these 5 OR if it's a standard student email
//     //       return adminEmails.includes(v) || /^[\w.-]+@s\.amity\.edu$/.test(v);
//     //     },
//     //     message: (props) =>
//     //       `${props.value} is not a valid Amity email. Students must use @s.amity.edu`,
//     //   },
//     // },
//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       trim: true,
//       lowercase: true,
//       validate: {
//         validator: function (v) {
//           const isStudentEmail = /^[\w.-]+@s\.amity\.edu$/.test(v);
//           const isAdminEmail = /^[\w.-]+@gwa\.amity\.edu$/.test(v);

//           // This ensures the email MUST be one or the other.
//           // To prevent a student from signing up as an admin,
//           // you must verify the 'role' field as well:
//           if (this.role === "student") return isStudentEmail;
//           // if (this.role === "admin") return isAdminEmail;
//           if (this.role === "admin") return  isStudentEmail;

//           // If no role is provided or it's a different role, fail validation
//           return false;
//         },
//         message: (props) => {
//           if (props.value.endsWith("@gwa.amity.edu")) {
//             return "Admin emails cannot be used for Student accounts.";
//           }
//           return "Please use a valid @s.amity.edu or @gwa.amity.edu address.";
//         },
//       },
//     },
//     password: {
//       type: String,
//       required: [true, "Password is required"],
//       minlength: [6, "Password must be at least 6 characters"],
//       select: false,
//     },
//     role: {
//       type: String,
//       enum: Object.values(USER_ROLES),
//       default: USER_ROLES.STUDENT,
//     },
//     isEmailVerified: {
//       type: Boolean,
//       default: false,
//     },

//     passwordResetOTP: {
//       type: String,
//       default: null,
//     },
//     passwordResetOTPExpiry: {
//       type: Date,
//       default: null,
//     },
//     passwordResetOTPUsed: {
//       type: Boolean,
//       default: false,
//     },
//     passwordChangedAt: {
//       type: Date,
//       default: null,
//     },

//     emailVerificationOTP: String,
//     emailVerificationExpire: Date,
//     department: {
//       type: String,
//       required: function () {
//         return this.role === USER_ROLES.ADMIN;
//       },
//     },
//     profileImage: {
//       type: String,
//       default: null,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     lastLogin: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Encrypt password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   try {
//     this.password = await bcrypt.hash(this.password, 10);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Compare password method
// userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Generate JWT token
// userSchema.methods.getJWTToken = function () {
//   return jwt.sign(
//     {
//       id: this._id,
//       email: this.email,
//       role: this.role,
//       department: this.department, //for student how it works
//     },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: process.env.JWT_EXPIRE || "24h",
//     }
//   );
// };
// // Generate OTP for email verification
// userSchema.methods.generateEmailVerificationOTP = function () {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   this.emailVerificationOTP = otp;
//   this.emailVerificationExpire =
//     Date.now() + parseInt(process.env.OTP_EXPIRE) * 60 * 1000 || 10 * 60 * 1000;
//   return otp;
// };
// // Verify email OTP
// userSchema.methods.verifyEmailOTP = function (otp) {
//   return (
//     this.emailVerificationOTP === otp &&
//     this.emailVerificationExpire > Date.now()
//   );
// };
// export const User = mongoose.model("User", userSchema);
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
          const isStudentEmail = /^[\w.-]+@s\.amity\.edu$/.test(v);
          const isAdminEmail = /^[\w.-]+@gwa\.amity\.edu$/.test(v);

          if (this.role === "student") return isStudentEmail;
          if (this.role === "admin") return isAdminEmail; 
          return false;
        },
        message: (props) => {
          if (props.value.endsWith("@gwa.amity.edu")) {
            return "Admin emails cannot be used for Student accounts.";
          }
          return "Please use a valid @s.amity.edu or @gwa.amity.edu address.";
        },
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
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
    // ADDED: fields needed by generatePasswordResetToken
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiry: {
      type: Date,
      default: null,
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

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.getJWTToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      department: this.department,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "24h",
    }
  );
};

// Generate OTP for email verification
userSchema.methods.generateEmailVerificationOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationOTP = otp;
  this.emailVerificationExpire =
    Date.now() + parseInt(process.env.OTP_EXPIRE) * 60 * 1000 || 10 * 60 * 1000;
  return otp;
};

// Verify email OTP
userSchema.methods.verifyEmailOTP = function (otp) {
  return (
    this.emailVerificationOTP === otp &&
    this.emailVerificationExpire > Date.now()
  );
};

// ADDED: Generate OTP for password reset
userSchema.methods.generatePasswordResetOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.passwordResetOTP = otp;
  this.passwordResetOTPExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.passwordResetOTPUsed = false;
  return otp;
};

// ADDED: Verify password reset OTP
userSchema.methods.verifyPasswordResetOTP = function (otp) {
  return (
    this.passwordResetOTP === otp &&
    this.passwordResetOTPExpiry > Date.now() &&
    this.passwordResetOTPUsed === false
  );
};

// ADDED: Generate short-lived reset token after OTP is verified
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = jwt.sign(
    { id: this._id, purpose: "password-reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  // Store token hash + expiry so adminResetPassword can verify it
  this.passwordResetToken = resetToken;
  this.passwordResetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  this.passwordResetOTPUsed = true; // consume the OTP so it can't be reused
  return resetToken;
};

export const User = mongoose.model("User", userSchema);