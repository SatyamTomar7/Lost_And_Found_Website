import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Send OTP verification email
  async sendOTPVerification(email, name, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
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
              <p>Hello <strong>${name}</strong>,</p>
              
              <p>Thank you for registering with the Amity Lost & Found System. To complete your registration, please verify your email address using the OTP below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #1e40af; color: white; font-size: 24px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 3px;">
                  ${otp}
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
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`OTP verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Email sending error:", error);
      return false;
    }
  }

  //send match notification email

  async sendMatchNotification(
    userEmail,
    userName,
    lostItem,
    foundItem,
    department
  ) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
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
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>We have found a potential match for your lost item. Here are the details:</p>
              
              <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Your Lost Item</h3>
                <p><strong>Name:</strong> ${lostItem.name}</p>
                <p><strong>Category:</strong> ${lostItem.category}</p>
                <p><strong>Color:</strong> ${lostItem.color}</p>
                <p><strong>Date Lost:</strong> ${new Date(lostItem.dateLost).toLocaleDateString()}</p>
                <p><strong>Place Lost:</strong> ${lostItem.placeLost}</p>
              </div>
              
              <div style="background: white; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Found Item Match</h3>
                <p><strong>Name:</strong> ${foundItem.name}</p>
                <p><strong>Category:</strong> ${foundItem.category}</p>
                <p><strong>Color:</strong> ${foundItem.color}</p>
                <p><strong>Date Found:</strong> ${new Date(foundItem.dateFound).toLocaleDateString()}</p>
                <p><strong>Place Found:</strong> ${foundItem.placeFound}</p>
                <p><strong>Department:</strong> ${department}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #fbbf24;">
                  <strong>Next Steps:</strong><br>
                  Please visit the ${department} Lost & Found office to verify and collect your item.
                  Bring a valid ID and be prepared to provide additional details about the item.
                </p>
              </div>
              
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                This notification was sent automatically by the Amity Lost & Found System. 
                If this is not your item, please ignore this email.
              </p>
            </div>
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      console.log(`Match notification email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error("Match notification email error:", error);
      return false;
    }
  }

  // Send item returned confirmation
  async sendItemReturnedConfirmation(userEmail, userName, itemName) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: userEmail,
        subject: "Item Successfully Returned - Amity Lost & Found",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Item Returned!</h1>
              <p style="color: white; margin: 5px 0;">Successfully collected from Lost & Found</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #059669;">Confirmation</h2>
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>This email confirms that you have successfully collected your item:</p>
              
              <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h3 style="color: #1e40af; margin-top: 0;">${itemName}</h3>
                <p style="color: #059669; font-weight: bold;">Status: RETURNED</p>
                <p>Collected on: ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>Thank you for using the Amity Lost & Found System. We're glad we could help you recover your item!</p>
              
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                Keep this email as confirmation of item collection.
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Item returned confirmation sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error("Item returned email error:", error);
      return false;
    }
  }

  async sendItemUnavailableNotification(email, userName, itemName, department) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Update: ${itemName} No Longer Available - Amity Lost & Found`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #b45309, #f59e0b); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Item Update</h1>
            <p style="color: white; margin: 5px 0;">Regarding your lost item report</p>
          </div>

          <div style="padding: 30px; background: #f8fafc;">
            <h2 style="color: #b45309;">Item No Longer Available</h2>
            <p>Hello <strong>${userName}</strong>,</p>

            <p>We wanted to inform you that the <strong>${itemName}</strong> found in 
            <strong>${department}</strong> that previously matched your lost item report 
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
                <li>Visit the ${department} office if you have additional information</li>
                <li>Check the portal regularly for new matches</li>
              </ul>
            </div>

            <p>We apologize for any inconvenience and will do our best to help you 
            recover your item.</p>

            <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This notification was sent automatically by the Amity Lost & Found System.
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Item unavailable notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Item unavailable email error:", error);
      return false;
    }
  }
}

const emailService = new EmailService();
export { emailService };
