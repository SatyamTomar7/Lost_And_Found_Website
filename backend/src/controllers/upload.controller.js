import {
  uploadSingle,
  uploadMultiple,
  deleteImage,
  getImageDetails,
  getThumbnailUrl,
} from "../services/cloudinary.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { promisify } from 'util';
export const uploadSingleimage = asyncHandler(async (req, res) => {
  // 1. Promisify the Multer middleware to avoid callback nesting
  const upload = promisify(uploadSingle);

  try {
    await upload(req, res);
  } catch (err) {
    throw new ApiError(400, err?.message || "File upload failed");
  }

  // 2. Strict File Check
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  // 3. Structured Metadata
  // Using optional chaining and ensuring standard Multer property names
  const imageData = {
    url: req.file.path, // Cloudinary secure_url
    publicId: req.file.filename,
    // Better Now: Use Cloudinary's dynamic scaling if applicable
    thumbnail: req.file.path.replace("/upload/", "/upload/w_200,h_200,c_fill/"),
    originalName: req.file.originalname,
    size: req.file.size || req.file.bytes,
    format: req.file.mimetype.split("/")[1],
  };

  // 4. Clean Response
  return res
    .status(200)
    .json(new ApiResponse(200, imageData, "Image uploaded successfully"));
});
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  // 1. Convert Multer callback to a Promise
  const upload = promisify(uploadMultiple);

  try {
    await upload(req, res);
  } catch (err) {
    throw new ApiError(400, err?.message || "Multiple file upload failed");
  }

  // 2. Validate existence of files
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No image files provided");
  }

  // 3. Map images with "Now" standards
  const images = req.files.map((file) => {
    // Dynamic Cloudinary thumbnail (adjusting path for 200x200 crop)
    const thumbnail = file.path.includes("upload/")
      ? file.path.replace(
          "/upload/",
          "/upload/w_200,h_200,c_fill,g_auto,f_auto/"
        )
      : file.path;

    return {
      url: file.path,
      publicId: file.filename,
      thumbnail: thumbnail,
      originalName: file.originalname,
      size: file.size || file.bytes || 0,
      format: file.mimetype ? file.mimetype.split("/")[1] : file.format,
    };
  });

  // 4. Clean and structured response
  return res.status(200).json(
    new ApiResponse(
      200,
      { images }, // Flattened the object slightly for easier frontend use
      `${images.length} image(s) uploaded successfully`
    )
  );
});
export const DeleteImage = asyncHandler(async (req, res) => {
  // 1. Validate Input
  // Note: publicId often contains slashes (folder/image),
  // ensure your route is configured to handle encoded URI components.
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "Image public ID is required");
  }

  // 2. Call Cloud Service
  // We wrap the external service call to handle potential timeouts
  const result = await deleteFromCloudinary(publicId);

  /**
   * 3. Intelligent Success Handling
   * In Cloudinary, if result is 'ok', it was deleted.
   * If result is 'not found', it's already gone (idempotent success).
   */
  const isSuccessful = result.result === "ok" || result.result === "not found";

  if (isSuccessful) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { publicId },
          result.result === "not found"
            ? "Image was already removed or does not exist"
            : "Image deleted successfully from cloud storage"
        )
      );
  }

  // 4. Sanitized Failure
  // If result is 'error' or anything else, we handle it gracefully
  return res
    .status(400)
    .json(
      new ApiResponse(
        400,
        { cloudResponse: result.result },
        "Cloud storage provider could not process the deletion"
      )
    );
});
