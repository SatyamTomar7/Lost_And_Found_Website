import { LostItem } from "../models/LostItem.model.js";
import { FoundItem } from "../models/FoundItem.model.js";
import { ITEM_STATUS } from "../constants.js";

export const reconcileLostItemStatus = async (
  lostItemId,
  session
) => {
  const lostItem = await LostItem.findById(
    lostItemId,
    "matchedFoundItemIds",
    { session }
  );

  if (!lostItem) return;

  const newStatus =
    lostItem.matchedFoundItemIds.length > 0
      ? ITEM_STATUS.MATCHED
      : ITEM_STATUS.PENDING;

  await LostItem.findByIdAndUpdate(
    lostItemId,
    {
      status: newStatus,
    },
    { session }
  );
};

export const reconcileFoundItemStatus = async (
  foundItemId,
  session
) => {
  const foundItem = await FoundItem.findById(
    foundItemId,
    "matchedLostItemIds",
    { session }
  );

  if (!foundItem) return;

  const newStatus =
    foundItem.matchedLostItemIds.length > 0
      ? ITEM_STATUS.MATCHED
      : ITEM_STATUS.FOUND;

  await FoundItem.findByIdAndUpdate(
    foundItemId,
    {
      status: newStatus,
    },
    { session }
  );
};