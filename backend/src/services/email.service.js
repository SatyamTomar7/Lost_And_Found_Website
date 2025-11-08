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
        rejectUnauthorized: false
      }
    });
  }

  // Send OTP verification email
  async sendOTPVerification(email, name, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Email Verification - Amity Lost & Found',
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
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`OTP verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }
}
export default new EmailService();