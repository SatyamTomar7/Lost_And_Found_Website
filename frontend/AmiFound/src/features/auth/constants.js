export const ROLE_ROUTES = {
  student: "/student-dashboard",
  admin: "/admin-dashboard",
  super_admin: "/super-admin-dashboard",
  director: "/director-dashboard",
  security: "/security-dashboard",
};

export const getDashboardRoute = (role) =>
  ROLE_ROUTES[role] || "/student-dashboard";

export const OTP_COOLDOWN = 120;

export const getAuthHeaderMap = (resetEmail) => ({
  login: { title: "Login", sub: "Sign in with your Amity account" },
  register: {
    title: "Student Registration",
    sub: "Create your account with official Amity email",
  },
  otp: { title: "Verify Email", sub: "Enter the OTP sent to your email" },
  "forgot-password": {
    title: "Forgot Password",
    sub: "Enter your email to receive a reset OTP",
  },
  "reset-otp": { title: "Verify OTP", sub: `OTP sent to ${resetEmail}` },
  "new-password": {
    title: "Set New Password",
    sub: "Choose a strong password for your account",
  },
});

export const RESET_FLOW_FORM_TYPES = [
  "forgot-password",
  "reset-otp",
  "new-password",
];
