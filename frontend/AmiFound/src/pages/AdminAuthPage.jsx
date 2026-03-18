import React, { useMemo, useEffect, useState, useCallback, useRef } from "react"; // ADDED: useState, useCallback, useRef
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { FaSignInAlt, FaLock, FaArrowLeft, FaEnvelope, FaKey, FaCheck, FaRedo, FaClock, FaEye, FaEyeSlash } from "react-icons/fa"; // ADDED icons
import {
  adminLogin,
  adminForgotPassword,       // ADDED
  adminVerifyResetOTP,       // ADDED
  adminResetPassword,        // ADDED
} from "../services/authService";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const adminLoginSchema = z.object({
  department: z.string().min(1, "Please select a department"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});


// ── ADDED: Extra schemas for forgot password flow ─────────────────────────────
const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Must be a valid email"),
});

const resetOTPSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
});

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const schemaMap = {
  login: adminLoginSchema,
  "forgot-password": forgotPasswordSchema,
  "reset-otp": resetOTPSchema,
  "new-password": newPasswordSchema,
};
// ── END ADDED ──

// ── ADDED: OTP Countdown Timer Hook ──────────────────────────────────────────
const OTP_COOLDOWN = 120;

const useOTPTimer = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(OTP_COOLDOWN);
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(0);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [secondsLeft]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return { isActive: secondsLeft > 0, display: `${minutes}:${seconds}`, startTimer, resetTimer };
};
// ── END ADDED ──

// ── ADDED: Password Input with Show/Hide ──────────────────────────────────────
const PasswordInput = ({ id, registration, error, placeholder, disabled, autoComplete }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        type={show ? "text" : "password"}
        {...registration}
        autoComplete={autoComplete || "current-password"}
        className={`form-control ${error ? "is-invalid" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShow((p) => !p)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
};
// ── END ADDED ──

// ── ADDED: Resend Button with Timer ───────────────────────────────────────────
const ResendButton = ({ onResend, isResending, timerDisplay, timerActive, isAnyPending }) => (
  <button
    type="button"
    onClick={onResend}
    className="btn btn--outline btn--full-width"
    disabled={timerActive || isResending || isAnyPending}
  >
    {isResending ? (
      <><FaRedo className="spin-icon" /><span>Resending…</span></>
    ) : timerActive ? (
      <><FaClock /><span>Resend in {timerDisplay}</span></>
    ) : (
      <><FaRedo /><span>Resend OTP</span></>
    )}
  </button>
);
// ── END ADDED ──

// ─── Component ───────────────────────────────────────────────────────────────
const AdminAuthPage = ({ setCurrentAdmin, setLoading, showMessage }) => {
  const navigate = useNavigate();

  // ── ADDED state ──
  const [formType, setFormType] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const resetTimer = useOTPTimer();
  // ── END ADDED ──

  // 1. AUTO-REDIRECT LOGIC: If token exists, don't show login page
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [navigate]);

  // ── ADDED: clean up timer when leaving reset-otp screen ──
  useEffect(() => {
    if (formType !== "reset-otp") resetTimer.resetTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType]);
  // ── END ADDED ──

  const resolver = useMemo(
    () => zodResolver(schemaMap[formType]),  // CHANGED: dynamic schema based on formType
    [formType]
  );

  const {
    register,
    handleSubmit,
    reset,         // ADDED
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    defaultValues: {
      department: "",
      username: "",
      password: "",
      email: "",           // ADDED
      otp: "",             // ADDED
      newPassword: "",     // ADDED
      confirmPassword: "", // ADDED
    },
  });

  // ── ADDED: switchForm helper ──
  const switchForm = useCallback((type) => {
    reset();
    setFormType(type);
  }, [reset]);
  // ── END ADDED ──

  // ── TanStack Query Mutation — COMPLETELY UNCHANGED ────────────────────────
  const loginMutation = useMutation({
    mutationFn: ({ department, username, password }) =>
      adminLogin(department, username, password),
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setCurrentAdmin(result.data.user);
        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("userRole", result.data.role);
        showMessage("Admin login successful!", "success");
        setTimeout(() => {
          navigate("/admin-dashboard", { replace: true });
        }, 1000);
      } else {
        setError("root.serverError", {
          type: "manual",
          message: result.message || "Invalid credentials",
        });
      }
    },
    onError: () => {
      showMessage("Error connecting to server", "error");
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // ── ADDED: Forgot password mutations ──────────────────────────────────────
  const forgotPasswordMutation = useMutation({
    mutationFn: ({ email }) => adminForgotPassword(email),
    onMutate: () => setLoading(true),
    onSuccess: (result, variables) => {
      showMessage("If this admin email exists, an OTP has been sent.", "success");
      setResetEmail(variables.email);
      setFormType("reset-otp");
      reset();
      resetTimer.startTimer();
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const resendResetOTPMutation = useMutation({
    mutationFn: () => adminForgotPassword(resetEmail),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      resetTimer.startTimer();
      showMessage("OTP resent to your email.", "success");
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const verifyResetOTPMutation = useMutation({
    mutationFn: ({ otp }) => adminVerifyResetOTP(resetEmail, otp),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success && result.data?.resetToken) {
        setResetToken(result.data.resetToken);
        setFormType("new-password");
        reset();
        showMessage("OTP verified. Set your new password.", "success");
      } else {
        showMessage(result.message || "Invalid or expired OTP", "error");
      }
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ newPassword, confirmPassword }) =>
      adminResetPassword(resetToken, newPassword, confirmPassword),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        showMessage("Password reset successfully. Please login.", "success");
        setResetEmail("");
        setResetToken("");
        switchForm("login");
      } else {
        showMessage(result.message || "Failed to reset password", "error");
      }
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });
  // ── END ADDED ──

  const onSubmit = (data) => {
    if (formType === "login") loginMutation.mutate(data);
    else if (formType === "forgot-password") forgotPasswordMutation.mutate(data);       // ADDED
    else if (formType === "reset-otp") verifyResetOTPMutation.mutate(data);             // ADDED
    else if (formType === "new-password") resetPasswordMutation.mutate(data);           // ADDED
  };

  // ── ADDED ──
  const isAnyPending =
    loginMutation.isPending ||
    forgotPasswordMutation.isPending ||
    verifyResetOTPMutation.isPending ||
    resetPasswordMutation.isPending ||
    isSubmitting;

  const headerMap = {
    login:             { title: "Admin Login",       sub: "Department administrator access" },
    "forgot-password": { title: "Forgot Password",   sub: "Enter your admin email to receive an OTP" },
    "reset-otp":       { title: "Verify OTP",        sub: `OTP sent to ${resetEmail}` },
    "new-password":    { title: "Set New Password",  sub: "Choose a strong password for your account" },
  };
  // ── END ADDED ──

  return (
    <main className="page active" id="main-content">
      <div className="auth-container">
        <div className="auth-card">

          {/* CHANGED: dynamic header */}
          <header className="auth-header">
            <h2>{headerMap[formType]?.title}</h2>
            <p>{headerMap[formType]?.sub}</p>
          </header>

          {/* ── Login form — COMPLETELY UNCHANGED except "Forgot password?" link added at bottom ── */}
          {formType === "login" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="admin-department" className="form-label">
                  Department
                </label>
                <select
                  id="admin-department"
                  className={`form-control ${errors.department ? "is-invalid" : ""}`}
                  disabled={isAnyPending}
                  {...register("department")}
                  aria-invalid={errors.department ? "true" : "false"}
                >
                  <option value="">Select Department</option>
                  <option value="Block A">Block A</option>
                  <option value="Block B">Block B</option>
                  <option value="Block C">Block C</option>
                  <option value="Block D">Block D</option>
                  <option value="Block E">Block E</option>
                </select>
                {errors.department && (
                  <div className="error-message" role="alert">
                    {errors.department.message}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="admin-username" className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  id="admin-username"
                  className={`form-control ${errors.username ? "is-invalid" : ""}`}
                  placeholder="admin_a"
                  autoComplete="username"
                  disabled={isAnyPending}
                  {...register("username")}
                  aria-invalid={errors.username ? "true" : "false"}
                />
                {errors.username && (
                  <div className="error-message" role="alert">
                    {errors.username.message}
                  </div>
                )}
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="admin-password" className="form-label">
                    Password
                  </label>
                  {/* ADDED: Forgot password link */}
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => switchForm("forgot-password")}
                   disabled={isAnyPending}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  id="admin-password"
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  disabled={isAnyPending}
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                />
                {(errors.password || errors.root?.serverError) && (
                  <div className="error-message" role="alert">
                    {errors.password?.message || errors.root?.serverError?.message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
                aria-busy={loginMutation.isPending}
              >
                <FaSignInAlt aria-hidden="true" style={{ marginRight: "8px" }} />
                <span>{loginMutation.isPending ? "Logging in…" : "Admin Login"}</span>
              </button>
            </form>
          )}

          {/* ── ADDED: Forgot Password — Enter Email ── */}
          {formType === "forgot-password" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="reset-info-box">
                <FaLock className="reset-info-box__icon" />
                <p>
                  Enter your registered admin email. We'll send a 6-digit OTP
                  to reset your password.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="forgot-email" className="form-label">Admin Email Address</label>
                <input
                  id="forgot-email"
                  {...register("email")}
                  autoComplete="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="admin@example.com"
                  disabled={isAnyPending}
                />
                {errors.email && <div className="error-message">{errors.email.message}</div>}
              </div>

              <button type="submit" className="btn btn--primary btn--full-width" disabled={isAnyPending}>
                <FaEnvelope />
                <span>{forgotPasswordMutation.isPending ? "Sending OTP…" : "Send Reset OTP"}</span>
              </button>

              <button
                type="button"
                className="btn btn--ghost btn--full-width"
                onClick={() => switchForm("login")}
                disabled={isAnyPending}
              >
                <FaArrowLeft />
                <span>Back to Login</span>
              </button>
            </form>
          )}

          {/* ── ADDED: Forgot Password — Verify OTP ── */}
          {formType === "reset-otp" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="otp-message">
                <FaEnvelope />
                <p>Reset OTP sent to <strong>{resetEmail}</strong></p>
              </div>

              <div className="form-group">
                <label htmlFor="reset-otp-input" className="form-label">Reset OTP</label>
                <input
                  id="reset-otp-input"
                  {...register("otp")}
                  autoComplete="one-time-code"
                  className={`form-control otp-input ${errors.otp ? "is-invalid" : ""}`}
                  maxLength="6"
                  placeholder="000000"
                  disabled={isAnyPending}
                />
                {errors.otp && <div className="error-message">{errors.otp.message}</div>}
              </div>

              <button type="submit" className="btn btn--primary btn--full-width" disabled={isAnyPending}>
                <FaKey />
                <span>{verifyResetOTPMutation.isPending ? "Verifying…" : "Verify OTP"}</span>
              </button>

              <ResendButton
                onResend={() => resendResetOTPMutation.mutate()}
                isResending={resendResetOTPMutation.isPending}
                timerDisplay={resetTimer.display}
                timerActive={resetTimer.isActive}
                isAnyPending={isAnyPending}
              />

              <button
                type="button"
                className="btn btn--ghost btn--full-width"
                onClick={() => switchForm("forgot-password")}
                disabled={isAnyPending}
              >
                <FaArrowLeft />
                <span>Change Email</span>
              </button>
            </form>
          )}

          {/* ── ADDED: New Password ── */}
          {formType === "new-password" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="reset-info-box reset-info-box--success">
                <FaCheck className="reset-info-box__icon" />
                <p>OTP verified! Choose a strong new password for your account.</p>
              </div>

              <div className="form-group">
                <label htmlFor="new-password-input" className="form-label">New Password</label>
                <PasswordInput
                  id="new-password-input"
                  registration={register("newPassword")}
                  error={errors.newPassword}
                  placeholder="Min 6 characters"
                  disabled={isAnyPending}
                  autoComplete="new-password"
                />
                {errors.newPassword && (
                  <div className="error-message">{errors.newPassword.message}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password-input" className="form-label">
                  Confirm New Password
                </label>
                <PasswordInput
                  id="confirm-password-input"
                  registration={register("confirmPassword")}
                  error={errors.confirmPassword}
                  placeholder="Re-enter new password"
                  disabled={isAnyPending}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <div className="error-message">{errors.confirmPassword.message}</div>
                )}
              </div>

              <button type="submit" className="btn btn--primary btn--full-width" disabled={isAnyPending}>
                <FaLock />
                <span>{resetPasswordMutation.isPending ? "Resetting…" : "Reset Password"}</span>
              </button>
            </form>
          )}
          {/* ── END ADDED ── */}

        </div>
      </div>
    </main>
  );
};

export default React.memo(AdminAuthPage);