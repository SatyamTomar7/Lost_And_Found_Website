import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  minSelectableDate,
  today,
} from "./constants";

export const foundItemSchema = z.object({
  name: z.string().min(1, "Please select a name"),
  color: z.string().min(1, "Please select a color"),
  brand: z.string().max(20, "Brand name too long").optional().or(z.literal("")),
  condition: z.enum(["New", "Used"], {
    required_error: "Please select condition",
  }),
  dateFound: z
    .string()
    .min(1, "Date is required")
    .refine((d) => d >= minSelectableDate, {
      message: "Date must be within the last 7 days",
    })
    .refine((d) => d <= today, { message: "Date cannot be in the future" }),
  placeFound: z.string().min(1, "Please select a location"),
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

export const foundItemResolver = zodResolver(foundItemSchema);
