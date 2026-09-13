export const claimPendingUpload = (
  PendingUpload,
  { publicId, userId, claimedAt = new Date() }
) =>
  PendingUpload.findOneAndUpdate(
    {
      publicId,
      userId,
      claimedAt: null,
    },
    {
      $set: {
        claimedAt,
        claimedBy: userId,
      },
    },
    { new: true }
  );
