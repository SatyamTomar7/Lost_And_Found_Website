// controllers/upload.controller.js
import {
  uploadSingle,
  uploadMultiple,
  storeUploadedFile,
  deleteImage,
  getThumbnailUrl,
} from "./upload.service.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { PendingUpload } from "./PendingUpload.model.js";
import logger from "../../shared/utils/logger.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Promisify an Express middleware so it can be awaited inside asyncHandler.
 */
const runMiddleware = (req, res, fn) =>
  new Promise((resolve, reject) => {
    fn(req, res, (err) => (err ? reject(err) : resolve()));
  });

/**
 * Normalize a multer file object into a consistent response shape.
 * Uses the cloudinary service helper for thumbnail — no fragile URL hacking.
 */
const normalizeFile = (file) => ({
  url: file.path,
  publicId: file.filename,
  thumbnail: getThumbnailUrl(file.filename),
  originalName: file.originalname,
  size: file.size ?? 0,                          // `size` is the correct multer field
  format: file.mimetype?.split("/")[1] ?? null,
});

const runUploadMiddleware = async (req, res, middleware) => {
  try {
    await runMiddleware(req, res, middleware);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === "LIMIT_FILE_SIZE") {
      throw new ApiError(400, "Image exceeds the maximum allowed size");
    }
    throw new ApiError(400, "Upload request is invalid");
  }
};

const uploadAndStoreFile = async (file, requestId) => {
  try {
    return await storeUploadedFile(file);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode < 500) throw error;
    logger.error(
      {
        requestId,
        error: {
          name: error?.name || "Error",
          message: error?.message || "Unknown upload provider error",
          ...(error?.stack && { stack: error.stack }),
        },
      },
      "Cloudinary upload failed"
    );
    throw new ApiError(502, "Image upload provider unavailable");
  }
};

const uploadAndStoreFiles = async (files, requestId) => {
  const storedFiles = [];

  try {
    for (const file of files) {
      storedFiles.push(await uploadAndStoreFile(file, requestId));
    }
    return storedFiles;
  } catch (error) {
    const cleanupResults = await Promise.allSettled(
      storedFiles.map((file) => deleteImage(file.filename))
    );

    cleanupResults
      .filter((result) => result.status === "rejected")
      .forEach((result) => {
        logger.error(
          {
            requestId,
            error: {
              name: result.reason?.name || "Error",
              message: result.reason?.message || "Unknown cleanup error",
              ...(result.reason?.stack && { stack: result.reason.stack }),
            },
          },
          "Cloudinary cleanup failed after partial upload failure"
        );
      });

    throw error;
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const uploadSingleImage = asyncHandler(async (req, res) => {
  // Run multer middleware
  await runUploadMiddleware(req, res, uploadSingle);

  if (!req.file) throw new ApiError(400, "No image file provided");
  req.file = await uploadAndStoreFile(req.file, req.requestId);

  const { filename: publicId, path: url } = req.file;

  // Track as pending so the cleanup job can find orphans.
  // If tracking fails, delete the already-uploaded file to prevent orphans.
  try {
    await PendingUpload.create({ publicId, url, userId: req.user.id });
  } catch (dbErr) {
    try {
      await deleteImage(publicId);
    } catch (cleanupError) {
      logger.error(
        {
          requestId: req.requestId,
          error: {
            name: cleanupError?.name || "Error",
            message: cleanupError?.message || "Unknown cleanup error",
            ...(cleanupError?.stack && { stack: cleanupError.stack }),
          },
        },
        "Cloudinary cleanup failed after upload tracking failure"
      );
    }
    throw new ApiError(500, "Failed to track upload — please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, normalizeFile(req.file), "Image uploaded successfully"));
});

// ─────────────────────────────────────────────────────────────────────────────

export const uploadMultipleImages = asyncHandler(async (req, res) => {
  await runUploadMiddleware(req, res, uploadMultiple);

  if (!req.files?.length) throw new ApiError(400, "No image files provided");
  req.files = await uploadAndStoreFiles(req.files, req.requestId);

  const pendingDocs = req.files.map((f) => ({
    publicId: f.filename,
    url: f.path,
    userId: req.user.id,
  }));

  // If DB tracking fails, roll back ALL uploaded files to prevent orphans.
  try {
    await PendingUpload.insertMany(pendingDocs, { ordered: false });
  } catch (dbErr) {
    const cleanupResults = await Promise.allSettled(
      req.files.map((f) => deleteImage(f.filename))
    );
    cleanupResults
      .filter((result) => result.status === "rejected")
      .forEach((result) => {
        logger.error(
          {
            requestId: req.requestId,
            error: {
              name: result.reason?.name || "Error",
              message: result.reason?.message || "Unknown cleanup error",
              ...(result.reason?.stack && { stack: result.reason.stack }),
            },
          },
          "Cloudinary cleanup failed after upload tracking failure"
        );
      });
    throw new ApiError(500, "Failed to track uploads — please try again");
  }

  const images = req.files.map(normalizeFile);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { images, count: images.length },
        `${images.length} image(s) uploaded successfully`
      )
    );
});

// ─────────────────────────────────────────────────────────────────────────────

export const deleteUploadedImage = asyncHandler(async (req, res) => {
  // Public IDs can contain slashes (e.g. "folder/item_123").
  // Use a wildcard route param — register this route as:
  //   router.delete("/image/*", deleteUploadedImage)
  // req.params.path captures the full wildcard path
  const rawId = req.params.path ?? req.body.publicId;
  const publicId = rawId ? decodeURIComponent(rawId).trim() : null;

  if (!publicId) throw new ApiError(400, "Image public ID is required");

  // Only let the owner delete their own pending upload
  const pending = await PendingUpload.findOne({ publicId, userId: req.user.id });
  if (!pending) throw new ApiError(403, "Not found or not authorized");

  const result = await deleteImage(publicId); // already throws ApiError on failure

  // deleteImage in the service throws on hard failures; "not found" is treated as success.
  await PendingUpload.deleteOne({ publicId });

  return res.status(200).json(
    new ApiResponse(
      200,
      { publicId },
      result.result === "not found"
        ? "Image was already removed"
        : "Image deleted successfully"
    )
  );
});
