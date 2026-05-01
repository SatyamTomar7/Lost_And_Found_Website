// controllers/upload.controller.js
import {
  uploadSingle,
  uploadMultiple,
  deleteImage,
} from "../services/cloudinary.service.js";
import { PendingUpload } from "../models/PendingUpload.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const runMiddleware = (req, res, fn) =>
  new Promise((resolve, reject) => {
    fn(req, res, (err) => (err ? reject(err) : resolve()));
  });

export const uploadSingleImage = asyncHandler(async (req, res) => {
  try {
    await runMiddleware(req, res, uploadSingle);
  } catch (err) {
    throw new ApiError(400, err?.message || "File upload failed");
  }

  if (!req.file) throw new ApiError(400, "No image file provided");

  const publicId = req.file.filename;
  const url = req.file.path;

  // Save a pending record so the cleanup job can find orphans
  await PendingUpload.create({ publicId, url, userId: req.user.id });

  const thumbnail = url.includes("/upload/")
    ? url.replace("/upload/", "/upload/w_200,h_200,c_fill,g_auto,f_auto/")
    : url;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        url,
        publicId,
        thumbnail,
        originalName: req.file.originalname,
        size: req.file.bytes || req.file.size || 0,
        format: req.file.mimetype?.split("/")[1],
      },
      "Image uploaded successfully"
    )
  );
});

export const uploadMultipleImages = asyncHandler(async (req, res) => {
  try {
    await runMiddleware(req, res, uploadMultiple);
  } catch (err) {
    throw new ApiError(400, err?.message || "Multiple file upload failed");
  }

  if (!req.files?.length) throw new ApiError(400, "No image files provided");

  // Save all as pending in one shot
  const pendingDocs = req.files.map((f) => ({
    publicId: f.filename,
    url: f.path,
    userId: req.user.id,
  }));
  await PendingUpload.insertMany(pendingDocs);

  const images = req.files.map((file) => {
    const thumbnail = file.path.includes("/upload/")
      ? file.path.replace(
          "/upload/",
          "/upload/w_200,h_200,c_fill,g_auto,f_auto/"
        )
      : file.path;
    return {
      url: file.path,
      publicId: file.filename,
      thumbnail,
      originalName: file.originalname,
      size: file.bytes || file.size || 0,
      format: file.mimetype?.split("/")[1] ?? file.format,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { images },
        `${images.length} image(s) uploaded successfully`
      )
    );
});

export const deleteUploadedImage = asyncHandler(async (req, res) => {
  const publicId = decodeURIComponent(req.params.path);

  if (!publicId) throw new ApiError(400, "Image public ID is required");

  // Only let the owner delete their own pending upload
  const pending = await PendingUpload.findOne({
    publicId,
    userId: req.user.id,
  });
  if (!pending) throw new ApiError(403, "Not found or not authorized");

  const result = await deleteImage(publicId);
  const ok = result.result === "ok" || result.result === "not found";
  if (!ok)
    throw new ApiError(400, "Cloud storage could not process the deletion");

  await PendingUpload.deleteOne({ publicId });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { publicId },
        result.result === "not found"
          ? "Image was already removed"
          : "Image deleted successfully"
      )
    );
});
