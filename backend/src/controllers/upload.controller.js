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
export const uploadSingleimage = asyncHandler(async (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      throw new ApiError(400, err.message);
    }
    console.log("Uploaded file info:", req.file);
    if (!req.file) {
      throw new ApiError("No image file provided");
    }
    const imageData = {
      url: req.file.path,
      publicId: req.file.filename,
      thumbnail: getThumbnailUrl(req.file.filename),
      originalName: req.file.originalName,
      size: req.file.bytes,
      format: req.file.format,
    };
    res
      .status(200)
      .json(
        new ApiResponse(200, { data: imageData }, "Image uploaded successfully")
      );
  });
});

export const uploadMultipleImages = asyncHandler(async (req, res) => {
  uploadMultiple(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      throw new ApiError(400, err.message);
    }
    if (!req.files || req.files.length === 0) {
      throw new ApiError("No image files provided");
    }
    const images = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      thumbnail: getThumbnailUrl(file.filename),
      originalName: file.originalname,
      size: file.bytes,
      format: file.format,
    }));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          data: images,
        },
        `${images.length} image(s) uploaded successfully`
      )
    );
  });
});

export const DeleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) throw new ApiError(400, "Image public ID is required");
  const result = await deleteImage(publicId);
  if (result.result === "ok") {
    res
      .status(200)
      .json(
        new ApiResponse(200, { data: publicId }, "Image deleted successfully")
      );
  }
  else{
        res
      .status(400)
      .json(
        new ApiResponse(400, { error:result }, "Failed to delete image")
      );
  }
});
