import cron from "node-cron";
import { FoundItem } from "../models/FoundItem.model.js";
import { Notification } from "../models/Notification.model.js";
import {
  ITEM_STATUS,
  NOTIFICATION_TYPES,
  USER_ROLES,
} from "../constants.js";
import { emailService } from "../services/email.service.js";
import matchingService from "../services/matching.service.js";
import { buildMatchNotificationMessage } from "../utils/matchNotificationMessage.js";

// Track scheduled task
let transferJob = null;
let socketIo = null;

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

      console.log(
        `[TransferJob] Starting at ${new Date().toISOString()}`
      );

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
            // Transfer item to security
            await FoundItem.findByIdAndUpdate(item._id, {
              $set: {
                handledBy: USER_ROLES.SECURITY,
                block: null,
              },
            });

            // Re-run matching after transfer
            const newMatches =
              await matchingService.rematchAfterTransferToSecurity(
                item._id,
                70
              );

            const topMatches = newMatches.slice(0, 5);

            if (topMatches.length > 0) {
              await Promise.all(
                topMatches.map(async (match) => {
                  if (!match?.lostItem?.userId?._id) {
                    return null;
                  }

                  const notification = await Notification.create({
                    userId: match.lostItem.userId._id,
                    type: NOTIFICATION_TYPES.MATCH_FOUND,
                    title: "Your Lost Item Might Be Found!",
                    message: buildMatchNotificationMessage(
                      match.lostItem.name,
                      match.matchScore,
                      match.foundItem
                    ),
                    data: {
                      lostItemId: match.lostItem._id,
                      foundItemId: match.foundItem._id,
                      matchScore: match.matchScore,
                      createdBy: match.foundItem.createdBy,
                    },
                    priority: match.matchScore > 85 ? "high" : "medium",
                  });

                  emailService
                    .sendMatchNotification(
                      match.lostItem.userId.email,
                      match.lostItem.userId.name,
                      match.lostItem,
                      match.foundItem
                    )
                    .catch((err) =>
                      console.error("[TransferJob] Email Error:", err)
                    );

                  if (socketIo) {
                    socketIo.sendNotificationToUser(
                      match.lostItem.userId._id,
                      {
                        ...notification.toObject(),
                        foundItem: match.foundItem,
                      }
                    );
                  }

                  return notification;
                })
              );
            }

            console.log(
              `[TransferJob] Transferred and re-matched item ${item._id}`
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

        const elapsed = (
          (Date.now() - jobStart) /
          1000
        ).toFixed(2);

        console.log(
          `[TransferJob] Done in ${elapsed}s - ` +
            `success: ${results.success}, ` +
            `failed: ${results.failed}` +
            (results.failedIds.length
              ? `, failedIds: [${results.failedIds.join(", ")}]`
              : "")
        );
      } catch (error) {
        console.error(
          "[TransferJob] Fatal error - job aborted:",
          error
        );
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
