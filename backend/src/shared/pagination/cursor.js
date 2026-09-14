import mongoose from "mongoose";

export const MAX_PAGE_SIZE = 100;

export const getPageLimit = (value, fallback = 10) =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(value, 10) || fallback));

export const decodeCursor = (value) => {
  if (!value) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    );
    if (!decoded.createdAt || !mongoose.isValidObjectId(decoded.id)) {
      return null;
    }
    return {
      createdAt: new Date(decoded.createdAt),
      id: new mongoose.Types.ObjectId(decoded.id),
    };
  } catch {
    return null;
  }
};

export const encodeCursor = (document) =>
  Buffer.from(
    JSON.stringify({
      createdAt: document.createdAt,
      id: document._id,
    })
  ).toString("base64url");

export const getCursorFilter = (cursor) =>
  cursor
    ? {
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
        ],
      }
    : {};
