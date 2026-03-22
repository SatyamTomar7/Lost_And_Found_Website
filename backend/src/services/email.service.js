import { Resend } from "resend";

const sanitize = (str) =>
  String(str).replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])
  );

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  constructor() {
    console.log("Email service initialized via Resend API");
  }

  async sendMail(to, subject, html) {
    try {
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      if (error) {
        console.error("Email sending error:", error);
        return false;
      }

      console.log(`Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Email sending error:", error);
      return false;
    }
  }

  async sendOTPVerification(email, name, otp) {
    const safeName = sanitize(name);
    const safeOtp = sanitize(otp);
    return this.sendMail(
      email,
      "Email Verification - Amity Lost & Found",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Amity Lost & Found</h1>
          <p style="color: white; margin: 5px 0;">University Management System</p>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e40af;">Email Verification Required</h2>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>Thank you for registering. Use the OTP below to verify your email:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #1e40af; color: white; font-size: 24px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 3px;">
              ${safeOtp}
            </div>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This OTP is valid for 10 minutes only</li>
            <li>Do not share this code with anyone</li>
          </ul>
        </div>
      </div>
      `
    );
  }

  async sendMatchNotification(userEmail, userName, lostItem, foundItem, department) {
    const safeUserName = sanitize(userName);
    const safeDepartment = sanitize(department);
    const safeLostName = sanitize(lostItem.name);
    const safeLostColor = sanitize(lostItem.color);
    const safeLostPlace = sanitize(lostItem.placeLost);
    const safeFoundName = sanitize(foundItem.name);
    const safeFoundColor = sanitize(foundItem.color);
    const safeFoundPlace = sanitize(foundItem.placeFound);
    return this.sendMail(
      userEmail,
      "Item Match Found - Amity Lost & Found",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Great News!</h1>
          <p style="color: white; margin: 5px 0;">Your lost item might have been found</p>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #059669;">Item Match Found!</h2>
          <p>Hello <strong>${safeUserName}</strong>,</p>
          <p>We found a potential match for your lost item:</p>
          <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Your Lost Item</h3>
            <p><strong>Name:</strong> ${safeLostName}</p>
            <p><strong>Color:</strong> ${safeLostColor}</p>
            <p><strong>Place Lost:</strong> ${safeLostPlace}</p>
          </div>
          <div style="background: white; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Found Item Match</h3>
            <p><strong>Name:</strong> ${safeFoundName}</p>
            <p><strong>Color:</strong> ${safeFoundColor}</p>
            <p><strong>Place Found:</strong> ${safeFoundPlace}</p>
            <p><strong>Department:</strong> ${safeDepartment}</p>
          </div>
          <p>Please visit the ${safeDepartment} Lost &amp; Found office to verify and collect your item.</p>
        </div>
      </div>
      `
    );
  }

  async sendItemReturnedConfirmation(userEmail, userName, itemName, returnedAt) {
    const safeUserName = sanitize(userName);
    const safeItemName = sanitize(itemName);
    return this.sendMail(
      userEmail,
      "Item Successfully Returned - Amity Lost & Found",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Item Returned!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #059669;">Confirmation</h2>
          <p>Hello <strong>${safeUserName}</strong>,</p>
          <p>Your item <strong>${safeItemName}</strong> has been successfully returned on ${new Date(returnedAt).toLocaleDateString()}.</p>
          <p>Thank you for using the Amity Lost &amp; Found System!</p>
        </div>
      </div>
      `
    );
  }

  async sendItemUnavailableNotification(email, userName, itemName, department) {
    const safeUserName = sanitize(userName);
    const safeItemName = sanitize(itemName);
    const safeDepartment = sanitize(department);
    return this.sendMail(
      email,
      `Update: ${safeItemName} No Longer Available - Amity Lost & Found`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #b45309, #f59e0b); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Item Update</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #b45309;">Item No Longer Available</h2>
          <p>Hello <strong>${safeUserName}</strong>,</p>
          <p>The <strong>${safeItemName}</strong> found in <strong>${safeDepartment}</strong> that matched your report has been collected by its owner.</p>
          <p>Your lost item report remains active and we will continue searching for matches.</p>
        </div>
      </div>
      `
    );
  }

  async sendPasswordResetOTP(email, name, otp) {
    const safeName = sanitize(name);
    const safeOtp = sanitize(otp);
    return this.sendMail(
      email,
      "Password Reset OTP - Amity Lost & Found",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e40af;">Reset Your Password</h2>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>Use the OTP below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px;">
              ${safeOtp}
            </div>
          </div>
          <p>This OTP is valid for 10 minutes only. Do not share it with anyone.</p>
        </div>
      </div>
      `
    );
  }

  async sendPasswordResetConfirmation(email, name) {
    const safeName = sanitize(name);
    return this.sendMail(
      email,
      "Password Changed Successfully - Amity Lost & Found",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Changed</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #059669;">Password Updated Successfully</h2>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>Your password has been successfully changed. You can now log in with your new password.</p>
        </div>
      </div>
      `
    );
  }
}

const emailService = new EmailService();
export { emailService };