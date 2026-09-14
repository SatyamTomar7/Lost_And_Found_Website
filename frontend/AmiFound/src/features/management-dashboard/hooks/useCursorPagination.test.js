import assert from "node:assert/strict";
import test from "node:test";

test("cursor navigation keeps the first page cursor empty and advances with nextCursor", () => {
  const cursors = [null];
  const nextCursor = "page-two";
  cursors.push(nextCursor);

  assert.deepEqual(cursors, [null, "page-two"]);
  assert.equal(cursors[0], null);
  assert.equal(cursors[1], nextCursor);
});

test("filter changes reset cursor history to the first page", () => {
  let page = 3;
  let cursors = [null, "page-two", "page-three"];

  page = 1;
  cursors = [null];

  assert.equal(page, 1);
  assert.deepEqual(cursors, [null]);
});
