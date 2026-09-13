import crypto from "crypto";
import cron from "node-cron";
import { ITEM_STATUS, NOTIFICATION_TYPES, USER_ROLES } from "../config/constants.js";
import { FoundItem } from "../modules/found-items/FoundItem.model.js";
import { LostItem } from "../modules/lost-items/LostItem.model.js";
import {
  buildTransferToSecurityNotificationMessage,
  getTransferredFromBlock,
} from "../modules/matching/match-notification-message.js";
import { Notification } from "../modules/notifications/Notification.model.js";
import logger from "../shared/utils/logger.js";

let transferJob = null;
let socketIo = null;
let isTransferJobRunning = false;

const JOB_NAME = "transfer-old-items";
const TRANSFER_LEASE_MS = 15 * 60 * 1000;
const ACTIVE_LOST_MATCH_STATUSES = [ITEM_STATUS.MATCHED];
const OUTDATED_PICKUP_MESSAGE =
  "This pickup instruction is outdated because the item has been transferred to the University Security Office.";

const createJobContext = (trigger) => ({
  jobName: JOB_NAME,
  jobExecutionId: crypto.randomUUID(),
  trigger,
});

const logJobError = (context, itemId, error, operation) => {
  logger.error(
    {
      ...context,
      itemId: itemId?.toString(),
      operation,
      error: {
        name: error?.name || "Error",
        message: error?.message || "Unknown job error",
        ...(error?.stack && { stack: error.stack }),
      },
    },
    "Transfer job item failed"
  );
};

const createIdempotentNotification = async (filter, document) =>
  Notification.findOneAndUpdate(
    filter,
    { $setOnInsert: document },
    { new: true, upsert: true, includeResultMetadata: true }
  );

const notifyUser = async (notification, userId) => {
  if (socketIo && notification?.lastErrorObject?.updatedExisting === false) {
    socketIo.sendNotificationToUser(userId.toString(), {
      ...notification.value.toObject(),
    });
  }
};

export const claimTransferItem = async (
  itemId,
  cutoff,
  jobExecutionId,
  model = FoundItem
) => {
  const staleBefore = new Date(Date.now() - TRANSFER_LEASE_MS);

  return model.findOneAndUpdate(
    {
      _id: itemId,
      handledBy: USER_ROLES.ADMIN,
      status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
      dateFound: { $lt: cutoff },
      isActive: true,
      $or: [
        { transferState: { $exists: false } },
        { transferState: { $in: ["pending", "retryable"] } },
        { transferState: "processing", transferStartedAt: { $lt: staleBefore } },
      ],
    },
    {
      $set: {
        transferState: "processing",
        transferJobId: jobExecutionId,
        transferStartedAt: new Date(),
        transferLastError: null,
      },
    },
    { new: true }
  ).lean();
};

const processTransferItem = async (item, context) => {
  const transferredFromBlock = getTransferredFromBlock(item);
  const activeLostItems = await LostItem.find({
    _id: { $in: item.matchedLostItemIds || [] },
    status: { $in: ACTIVE_LOST_MATCH_STATUSES },
    matchedFoundItemIds: item._id,
    isActive: true,
  })
    .select("_id name userId")
    .lean();

  for (const lostItem of activeLostItems) {
    await Notification.updateMany(
      {
        userId: lostItem.userId,
        type: NOTIFICATION_TYPES.MATCH_FOUND,
        "data.foundItemId": item._id,
        "data.lostItemId": lostItem._id,
        isOutdated: { $ne: true },
      },
      {
        $set: {
          isOutdated: true,
          "data.outdatedMessage": OUTDATED_PICKUP_MESSAGE,
        },
      }
    );

    const notification = await createIdempotentNotification(
      {
        userId: lostItem.userId,
        type: NOTIFICATION_TYPES.ITEM_TRANSFERRED_TO_SECURITY,
        "data.foundItemId": item._id,
        "data.lostItemId": lostItem._id,
      },
      {
        userId: lostItem.userId,
        type: NOTIFICATION_TYPES.ITEM_TRANSFERRED_TO_SECURITY,
        title: "Matched item transferred to Security Office",
        message: buildTransferToSecurityNotificationMessage(item.name, {
          ...item,
          originalBlock: transferredFromBlock,
        }),
        data: {
          foundItemId: item._id,
          lostItemId: lostItem._id,
          transferredFromBlock,
        },
        priority: "high",
      }
    );

    await notifyUser(notification, lostItem.userId);
  }

  if (item.createdBy) {
    const notification = await createIdempotentNotification(
      {
        userId: item.createdBy,
        type: NOTIFICATION_TYPES.ITEM_TRANSFERRED,
        "data.foundItemId": item._id,
      },
      {
        userId: item.createdBy,
        type: NOTIFICATION_TYPES.ITEM_TRANSFERRED,
        title: "Item Transferred to Security",
        message: `"${item.name}" (${item.color}, found at ${item.placeFound}) has been held for 7 days and transferred to the Security office. Please ensure the item is physically handed over to security staff.`,
        data: { foundItemId: item._id },
        priority: "high",
      }
    );

    await notifyUser(notification, item.createdBy);
  }

  await FoundItem.updateOne(
    {
      _id: item._id,
      transferState: "processing",
      transferJobId: context.jobExecutionId,
    },
    {
      $set: {
        handledBy: USER_ROLES.SECURITY,
        block: null,
        transferState: "completed",
        transferCompletedAt: new Date(),
      },
      $unset: {
        transferJobId: "",
        transferStartedAt: "",
        transferLastError: "",
      },
    }
  );
};

export const runTransferOldItems = async (trigger = "scheduled") => {
  if (isTransferJobRunning) {
    logger.info({ jobName: JOB_NAME, trigger }, "Transfer job already running");
    return;
  }

  isTransferJobRunning = true;
  const context = createJobContext(trigger);
  const startedAt = Date.now();
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6);

  logger.info(context, "Transfer job started");

  try {
    const candidates = await FoundItem.find({
      handledBy: USER_ROLES.ADMIN,
      status: { $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED] },
      dateFound: { $lt: cutoff },
      isActive: true,
      $or: [
        { transferState: { $exists: false } },
        { transferState: { $in: ["pending", "retryable"] } },
        {
          transferState: "processing",
          transferStartedAt: { $lt: new Date(Date.now() - TRANSFER_LEASE_MS) },
        },
      ],
    })
      .select("_id")
      .lean();

    const results = { success: 0, failed: 0, skipped: 0 };

    for (const candidate of candidates) {
      const item = await claimTransferItem(
        candidate._id,
        cutoff,
        context.jobExecutionId
      );
      if (!item) {
        results.skipped++;
        continue;
      }

      try {
        await processTransferItem(item, context);
        results.success++;
      } catch (error) {
        results.failed++;
        await FoundItem.updateOne(
          {
            _id: item._id,
            transferState: "processing",
            transferJobId: context.jobExecutionId,
          },
          {
            $set: {
              transferState: "retryable",
              transferLastError: error?.message || "Transfer failed",
            },
            $unset: {
              transferJobId: "",
              transferStartedAt: "",
            },
          }
        );
        logJobError(context, item._id, error, "process-transfer-item");
      }
    }

    logger.info(
      {
        ...context,
        durationMs: Date.now() - startedAt,
        ...results,
      },
      "Transfer job completed"
    );
  } catch (error) {
    logger.error(
      {
        ...context,
        error: {
          name: error?.name || "Error",
          message: error?.message || "Unknown job error",
          ...(error?.stack && { stack: error.stack }),
        },
      },
      "Transfer job failed"
    );
  } finally {
    isTransferJobRunning = false;
  }
};

export const startTransferOldItemsJob = (io = null) => {
  if (transferJob) {
    logger.info({ jobName: JOB_NAME }, "Transfer job already scheduled");
    return;
  }

  socketIo = io;
  transferJob = cron.schedule(
    "0 0 * * *",
    () => runTransferOldItems("scheduled"),
    { timezone: "Asia/Kolkata" }
  );

  logger.info({ jobName: JOB_NAME }, "Transfer job scheduled");
  void runTransferOldItems("startup catch-up");
};

export const stopTransferOldItemsJob = () => {
  if (transferJob) {
    transferJob.stop();
    transferJob = null;
    socketIo = null;
    logger.info({ jobName: JOB_NAME }, "Transfer job stopped");
  }
};
