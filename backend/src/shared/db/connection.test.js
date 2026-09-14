import assert from "node:assert/strict";
import test from "node:test";
import { getMongoConnectionUri } from "./connection.js";

test("adds the database only when MongoDB URI has no database path", () => {
  assert.equal(
    getMongoConnectionUri("mongodb://localhost:27017"),
    "mongodb://localhost:27017/LOST_AND_FOUND_AMITY"
  );
});

test("preserves an existing database path and query parameters", () => {
  assert.equal(
    getMongoConnectionUri(
      "mongodb://localhost:27017/existing?retryWrites=true"
    ),
    "mongodb://localhost:27017/existing?retryWrites=true"
  );
});
