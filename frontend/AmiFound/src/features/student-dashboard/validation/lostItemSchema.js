import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  minSelectableDate,
  today,
} from "../constants";

export const lostItemSchema = z.object({
  name: z.string().min(1, "Please select a name"),
  color: z.string().min(1, "Please select a color"),
  brand: z.string().max(50, "Brand name too long").optional().or(z.literal("")),
  condition: z.enum(["New", "Used"], {
    required_error: "Please select condition",
  }),
  dateLost: z
    .string()
    .min(1, "Date is required")
    .refine((d) => d >= minSelectableDate, {
      message: "Date must be within the last 7 days",
    })
    .refine((d) => d <= today, { message: "Date cannot be in the future" }),
  placeLost: z.string().min(1, "Please select a location"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  photo: z
    .any()
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= 5000000,
      "Max file size is 5MB.",
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(
          files[0].type,
        ),
      ".jpg, .jpeg, .png, and .webp files are accepted.",
    )
    .optional(),
});

export const lostItemResolver = zodResolver(lostItemSchema);
