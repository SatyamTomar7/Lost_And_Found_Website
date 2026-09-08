import assert from "node:assert/strict";
import test from "node:test";
import { validateFinalAssignments } from "./department-assignment.service.js";

const admins = [
  { _id: "admin-a", block: "A" },
  { _id: "admin-b", block: "B" },
  { _id: "admin-c", block: "C" },
];

test("accepts a complete three-admin department rotation", () => {
  assert.doesNotThrow(() =>
    validateFinalAssignments(
      [
        { adminId: "admin-a", block: "B" },
        { adminId: "admin-b", block: "C" },
        { adminId: "admin-c", block: "A" },
      ],
      admins
    )
  );
});

test("rejects a duplicate block", () => {
  assert.throws(
    () =>
      validateFinalAssignments(
        [
          { adminId: "admin-a", block: "B" },
          { adminId: "admin-b", block: "B" },
          { adminId: "admin-c", block: "C" },
        ],
        admins
      ),
    /block can only be assigned/i
  );
});

test("rejects an incomplete or invalid final assignment", () => {
  assert.throws(
    () => validateFinalAssignments([{ adminId: "admin-a", block: "A" }], admins),
    /complete current admin assignment list/i
  );
  assert.throws(
    () =>
      validateFinalAssignments(
        [
          { adminId: "admin-a", block: "A" },
          { adminId: "admin-b", block: "B" },
          { adminId: "admin-c", block: "Z" },
        ],
        admins
      ),
    /Block must be A, B, C, D, or E/
  );
});
