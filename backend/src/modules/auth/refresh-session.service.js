import crypto from "crypto";
import { RefreshSession } from "./RefreshSession.model.js";
import logger from "../../shared/utils/logger.js";

export const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_TOKEN_BYTES = 32;

const getRefreshLifetimeMs = () => {
  const configured = Number.parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS, 10);
  return (Number.isFinite(configured) ? configured : 30) * 24 * 60 * 60 * 1000;
};

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== "false",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  ...(process.env.COOKIE_DOMAIN
    ? { domain: process.env.COOKIE_DOMAIN }
    : {}),
  path: "/api/auth",
  maxAge: getRefreshLifetimeMs(),
});

export const clearRefreshCookie = (res) => {
  const { maxAge: _, ...options } = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, options);
};

export const readRefreshToken = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(REFRESH_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
};

export const createRefreshSession = async (userId) => {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
  const session = await RefreshSession.create({
    userId,
    familyId: crypto.randomUUID(),
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + getRefreshLifetimeMs()),
  });
  return { token, session };
};

export const revokeRefreshSessions = async (userId) =>
  RefreshSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

export const revokeRefreshToken = async (token) =>
  RefreshSession.findOneAndUpdate(
    { tokenHash: hashRefreshToken(token), revokedAt: null },
    { $set: { revokedAt: new Date(), lastUsedAt: new Date() } }
  );

export const rotateRefreshSession = async (token) => {
  const tokenHash = hashRefreshToken(token);
  const current = await RefreshSession.findOne({ tokenHash });

  if (!current) return { kind: "invalid" };

  if (current.revokedAt || current.expiresAt <= new Date()) {
    if (current.revokedAt && current.familyId) {
      await RefreshSession.updateMany(
        { familyId: current.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      logger.warn(
        { event: "refresh_token_reuse", userId: current.userId.toString() },
        "Refresh token replay detected"
      );
    }
    return { kind: "rejected" };
  }

  const replacement = {
    token: crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url"),
    session: null,
  };
  const replacementSession = await RefreshSession.create({
    userId: current.userId,
    familyId: current.familyId,
    tokenHash: hashRefreshToken(replacement.token),
    expiresAt: new Date(Date.now() + getRefreshLifetimeMs()),
  });

  const revoked = await RefreshSession.findOneAndUpdate(
    { _id: current._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    {
      $set: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
        replacedBy: replacementSession._id,
      },
    },
    { new: true }
  );

  if (!revoked) {
    await RefreshSession.findByIdAndUpdate(replacementSession._id, {
      $set: { revokedAt: new Date() },
    });
    await RefreshSession.updateMany(
      { familyId: current.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    return { kind: "rejected" };
  }

  replacement.session = replacementSession;
  return { kind: "rotated", ...replacement };
};
