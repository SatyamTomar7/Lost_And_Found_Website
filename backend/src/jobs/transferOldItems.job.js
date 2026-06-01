import cron from "node-cron";
import { ITEM_STATUS, NOTIFICATION_TYPES, USER_ROLES } from "../config/constants.js";
import { FoundItem } from "../modules/found-items/FoundItem.model.js";
import { LostItem } from "../modules/lost-items/LostItem.model.js";
import {
  buildTransferToSecurityNotificationMessage,
  getTransferredFromBlock,
} from "../modules/matching/match-notification-message.js";
import { Notification } from "../modules/notifications/Notification.model.js";
// Track scheduled task
let transferJob = null;
let socketIo = null;

const ACTIVE_LOST_MATCH_STATUSES = [ITEM_STATUS.MATCHED];
const OUTDATED_PICKUP_MESSAGE =
  "This pickup instruction is outdated because the item has been transferred to the University Security Office.";

export const startTransferOldItemsJob = (io = null) => {
  // Prevent duplicate cron jobs
  if (transferJob) {
    console.log("[TransferJob] Already running");
    return;
  }

  socketIo = io;

  // Runs every day at midnight (India time)
  transferJob = cron.schedule(
    "0 0 * * *",
    async () => {
      const jobStart = Date.now();

      console.log(`[TransferJob] Starting at ${new Date().toISOString()}`);

      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldItems = await FoundItem.find({
          handledBy: USER_ROLES.ADMIN,
          status: {
            $in: [ITEM_STATUS.FOUND, ITEM_STATUS.MATCHED],
          },
          dateFound: {
            $lte: sevenDaysAgo,
          },
          isActive: true,
        }).lean();

        console.log(
          `[TransferJob] ${oldItems.length} item(s) eligible for transfer`
        );

        if (oldItems.length === 0) {
          console.log("[TransferJob] No eligible items found");
          return;
        }

        const results = {
          success: 0,
          failed: 0,
          failedIds: [],
        };

        for (const item of oldItems) {
          try {
            const transferredFromBlock = getTransferredFromBlock(item);

            // Transfer item to security
            await FoundItem.findByIdAndUpdate(item._id, {
              $set: {
                handledBy: USER_ROLES.SECURITY,
                block: null,
              },
            });

            const activeLostItems = await LostItem.find({
              _id: { $in: item.matchedLostItemIds || [] },
              status: { $in: ACTIVE_LOST_MATCH_STATUSES },
              matchedFoundItemIds: item._id,
              isActive: true,
            })
              .select("_id name userId")
              .lean();

            console.log(
              `[TransferJob] ${item._id} transferred to security with ${activeLostItems.length} active matched lost item(s)`
            );

            for (const lostItem of activeLostItems) {
              const duplicateTransferNotification = await Notification.findOne({
                userId: lostItem.userId,
                type: NOTIFICATION_TYPES.ITEM_TRANSFERRED_TO_SECURITY,
                "data.foundItemId": item._id,
                "data.lostItemId": lostItem._id,
              })
                .select("_id")
                .lean();

              if (duplicateTransferNotification) {
                console.log(
                  `[TransferJob] Skipping duplicate transfer notification for found item ${item._id} and lost item ${lostItem._id}`
                );
                continue;
              }

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

              const transferNotification = await Notification.create({
                userId: lostItem.userId,
                type: NOTIFICATION_TYPES.ITEM_TRANSFERRED_TO_SECURITY,
                title: "Matched item transferred to Security Office",
                message: buildTransferToSecurityNotificationMessage(
                  item.name,
                  { ...item, originalBlock: transferredFromBlock }
                ),
                data: {
                  foundItemId: item._id,
                  lostItemId: lostItem._id,
                  transferredFromBlock,
                },
                priority: "high",
              });

              if (socketIo) {
                socketIo.sendNotificationToUser(lostItem.userId.toString(), {
                  ...transferNotification.toObject(),
                });
              }

              console.log(
                `[TransferJob] Sent security transfer notification to user ${lostItem.userId} for found item ${item._id}`
              );
            }

            if (item.createdBy) {
              const adminNotification = await Notification.create({
                userId: item.createdBy, // admin's userId
                type: NOTIFICATION_TYPES.ITEM_TRANSFERRED,
                title: "Item Transferred to Security",
                message: `"${item.name}" (${item.color}, found at ${item.placeFound}) has been held for 7 days and transferred to the Security office. Please ensure the item is physically handed over to security staff.`,
                data: {
                  foundItemId: item._id,
                },
                priority: "high",
              });

              if (socketIo) {
                socketIo.sendNotificationToUser(item.createdBy, {
                  ...adminNotification.toObject(),
                });
              }
            }

            // Re-run matching after transfer
            console.log(
              `[TransferJob] Transferred ${item._id} from Block ${transferredFromBlock ?? "unknown"} to security`
            );

            results.success++;
          } catch (err) {
            console.error(
              `[TransferJob] Failed item ${item._id}: ${err.message}`
            );

            results.failed++;
            results.failedIds.push(item._id.toString());
          }
        }

        const elapsed = ((Date.now() - jobStart) / 1000).toFixed(2);

        console.log(
          `[TransferJob] Done in ${elapsed}s - ` +
            `success: ${results.success}, ` +
            `failed: ${results.failed}` +
            (results.failedIds.length
              ? `, failedIds: [${results.failedIds.join(", ")}]`
              : "")
        );
      } catch (error) {
        console.error("[TransferJob] Fatal error - job aborted:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "[TransferJob] Scheduled - runs daily at midnight (Asia/Kolkata)"
  );
};

/**
 * Stop cron job gracefully
 */
export const stopTransferOldItemsJob = () => {
  if (transferJob) {
    transferJob.stop();
    transferJob = null;
    socketIo = null;

    console.log("[TransferJob] Stopped");
  }
};
