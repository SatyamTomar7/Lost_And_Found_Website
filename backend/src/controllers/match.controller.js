import { FoundItem } from "../models/FoundItem.model.js";
import { LostItem } from "../models/LostItem.model.js";
import matchingService from "../services/matching.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkLostItemMatches = asyncHandler(async (req, res) => {
  const lostItemId = req.params.id;
  const threshold = parseInt(req.query.threshold) || 60;

  const lostItem = await LostItem.findById(lostItemId);
  if (!lostItem) {
    throw new ApiError(404, "Lost item not found");
  }
  if (lostItem.userId.toString() !== req.user.id && req.user.role != "admin") {
    throw new ApiError("Access denied");
  }
  const matches = await matchingService.findMatchesForLostItem(
    lostItemId,
    threshold
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        data: {
          lostItem: {
            id: lostItem._id,
            name: lostItem.name,
            category: lostItem.category,
            color: lostItem.color,
          },
          matches: matches.map((match) => ({
            FoundItem: {
              id: match.foundItem.name,
              category: match.foundItem.category,
              color: match.foundItem.color,
              department: match.foundItem.department,
              dateFound: match.foundItem.dateFound,
              placefound: match.foundItem.placeFound,
            },
            matchScore: match.matchScore,
            matchDetails: match.matchDetails,
          })),
        },
      },
      "Matches Found Successfully"
    )
  );
});
export const checkFoundItemMatches = asyncHandler(async (req, res) => {
  const foundItemId = req.params.id;
  const threshold = parseInt(req.query.threshold) || 60;

  const foundItem = await FoundItem.findById(foundItemId);

  if (!foundItem) throw new ApiError(404, "FoundItem not found");
  if (
    req.user.role === "admin" &&
    foundItem.department !== req.user.department
  ) {
    throw new ApiError(403, "Access denied");
  }
  const matches = await matchingService.findMatchesForFoundItem(
    foundItemId,
    threshold
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        count: matches.length,
        data: {
          foundItem: {
            id: foundItem._id,
            name: foundItem.name,
            category: foundItem.category,
            color: foundItem.color,
            department: foundItem.department,
          },
          matches: matches.map((match) => ({
            lostItem: {
              id: match.lostItem._id,
              name: match.lostItem.name,
              category: match.lostItem.category,
              color: match.lostItem.color,
              dateLost: match.lostItem.dateLost,
              placeFound: match.lostItem.placeLost,
              user: {
                id: match.lostItem.userId._id,
                name: match.lostItem.userId.name,
                email: match.lostItem.userId.email,
              },
            },
            matchScore: match.matchScore,
            matchDetails: match.matchDetails,
          })),
        },
      },
      "FoundItem Match Found Successfully"
    )
  );
});
