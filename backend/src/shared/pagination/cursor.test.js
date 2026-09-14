import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeCursor,
  encodeCursor,
  getCursorFilter,
  getPageLimit,
} from "./cursor.js";

test("cursor pagination encodes and restores a stable createdAt/id position", () => {
  const document = {
    _id: "507f1f77bcf86cd799439011",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const decoded = decodeCursor(encodeCursor(document));

  assert.equal(decoded.id.toString(), document._id);
  assert.equal(
    decoded.createdAt.toISOString(),
    document.createdAt.toISOString()
  );
  assert.deepEqual(getCursorFilter(decoded), {
    $or: [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ],
  });
});

test("cursor pagination rejects malformed cursors and caps page size", () => {
  assert.equal(decodeCursor("invalid"), null);
  assert.equal(getPageLimit("1000"), 100);
  assert.equal(getPageLimit("0"), 10);
});
