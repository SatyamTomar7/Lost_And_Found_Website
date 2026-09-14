import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  consumePasswordResetSession,
  createPasswordResetToken,
  PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  recordPasswordResetOtpFailure,
  verifyPasswordResetToken,
} from "./password-reset.service.js";

const JWT_SECRET = "test-reset-secret";

const createUserModel = (initialUser) => {
  const user = { ...initialUser };

  return {
    user,
    findOneAndUpdate: (filter, update) => {
      if (
        user._id !== filter._id ||
        user.passwordResetVersion !== filter.passwordResetVersion
      ) {
        return null;
      }

      Object.assign(user, update.$set);
      user.passwordResetVersion += update.$inc.passwordResetVersion;
      return { ...user };
    },
  };
};

test("consumes a reset session and hashes the new password", async () => {
  const User = createUserModel({ _id: "user-1", passwordResetVersion: 3 });

  const result = await consumePasswordResetSession({
    User,
    userId: "user-1",
    resetVersion: 3,
    newPassword: "NewPassword1",
  });

  assert.ok(result);
  assert.equal(User.user.passwordResetVersion, 4);
  assert.equal(await bcrypt.compare("NewPassword1", User.user.password), true);
});

test("rejects replay of the same reset session", async () => {
  const User = createUserModel({ _id: "user-1", passwordResetVersion: 3 });
  const input = {
    User,
    userId: "user-1",
    resetVersion: 3,
    newPassword: "NewPassword1",
  };

  assert.ok(await consumePasswordResetSession(input));
  assert.equal(await consumePasswordResetSession(input), null);
});

test("rejects a token from an old reset session", async () => {
  const User = createUserModel({ _id: "user-1", passwordResetVersion: 4 });
  const oldSessionToken = createPasswordResetToken({
    userId: "user-1",
    resetVersion: 3,
    secret: JWT_SECRET,
  });
  const decoded = verifyPasswordResetToken(oldSessionToken, JWT_SECRET);

  assert.equal(
    await consumePasswordResetSession({
      User,
      userId: decoded.userId,
      resetVersion: decoded.resetVersion,
      newPassword: "NewPassword1",
    }),
    null
  );
});

test("rejects an expired reset token", async () => {
  const expiredToken = jwt.sign(
    {
      userId: "user-1",
      purpose: "password_reset",
      resetVersion: 1,
    },
    JWT_SECRET,
    { expiresIn: -1 }
  );

  assert.throws(
    () => verifyPasswordResetToken(expiredToken, JWT_SECRET),
    /expired/i
  );
});

test("the newly hashed password remains usable for normal login", async () => {
  const User = createUserModel({ _id: "user-1", passwordResetVersion: 3 });

  await consumePasswordResetSession({
    User,
    userId: "user-1",
    resetVersion: 3,
    newPassword: "NewPassword1",
  });

  assert.equal(await bcrypt.compare("NewPassword1", User.user.password), true);
});

test("only one concurrent attempt can consume a reset session", async () => {
  const User = createUserModel({ _id: "user-1", passwordResetVersion: 3 });
  const input = {
    User,
    userId: "user-1",
    resetVersion: 3,
    newPassword: "NewPassword1",
  };

  const results = await Promise.all([
    consumePasswordResetSession(input),
    consumePasswordResetSession(input),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(User.user.passwordResetVersion, 4);
});

test("locks a reset session after the configured number of invalid OTP attempts", async () => {
  const user = {
    _id: "user-1",
    passwordResetOTPUsed: false,
    passwordResetOTPExpiry: new Date(Date.now() + 60_000),
    passwordResetOTPFailedAttempts: 0,
    passwordResetOTPLockedUntil: null,
  };
  const User = {
    findOneAndUpdate: (filter, update) => {
      if (
        user._id !== filter._id ||
        user.passwordResetOTPUsed ||
        user.passwordResetOTPExpiry <= filter.passwordResetOTPExpiry.$gt ||
        user.passwordResetOTPFailedAttempts >=
          filter.passwordResetOTPFailedAttempts.$lt
      ) {
        return { select: async () => null };
      }

      user.passwordResetOTPFailedAttempts +=
        update.$inc.passwordResetOTPFailedAttempts;
      return { select: async () => ({ ...user }) };
    },
    updateOne: async (_filter, update) => {
      user.passwordResetOTPLockedUntil =
        update.$set.passwordResetOTPLockedUntil;
    },
  };

  for (let attempt = 0; attempt < PASSWORD_RESET_OTP_MAX_ATTEMPTS; attempt++) {
    await recordPasswordResetOtpFailure({ User, userId: user._id });
  }

  assert.equal(user.passwordResetOTPFailedAttempts, 5);
  assert.equal(user.passwordResetOTPLockedUntil, user.passwordResetOTPExpiry);
  assert.equal(
    await recordPasswordResetOtpFailure({ User, userId: user._id }),
    null
  );
});
