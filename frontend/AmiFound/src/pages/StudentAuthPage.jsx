import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  FaSignInAlt,
  FaUserPlus,
  FaEnvelope,
  FaCheck,
  FaRedo,
  FaLock,
  FaArrowLeft,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaClock,
} from "react-icons/fa";

import {
  register as registerUser,
  verifyOTP,
  login,
  isValidAmityEmail,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from "../services/authService";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const amityEmailRule = z
  .string()
  .min(1, "Email is required")
  .refine(isValidAmityEmail, { message: "Must be an @s.amity.edu email" });

const loginSchema = z.object({
  email: amityEmailRule,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must include uppercase, lowercase, and a number",
    ),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: amityEmailRule,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must include uppercase, lowercase, and a number",
    ),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
});

const forgotPasswordSchema = z.object({
  email: amityEmailRule,
});

const resetOTPSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
});

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const schemaMap = {
  login: loginSchema,
  register: registerSchema,
  otp: otpSchema,
  "forgot-password": forgotPasswordSchema,
  "reset-otp": resetOTPSchema,
  "new-password": newPasswordSchema,
};

// ─── OTP Countdown Timer Hook ─────────────────────────────────────────────────
const OTP_COOLDOWN = 120; // 2 minutes

const useOTPTimer = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);

  const startTimer = useCallback(() => {
    // Clear any existing interval first
    if (intervalRef.current) clearInterval(intervalRef.current);

    setSecondsLeft(OTP_COOLDOWN);

    // Start a single interval that runs until done
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSecondsLeft(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return {
    isActive: secondsLeft > 0,
    display: `${minutes}:${seconds}`,
    secondsLeft,
    startTimer,
    resetTimer,
  };
};

// ─── Password Input with Show/Hide ────────────────────────────────────────────
const PasswordInput = ({
  id,
  registration,
  error,
  placeholder,
  disabled,
  autoComplete,
}) => {
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

// ─── Resend Button with Timer (timer shown only on this button) ───────────────
const ResendButton = ({
  onResend,
  isResending,
  timerDisplay,
  timerActive,
  isAnyPending,
}) => (
  <button
    type="button"
    onClick={onResend}
    className="btn btn--outline btn--full-width"
    disabled={timerActive || isResending || isAnyPending}
  >
    {isResending ? (
      <>
        <FaRedo className="spin-icon" />
        <span>Resending…</span>
      </>
    ) : timerActive ? (
      <>
        <FaClock />
        <span>Resend in {timerDisplay}</span>
      </>
    ) : (
      <>
        <FaRedo />
        <span>Resend OTP</span>
      </>
    )}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentAuthPage = ({
  setCurrentUser,
  setLoading,
  showMessage,
  currentUser,
}) => {
  const navigate = useNavigate();
  const [formType, setFormType] = useState("login");
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const registrationTimer = useOTPTimer();
  const resetTimer = useOTPTimer();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token && currentUser) {
      if (!currentUser.profileCompleted) {
        navigate("/complete-profile", { replace: true });
      } else {
        navigate("/student-dashboard", { replace: true });
      }
    }
  }, [navigate, currentUser]);

  // Clean up timers when leaving their screens
  useEffect(() => {
    if (formType !== "otp") registrationTimer.resetTimer();
    if (formType !== "reset-otp") resetTimer.resetTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType]);

  const resolver = useMemo(() => zodResolver(schemaMap[formType]), [formType]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.message === "ACCOUNT_NOT_VERIFIED") {
        setPendingRegistration({
          email: result.data?.email ?? "",
          name: result.data?.name ?? "",
          password: "",
        });
        registrationTimer.startTimer();
        setFormType("otp");
        reset();
        showMessage(
          "Your email isn't verified yet — a new code has been sent.",
          "info",
        );
        return;
      }

      if (result.success && result.data) {
        const user = result.data.user;

        setCurrentUser(user);
        localStorage.setItem("authToken", result.data.token);
        showMessage("Login successful!", "success");
        if (!user.profileCompleted) {
          navigate("/complete-profile", { replace: true });
        } else {
          navigate("/student-dashboard", { replace: true });
        }
      } else {
        showMessage(result.message || "Invalid email or password", "error");
      }
    },
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const registerMutation = useMutation({
    mutationFn: ({ name, email, password }) =>
      registerUser(name, email, password),
    onMutate: () => setLoading(true),
    onSuccess: (result, variables) => {
      if (result.message === "ACCOUNT_NOT_VERIFIED") {
        setPendingRegistration({
          email: result.data?.email ?? variables.email,
          name: result.data?.name ?? variables.name,
          password: "",
        });
        registrationTimer.startTimer();
        setFormType("otp");
        reset();
        showMessage(
          "A verification code has been sent to your email.",
          "success",
        );
        return;
      }

      if (result.success) {
        setPendingRegistration({
          name: variables.name,
          email: variables.email,
        });
        setFormType("otp");
        reset();
        registrationTimer.startTimer();
        showMessage("OTP sent to your email address", "success");
      } else {
        showMessage(result.message || "Registration failed", "error");
      }
    },
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const otpMutation = useMutation({
    mutationFn: ({ otp }) => verifyOTP(pendingRegistration.email, otp),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        const user = result.data.user || result.data;

        setCurrentUser(user);
        if (result.data.token)
          localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("userRole", result.data.role);
        showMessage("Registration successful!", "success");
        if (!user.profileCompleted) {
          navigate("/complete-profile", { replace: true });
        } else {
          navigate("/student-dashboard", { replace: true });
        }
      } else {
        showMessage(result.message || "Invalid OTP", "error");
      }
    },
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendOTP(pendingRegistration.email),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        registrationTimer.startTimer();
        showMessage("OTP resent to your email address", "success");
      } else {
        showMessage(result.message || "Failed to resend OTP", "error");
      }
    },
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: ({ email }) => forgotPassword(email),
    onMutate: () => setLoading(true),
    onSuccess: (result, variables) => {
      showMessage("If this email exists, an OTP has been sent.", "success");
      setResetEmail(variables.email);
      setFormType("reset-otp");
      reset();
      resetTimer.startTimer();
    },
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const resendResetOTPMutation = useMutation({
    mutationFn: () => forgotPassword(resetEmail),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      resetTimer.startTimer();
      showMessage("OTP resent to your email.", "success");
    },
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const verifyResetOTPMutation = useMutation({
    mutationFn: ({ otp }) => verifyResetOTP(resetEmail, otp),
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
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ newPassword, confirmPassword }) =>
      resetPassword(resetToken, newPassword, confirmPassword),
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
    onError: (error) =>
      showMessage(error?.message || "Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    (data) => {
      if (formType === "login") loginMutation.mutate(data);
      else if (formType === "register") registerMutation.mutate(data);
      else if (formType === "otp") otpMutation.mutate(data);
      else if (formType === "forgot-password")
        forgotPasswordMutation.mutate(data);
      else if (formType === "reset-otp") verifyResetOTPMutation.mutate(data);
      else if (formType === "new-password") resetPasswordMutation.mutate(data);
    },
    [
      formType,
      loginMutation,
      registerMutation,
      otpMutation,
      forgotPasswordMutation,
      verifyResetOTPMutation,
      resetPasswordMutation,
    ],
  );

  const switchForm = useCallback(
    (type) => {
      reset();
      setFormType(type);
    },
    [reset],
  );

  const isAnyPending =
    loginMutation.isPending ||
    registerMutation.isPending ||
    otpMutation.isPending ||
    resendMutation.isPending ||
    forgotPasswordMutation.isPending ||
    resendResetOTPMutation.isPending ||
    verifyResetOTPMutation.isPending ||
    resetPasswordMutation.isPending ||
    isSubmitting;

  const headerMap = {
    login: {
      title: "Student Login",
      sub: "Access your account with official Amity email",
    },
    register: {
      title: "Student Registration",
      sub: "Create your account with official Amity email",
    },
    otp: { title: "Verify Email", sub: "Enter the OTP sent to your email" },
    "forgot-password": {
      title: "Forgot Password",
      sub: "Enter your Amity email to receive an OTP",
    },
    "reset-otp": { title: "Verify OTP", sub: `OTP sent to ${resetEmail}` },
    "new-password": {
      title: "Set New Password",
      sub: "Choose a strong password for your account",
    },
  };

  return (
    <main className="page active">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-header">
            <h2>{headerMap[formType]?.title}</h2>
            <p>{headerMap[formType]?.sub}</p>
          </header>

          {/* ── Login ── */}
          {formType === "login" && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                  Email Address
                </label>
                <input
                  id="login-email"
                  {...register("email")}
                  autoComplete="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="your.name@s.amity.edu"
                  disabled={isAnyPending}
                />
                {errors.email && (
                  <div className="error-message">{errors.email.message}</div>
                )}
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="login-password" className="form-label">
                    Password
                  </label>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => switchForm("forgot-password")}
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id="login-password"
                  registration={register("password")}
                  error={errors.password}
                  placeholder="Enter your password"
                  disabled={isAnyPending}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <div className="error-message">{errors.password.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
              >
                <FaSignInAlt />
                <span>{loginMutation.isPending ? "Logging in…" : "Login"}</span>
              </button>
            </form>
          )}

          {/* ── Register ── */}
          {formType === "register" && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="form-group">
                <label htmlFor="register-name" className="form-label">
                  Full Name
                </label>
                <input
                  id="register-name"
                  {...register("name")}
                  autoComplete="name"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  placeholder="Enter your full name"
                  disabled={isAnyPending}
                />
                {errors.name && (
                  <div className="error-message">{errors.name.message}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="register-email" className="form-label">
                  Amity Email
                </label>
                <input
                  id="register-email"
                  {...register("email")}
                  autoComplete="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="your.name@s.amity.edu"
                  disabled={isAnyPending}
                />
                {errors.email && (
                  <div className="error-message">{errors.email.message}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="register-password" className="form-label">
                  Password
                </label>
                <PasswordInput
                  id="register-password"
                  registration={register("password")}
                  error={errors.password}
                  placeholder="Create a password (min 6 characters)"
                  disabled={isAnyPending}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <div className="error-message">{errors.password.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
              >
                <FaUserPlus />
                <span>
                  {registerMutation.isPending
                    ? "Sending OTP…"
                    : "Register & Send OTP"}
                </span>
              </button>
            </form>
          )}

          {/* ── Registration OTP ── */}
          {formType === "otp" && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="otp-message">
                <FaEnvelope />
                <p>
                  Verification code sent to{" "}
                  <strong>{pendingRegistration?.email}</strong>
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="otp-input" className="form-label">
                  Verification Code
                </label>
                <input
                  id="otp-input"
                  {...register("otp")}
                  autoComplete="one-time-code"
                  className={`form-control otp-input ${errors.otp ? "is-invalid" : ""}`}
                  maxLength="6"
                  placeholder="000000"
                  disabled={isAnyPending}
                />
                {errors.otp && (
                  <div className="error-message">{errors.otp.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
              >
                <FaCheck />
                <span>
                  {otpMutation.isPending ? "Verifying…" : "Verify Email"}
                </span>
              </button>

              {/* ── Timer lives only on this button ── */}
              <ResendButton
                onResend={() => resendMutation.mutate()}
                isResending={resendMutation.isPending}
                timerDisplay={registrationTimer.display}
                timerActive={registrationTimer.isActive}
                isAnyPending={isAnyPending}
              />
            </form>
          )}

          {/* ── Forgot Password: Enter Email ── */}
          {formType === "forgot-password" && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="reset-info-box">
                <FaLock className="reset-info-box__icon" />
                <p>
                  Enter your registered Amity email. We'll send a 6-digit OTP to
                  reset your password.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="forgot-email" className="form-label">
                  Amity Email Address
                </label>
                <input
                  id="forgot-email"
                  {...register("email")}
                  autoComplete="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="your.name@s.amity.edu"
                  disabled={isAnyPending}
                />
                {errors.email && (
                  <div className="error-message">{errors.email.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
              >
                <FaEnvelope />
                <span>
                  {forgotPasswordMutation.isPending
                    ? "Sending OTP…"
                    : "Send Reset OTP"}
                </span>
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

          {/* ── Forgot Password: Verify OTP ── */}
          {formType === "reset-otp" && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="otp-message">
                <FaEnvelope />
                <p>
                  Reset OTP sent to <strong>{resetEmail}</strong>
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="reset-otp-input" className="form-label">
                  Reset OTP
                </label>
                <input
                  id="reset-otp-input"
                  {...register("otp")}
                  autoComplete="one-time-code"
                  className={`form-control otp-input ${errors.otp ? "is-invalid" : ""}`}
                  maxLength="6"
                  placeholder="000000"
                  disabled={isAnyPending}
                />
                {errors.otp && (
                  <div className="error-message">{errors.otp.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
              >
                <FaKey />
                <span>
                  {verifyResetOTPMutation.isPending
                    ? "Verifying…"
                    : "Verify OTP"}
                </span>
              </button>

              {/* ── Timer lives only on this button ── */}
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

          {/* ── New Password ── */}
          {formType === "new-password" && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="auth-form"
              noValidate
            >
              <div className="reset-info-box reset-info-box--success">
                <FaCheck className="reset-info-box__icon" />
                <p>
                  OTP verified! Choose a strong new password for your account.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="new-password-input" className="form-label">
                  New Password
                </label>
                <PasswordInput
                  id="new-password-input"
                  registration={register("newPassword")}
                  error={errors.newPassword}
                  placeholder="Min 6 characters"
                  disabled={isAnyPending}
                  autoComplete="new-password"
                />
                {errors.newPassword && (
                  <div className="error-message">
                    {errors.newPassword.message}
                  </div>
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
                  <div className="error-message">
                    {errors.confirmPassword.message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full-width"
                disabled={isAnyPending}
              >
                <FaLock />
                <span>
                  {resetPasswordMutation.isPending
                    ? "Resetting…"
                    : "Reset Password"}
                </span>
              </button>
            </form>
          )}

          {/* ── Switch login / register (hidden during reset flow) ── */}
          {!["forgot-password", "reset-otp", "new-password"].includes(
            formType,
          ) && (
            <div className="auth-switch">
              <button
                type="button"
                onClick={() =>
                  switchForm(formType === "login" ? "register" : "login")
                }
                className="auth-switch-btn"
              >
                {formType === "login" ? (
                  <>
                    Don't have an account? <strong>Register here</strong>
                  </>
                ) : (
                  <>
                    Already have an account? <strong>Login here</strong>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default React.memo(StudentAuthPage);
