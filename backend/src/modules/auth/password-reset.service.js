import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const RESET_PASSWORD_HASH_ROUNDS = 10;
export const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;

export const createPasswordResetToken = ({ userId, resetVersion, secret }) =>
  jwt.sign(
    {
      userId,
      purpose: "password_reset",
      resetVersion,
    },
    secret,
    { expiresIn: "10m" }
  );

export const verifyPasswordResetToken = (token, secret) =>
  jwt.verify(token, secret);

export const recordPasswordResetOtpFailure = async ({
  User,
  userId,
  maxAttempts = PASSWORD_RESET_OTP_MAX_ATTEMPTS,
}) => {
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      passwordResetOTPUsed: false,
      passwordResetOTPExpiry: { $gt: new Date() },
      passwordResetOTPFailedAttempts: { $lt: maxAttempts },
      $or: [
        { passwordResetOTPLockedUntil: null },
        { passwordResetOTPLockedUntil: { $lte: new Date() } },
      ],
    },
    { $inc: { passwordResetOTPFailedAttempts: 1 } },
    { new: true }
  ).select("+passwordResetOTPFailedAttempts +passwordResetOTPLockedUntil");

  if (user && user.passwordResetOTPFailedAttempts >= maxAttempts) {
    await User.updateOne(
      { _id: userId, passwordResetOTPUsed: false },
      { $set: { passwordResetOTPLockedUntil: user.passwordResetOTPExpiry } }
    );
  }

  return user;
};

export const consumePasswordResetSession = async ({
  User,
  userId,
  resetVersion,
  newPassword,
}) => {
  const hashedPassword = await bcrypt.hash(
    newPassword,
    RESET_PASSWORD_HASH_ROUNDS
  );

  return User.findOneAndUpdate(
    {
      _id: userId,
      passwordResetVersion: resetVersion,
    },
    {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(Date.now() - 1000),
        passwordResetOTP: null,
        passwordResetOTPExpiry: null,
        passwordResetOTPUsed: false,
        passwordResetOTPLastSentAt: null,
        passwordResetOTPFailedAttempts: 0,
        passwordResetOTPLockedUntil: null,
      },
      $inc: {
        passwordResetVersion: 1,
      },
    },
    {
      new: true,
    }
  );
};
