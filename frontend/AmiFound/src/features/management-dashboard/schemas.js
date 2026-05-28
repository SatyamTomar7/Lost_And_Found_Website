import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FOUND_ITEM_RECOVERY_MODES,
  getMinSelectableDate,
  today,
} from "./constants";

export const createFoundItemSchema = ({
  isSecurity = false,
} = {}) =>
  z
    .object({
      name: z.string().min(1, "Please select a name"),
      color: z.string().min(1, "Please select a color"),
      brand: z
        .string()
        .max(20, "Brand name too long")
        .optional()
        .or(z.literal("")),
      description: z
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .optional()
        .or(z.literal("")),
      condition: z.enum(["New", "Used"], {
        required_error: "Please select condition",
      }),
      recoveryMode: z
        .enum(
          [
            FOUND_ITEM_RECOVERY_MODES.NORMAL,
            FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED,
          ],
          {
            required_error: "Please select recovery mode",
          },
        )
        .default(FOUND_ITEM_RECOVERY_MODES.NORMAL),
      dateFound: z
        .string()
        .min(1, "Date is required")
        .refine((d) => d <= today, { message: "Date cannot be in the future" }),
      placeFound: z.string().min(1, "Please select a location"),
    })
    .superRefine((data, ctx) => {
      const recoveryMode =
        isSecurity && data.recoveryMode
          ? data.recoveryMode
          : FOUND_ITEM_RECOVERY_MODES.NORMAL;

      if (data.dateFound && data.dateFound < getMinSelectableDate(recoveryMode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            recoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED
              ? "Date must be within the last 30 days"
              : "Date must be within the last 7 days",
          path: ["dateFound"],
        });
      }
    });

export const collectOfflineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  enrollmentNumber: z.string().min(1, "Enrollment required"),
  phoneNumber: z.string().min(1, "Phone required"),
  course: z.string().min(1, "Course required"),
  branch: z.string().min(1, "Branch required"),
  semester: z.string().min(1, "Semester required"),
  block: z.string().min(1, "Block required"),
});

export const createFoundItemResolver = (options) =>
  zodResolver(createFoundItemSchema(options));

export const foundItemResolver = createFoundItemResolver();
