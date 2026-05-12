// controllers/upload.controller.js
import {
  uploadSingle,
  uploadMultiple,
  deleteImage,
  getThumbnailUrl,
} from "../services/cloudinary.service.js";
import { PendingUpload } from "../models/PendingUpload.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

// ─── Controllers ──────────────────────────────────────────────────────────────

export const uploadSingleImage = asyncHandler(async (req, res) => {
  // Run multer middleware
  try {
    await runMiddleware(req, res, uploadSingle);
  } catch (err) {
    throw new ApiError(400, err?.message || "File upload failed");
  }

  if (!req.file) throw new ApiError(400, "No image file provided");

  const { filename: publicId, path: url } = req.file;

  // Track as pending so the cleanup job can find orphans.
  // If tracking fails, delete the already-uploaded file to prevent orphans.
  try {
    await PendingUpload.create({ publicId, url, userId: req.user.id });
  } catch (dbErr) {
    await deleteImage(publicId).catch(() => {}); // best-effort cleanup
    throw new ApiError(500, "Failed to track upload — please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, normalizeFile(req.file), "Image uploaded successfully"));
});

// ─────────────────────────────────────────────────────────────────────────────

export const uploadMultipleImages = asyncHandler(async (req, res) => {
  try {
    await runMiddleware(req, res, uploadMultiple);
  } catch (err) {
    throw new ApiError(400, err?.message || "Multiple file upload failed");
  }

  if (!req.files?.length) throw new ApiError(400, "No image files provided");

  const pendingDocs = req.files.map((f) => ({
    publicId: f.filename,
    url: f.path,
    userId: req.user.id,
  }));

  // If DB tracking fails, roll back ALL uploaded files to prevent orphans.
  try {
    await PendingUpload.insertMany(pendingDocs, { ordered: false });
  } catch (dbErr) {
    await Promise.allSettled(
      req.files.map((f) => deleteImage(f.filename))
    );
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