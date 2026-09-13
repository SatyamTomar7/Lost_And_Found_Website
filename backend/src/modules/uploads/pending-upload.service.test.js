import assert from "node:assert/strict";
import test from "node:test";
import { claimPendingUpload } from "./pending-upload.service.js";

const createAtomicPendingUploadModel = () => {
  const document = {
    publicId: "image-1",
    userId: "user-1",
    claimedAt: null,
    claimedBy: null,
  };

  return {
    document,
    async findOneAndUpdate(filter, update) {
      if (
        document.publicId !== filter.publicId ||
        document.userId !== filter.userId ||
        document.claimedAt !== filter.claimedAt
      ) {
        return null;
      }

      document.claimedAt = update.$set.claimedAt;
      document.claimedBy = update.$set.claimedBy;
      return { ...document };
    },
  };
};

test("claims a pending upload atomically for its owner", async () => {
  const PendingUpload = createAtomicPendingUploadModel();

  const claimed = await claimPendingUpload(PendingUpload, {
    publicId: "image-1",
    userId: "user-1",
  });

  assert.equal(claimed.claimedBy, "user-1");
  assert.notEqual(claimed.claimedAt, null);
});

test("does not allow another user to claim an upload", async () => {
  const PendingUpload = createAtomicPendingUploadModel();

  assert.equal(
    await claimPendingUpload(PendingUpload, {
      publicId: "image-1",
      userId: "user-2",
    }),
    null
  );
});

test("two concurrent claims allow exactly one success", async () => {
  const PendingUpload = createAtomicPendingUploadModel();

  const results = await Promise.all([
    claimPendingUpload(PendingUpload, {
      publicId: "image-1",
      userId: "user-1",
    }),
    claimPendingUpload(PendingUpload, {
      publicId: "image-1",
      userId: "user-1",
    }),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
});
