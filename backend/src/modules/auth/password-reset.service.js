import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const RESET_PASSWORD_HASH_ROUNDS = 10;

export const createPasswordResetToken = ({
  userId,
  resetVersion,
  secret,
}) =>
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
