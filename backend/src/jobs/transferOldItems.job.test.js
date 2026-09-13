import assert from "node:assert/strict";
import test from "node:test";
import { claimTransferItem } from "./transferOldItems.job.js";

const createAtomicFoundItemModel = () => {
  const document = {
    _id: "found-1",
    handledBy: "admin",
    status: "found",
    isActive: true,
    transferState: "pending",
  };

  return {
    document,
    findOneAndUpdate(filter, update) {
      const stateMatches =
        document.transferState === filter.$or[1].transferState.$in[0] ||
        document.transferState === filter.$or[1].transferState.$in[1];
      if (
        document._id !== filter._id ||
        document.handledBy !== filter.handledBy ||
        !stateMatches
      ) {
        return { lean: async () => null };
      }

      document.transferState = update.$set.transferState;
      document.transferJobId = update.$set.transferJobId;
      return {
        lean: async () => ({ ...document }),
      };
    },
  };
};

test("only one worker claims a transfer item", async () => {
  const FoundItem = createAtomicFoundItemModel();
  const cutoff = new Date();

  const results = await Promise.all([
    claimTransferItem("found-1", cutoff, "job-1", FoundItem),
    claimTransferItem("found-1", cutoff, "job-2", FoundItem),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(FoundItem.document.transferState, "processing");
});
