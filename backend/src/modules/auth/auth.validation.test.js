import assert from "node:assert/strict";
import test from "node:test";
import { validateResendOTP } from "./auth.validation.js";

const runValidation = async (body) => {
  const request = { body };
  for (const middleware of validateResendOTP) {
    if (typeof middleware.run === "function") {
      await middleware.run(request);
    } else {
      await new Promise((resolve, reject) => {
        try {
          middleware(request, {}, (error) => {
            if (error) reject(error);
            else resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    }
  }
};

test("resend OTP rejects malformed email input before the controller runs", async () => {
  await assert.rejects(
    () => runValidation({ email: "not-an-email" }),
    /Validation failed/
  );
});

test("resend OTP accepts a valid email input", async () => {
  await runValidation({ email: "student@s.amity.edu" });
});
