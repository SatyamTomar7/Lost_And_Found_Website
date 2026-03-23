import { google } from "googleapis";

// ─── Sanitizer ────────────────────────────────────────────────────────────────
const sanitize = (str) =>
  String(str).replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])
  );

// ─── Gmail OAuth2 Setup ───────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// ─── Helper: Build raw base64 email ──────────────────────────────────────────
function buildRawEmail({ to, subject, html }) {
  const message = [
    `From: Amity Lost & Found <${process.env.MY_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Helper: Send via Gmail API ───────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const raw = buildRawEmail({ to, subject, html });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

// ─── Email Service Class ──────────────────────────────────────────────────────
class EmailService {
  // ─── OTP Verification Email ─────────────────────────────────────────────
  async sendOTPVerification(email, name, otp) {
    try {
      const safeName = sanitize(name);
      const safeOtp = sanitize(otp);

      await sendEmail({
        to: email,
        subject: "Email Verification - Amity Lost & Found",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Amity Lost & Found</h1>
              <p style="color: white; margin: 5px 0;">University Management System</p>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e40af;">Email Verification Required</h2>
              <p>Hello <strong>${safeName}</strong>,</p>
              <p>Thank you for registering with the Amity Lost & Found System. To complete your registration, please verify your email address using the OTP below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #1e40af; color: white; font-size: 24px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 3px;">
                  ${safeOtp}
                </div>
              </div>
              <p><strong>Important:</strong></p>
              <ul>
                <li>This OTP is valid for 10 minutes only</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this verification, please ignore this email</li>
              </ul>
              <p>Once verified, you'll be able to:</p>
              <ul>
                <li>Report lost items</li>
                <li>Track your submissions</li>
                <li>Receive notifications when matches are found</li>
              </ul>
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                This email was sent from the Amity University Lost & Found Management System.
                If you have any questions, please contact the IT department.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`OTP verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Email sending error:", error);
      return false;
    }
  }

  // ─── Match Notification Email ────────────────────────────────────────────
  async sendMatchNotification(userEmail, userName, lostItem, foundItem, department) {
    try {
      const safeUserName = sanitize(userName);
      const safeDepartment = sanitize(department);
      const safeLostName = sanitize(lostItem.name);
      const safeLostColor = sanitize(lostItem.color);
      const safeLostPlace = sanitize(lostItem.placeLost);
      const safeFoundName = sanitize(foundItem.name);
      const safeFoundColor = sanitize(foundItem.color);
      const safeFoundPlace = sanitize(foundItem.placeFound);

      await sendEmail({
        to: userEmail,
        subject: "Item Match Found - Amity Lost & Found",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Great News!</h1>
              <p style="color: white; margin: 5px 0;">Your lost item might have been found</p>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #059669;">Item Match Found!</h2>
              <p>Hello <strong>${safeUserName}</strong>,</p>
              <p>We have found a potential match for your lost item. Here are the details:</p>
              <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Your Lost Item</h3>
                <p><strong>Name:</strong> ${safeLostName}</p>
                <p><strong>Color:</strong> ${safeLostColor}</p>
                <p><strong>Date Lost:</strong> ${new Date(lostItem.dateLost).toLocaleDateString()}</p>
                <p><strong>Place Lost:</strong> ${safeLostPlace}</p>
              </div>
              <div style="background: white; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Found Item Match</h3>
                <p><strong>Name:</strong> ${safeFoundName}</p>
                <p><strong>Color:</strong> ${safeFoundColor}</p>
                <p><strong>Date Found:</strong> ${new Date(foundItem.dateFound).toLocaleDateString()}</p>
                <p><strong>Place Found:</strong> ${safeFoundPlace}</p>
                <p><strong>Department:</strong> ${safeDepartment}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #fbbf24;">
                  <strong>Next Steps:</strong><br>
                  Please visit the ${safeDepartment} Lost &amp; Found office to verify and collect your item.
                  Bring a valid ID and be prepared to provide additional details about the item.
                </p>
              </div>
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                This notification was sent automatically by the Amity Lost &amp; Found System.
                If this is not your item, please ignore this email.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`Match notification email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error("Match notification email error:", error);
      return false;
    }
  }

  // ─── Item Returned Confirmation Email ────────────────────────────────────
  async sendItemReturnedConfirmation(userEmail, userName, itemName, returnedAt) {
    try {
      const safeUserName = sanitize(userName);
      const safeItemName = sanitize(itemName);

      await sendEmail({
        to: userEmail,
        subject: "Item Successfully Returned - Amity Lost & Found",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Item Returned!</h1>
              <p style="color: white; margin: 5px 0;">Successfully collected from Lost &amp; Found</p>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #059669;">Confirmation</h2>
              <p>Hello <strong>${safeUserName}</strong>,</p>
              <p>This email confirms that you have successfully collected your item:</p>
              <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h3 style="color: #1e40af; margin-top: 0;">${safeItemName}</h3>
                <p style="color: #059669; font-weight: bold;">Status: RETURNED</p>
                <p>Collected on: ${new Date(returnedAt).toLocaleDateString()}</p>
              </div>
              <p>Thank you for using the Amity Lost &amp; Found System. We're glad we could help you recover your item!</p>
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">Keep this email as confirmation of item collection.</p>
            </div>
          </div>
        `,
      });

      console.log(`Item returned confirmation sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error("Item returned email error:", error);
      return false;
    }
  }

  // ─── Item Unavailable Notification Email ─────────────────────────────────
  async sendItemUnavailableNotification(email, userName, itemName, department) {
    try {
      const safeUserName = sanitize(userName);
      const safeItemName = sanitize(itemName);
      const safeDepartment = sanitize(department);

      await sendEmail({
        to: email,
        subject: `Update: ${safeItemName} No Longer Available - Amity Lost & Found`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #b45309, #f59e0b); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Item Update</h1>
              <p style="color: white; margin: 5px 0;">Regarding your lost item report</p>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #b45309;">Item No Longer Available</h2>
              <p>Hello <strong>${safeUserName}</strong>,</p>
              <p>We wanted to inform you that the <strong>${safeItemName}</strong> found in
              <strong>${safeDepartment}</strong> that previously matched your lost item report
              has been collected in person by its owner.</p>
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0;">
                  <strong>What this means:</strong><br><br>
                  This particular item is no longer available for collection.
                  Your lost item report remains active and we will continue
                  searching for other matches. You will be notified immediately
                  if another match is found.
                </p>
              </div>
              <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">What you can do</h3>
                <ul style="color: #374151; line-height: 1.8;">
                  <li>Keep your lost item report active — we are still looking</li>
                  <li>Visit the ${safeDepartment} office if you have additional information</li>
                  <li>Check the portal regularly for new matches</li>
                </ul>
              </div>
              <p>We apologize for any inconvenience and will do our best to help you recover your item.</p>
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                This notification was sent automatically by the Amity Lost &amp; Found System.
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`Item unavailable notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Item unavailable email error:", error);
      return false;
    }
  }

  // ─── Password Reset OTP Email ─────────────────────────────────────────────
  async sendPasswordResetOTP(email, name, otp) {
    try {
      const safeName = sanitize(name);
      const safeOtp = sanitize(otp);

      await sendEmail({
        to: email,
        subject: "Password Reset OTP - Amity Lost & Found",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Password Reset</h1>
              <p style="color: white; margin: 5px 0;">Amity Lost &amp; Found</p>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e40af;">Reset Your Password</h2>
              <p>Hello <strong>${safeName}</strong>,</p>
              <p>We received a request to reset your password. Use the OTP below to proceed:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold;
                            padding: 20px; border-radius: 8px; letter-spacing: 8px;">
                  ${safeOtp}
                </div>
              </div>
              <p><strong>Important:</strong></p>
              <ul>
                <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                <li>Do not share this code with anyone</li>
                <li>If you did not request a password reset, ignore this email — your account is safe</li>
              </ul>
              <div style="background: #fef3c7; border-left: 4px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px;">
                  <strong>Security tip:</strong> Amity Lost &amp; Found staff will never ask for your OTP.
                  Never share it with anyone.
                </p>
              </div>
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                Amity University Lost &amp; Found Management System.
                If you have any questions, please contact the IT department.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`Password reset OTP sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Password reset OTP email error:", error);
      return false;
    }
  }

  // ─── Password Reset Confirmation Email ───────────────────────────────────
  async sendPasswordResetConfirmation(email, name) {
    try {
      const safeName = sanitize(name);

      await sendEmail({
        to: email,
        subject: "Password Changed Successfully - Amity Lost & Found",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Password Changed</h1>
              <p style="color: white; margin: 5px 0;">Your account is secure</p>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #059669;">Password Updated Successfully</h2>
              <p>Hello <strong>${safeName}</strong>,</p>
              <p>Your password has been successfully changed. You can now log in with your new password.</p>
              <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="color: #059669; font-weight: bold; font-size: 16px; margin: 0;">
                  ✓ Password reset successful
                </p>
                <p style="color: #6b7280; margin: 8px 0 0;">
                  ${new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #991b1b;">
                  <strong>Not you?</strong> If you did not make this change, contact the IT department
                  immediately and secure your email account.
                </p>
              </div>
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                Amity University Lost &amp; Found Management System.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`Password reset confirmation sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Password reset confirmation email error:", error);
      return false;
    }
  }
}

const emailService = new EmailService();
export { emailService };