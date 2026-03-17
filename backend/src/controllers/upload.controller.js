import {
  uploadSingle,
  uploadMultiple,
  deleteImage,
} from "../services/cloudinary.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const runMiddleware = (req, res, fn) =>
  new Promise((resolve, reject) => {
    fn(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

export const uploadSingleImage = asyncHandler(async (req, res) => {
  try {
    await runMiddleware(req, res, uploadSingle);
  } catch (err) {
    throw new ApiError(400, err?.message || "File upload failed");
  }

  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  const thumbnail = req.file.path.includes("/upload/")
    ? req.file.path.replace(
        "/upload/",
        "/upload/w_200,h_200,c_fill,g_auto,f_auto/"
      )
    : req.file.path;

  const imageData = {
    url: req.file.path,
    publicId: req.file.filename,
    thumbnail,
    originalName: req.file.originalname,
    size: req.file.size || req.file.bytes,
    format: req.file.mimetype.split("/")[1],
  };

  return res
    .status(200)
    .json(new ApiResponse(200, imageData, "Image uploaded successfully"));
});
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  try {
    await runMiddleware(req, res, uploadMultiple);
  } catch (err) {
    throw new ApiError(400, err?.message || "Multiple file upload failed");
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No image files provided");
  }

  const images = req.files.map((file) => {
    const thumbnail = file.path.includes("/upload/")  // ← fixed leading slash
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
      size: file.size || file.bytes || 0,
      format: file.mimetype ? file.mimetype.split("/")[1] : file.format,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { images },
      `${images.length} image(s) uploaded successfully`
    )
  );
});
export const deleteUploadedImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "Image public ID is required");
  }

  const decodedPublicId = decodeURIComponent(publicId);
  const result = await deleteImage(decodedPublicId);
  const isSuccessful = result.result === "ok" || result.result === "not found";

  if (!isSuccessful) {
    throw new ApiError(400, "Cloud storage provider could not process the deletion");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { publicId: decodedPublicId },
      result.result === "not found"
        ? "Image was already removed or does not exist"
        : "Image deleted successfully from cloud storage"
    )
  );
});
