import React, { useState, useMemo, useCallback } from "react";
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
} from "react-icons/fa";

import {
  register as registerUser,
  verifyOTP,
  login,
  isValidAmityEmail,
  resendOTP,
} from "../services/authService";
const today = new Date().toISOString().split("T")[0];
// ─── Zod Schemas (module-level, stable) ──────────────────────────────────────

const amityEmailRule = z
  .string()
  .min(1, "Email is required")
  .refine(isValidAmityEmail, { message: "Must be an @s.amity.edu email" });

const loginSchema = z.object({
  email: amityEmailRule,
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: amityEmailRule,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits"),
});

const schemaMap = {
  login: loginSchema,
  register: registerSchema,
  otp: otpSchema,
};

// ─── Component ───────────────────────────────────────────────────────────────
const StudentAuthPage = ({ setCurrentUser, setLoading, showMessage }) => {
  const navigate = useNavigate();
  const [formType, setFormType] = useState("login");
  const [pendingRegistration, setPendingRegistration] = useState(null);

  // resolver changes only when formType changes
  const resolver = useMemo(() => zodResolver(schemaMap[formType]), [formType]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "", otp: "" },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success && result.data) {
        setCurrentUser(result.data.user);
        // Single source of truth: token stored here only (not in service)
        localStorage.setItem("authToken", result.data.token);
        showMessage("Login successful!", "success");
        setTimeout(() => navigate("/student-dashboard"), 1000);
      } else {
        showMessage(result.message || "Invalid email or password", "error");
      }
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const registerMutation = useMutation({
    mutationFn: ({ name, email, password }) =>
      registerUser(name, email, password),
    onMutate: () => setLoading(true),
    onSuccess: (result, variables) => {
      if (result.success) {
        setPendingRegistration({
          name: variables.name,
          email: variables.email,
          password: variables.password,
        });
        setFormType("otp");
        reset();
        showMessage("OTP sent to your email address", "success");
      } else {
        showMessage(result.message || "Registration failed", "error");
      }
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const otpMutation = useMutation({
    mutationFn: ({ otp }) => verifyOTP(pendingRegistration.email, otp),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success) {
        const user = result.data.user || result.data;
        setCurrentUser(user);
        // Single source of truth: token stored here only (not in service)
        if (result.data.token) {
          localStorage.setItem("authToken", result.data.token);
        }
        showMessage("Registration successful!", "success");
        setTimeout(() => navigate("/student-dashboard"), 1000);
      } else {
        showMessage(result.message || "Invalid OTP", "error");
      }
    },
    onError: () => showMessage("Error connecting to server", "error"),
    onSettled: () => setLoading(false),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendOTP(pendingRegistration.email),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.success)
        showMessage("OTP resent to your email address", "success");
    },
    onSettled: () => setLoading(false),
  });

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    (data) => {
      if (formType === "login") loginMutation.mutate(data);
      else if (formType === "register") registerMutation.mutate(data);
      else if (formType === "otp") otpMutation.mutate(data);
    },
    [formType, loginMutation, registerMutation, otpMutation],
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
    isSubmitting;

  return (
    <div className="page active">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>
              {formType === "login" && "Student Login"}
              {formType === "register" && "Student Registration"}
              {formType === "otp" && "Verify Email"}
            </h2>
            <p>
              {formType === "login" &&
                "Access your account with official Amity email"}
              {formType === "register" &&
                "Create your account with official Amity email"}
              {formType === "otp" && "Enter the OTP sent to your email"}
            </p>
          </div>

          {/* {formType === "login" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  {...register("email")}
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="your.name@s.amity.edu"
                  disabled={isAnyPending}
                />
                {errors.email && (
                  <div className="error-message">{errors.email.message}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  {...register("password")}
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Enter your password"
                  disabled={isAnyPending}
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
                {loginMutation.isPending ? "Logging in…" : "Login"}
              </button>
            </form>
          )}

          {formType === "register" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  {...register("name")}
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  placeholder="Enter your full name"
                  disabled={isAnyPending}
                />
                {errors.name && (
                  <div className="error-message">{errors.name.message}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Amity Email</label>
                <input
                  {...register("email")}
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="your.name@s.amity.edu"
                  disabled={isAnyPending}
                />
                {errors.email && (
                  <div className="error-message">{errors.email.message}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  {...register("password")}
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Create a password"
                  disabled={isAnyPending}
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
                {registerMutation.isPending
                  ? "Sending OTP…"
                  : "Register & Send OTP"}
              </button>
            </form>
          )}

          {formType === "otp" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="otp-message">
                <FaEnvelope />
                <p>
                  Verification code sent to{" "}
                  <strong>{pendingRegistration?.email}</strong>
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  {...register("otp")}
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
                {otpMutation.isPending ? "Verifying…" : "Verify Email"}
              </button>
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                className="btn btn--outline btn--full-width"
                disabled={resendMutation.isPending}
              >
                <FaRedo />
                {resendMutation.isPending ? "Resending…" : "Resend OTP"}
              </button>
            </form>
          )} */}

          {formType === "login" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="form-group">
                {/* 1. Added htmlFor linked to id */}
                <label htmlFor="login-email" className="form-label">
                  Email Address
                </label>
                <input
                  id="login-email" // 2. Unique ID
                  {...register("email")}
                  autoComplete="email" // 3. Browsers suggest saved emails
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="your.name@s.amity.edu"
                  disabled={isAnyPending}
                />
                {errors.email && (
                  <div className="error-message">{errors.email.message}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  {...register("password")}
                  autoComplete="current-password" // 4. Essential for Password Managers
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Enter your password"
                  disabled={isAnyPending}
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
                {loginMutation.isPending ? "Logging in…" : "Login"}
              </button>
            </form>
          )}

          {formType === "register" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="form-group">
                <label htmlFor="register-name" className="form-label">
                  Full Name
                </label>
                <input
                  id="register-name"
                  {...register("name")}
                  autoComplete="name" // Suggests user's full name
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
                <input
                  id="register-password"
                  type="password"
                  {...register("password")}
                  autoComplete="new-password" // 5. Tells browser to suggest a strong password
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Create a password"
                  disabled={isAnyPending}
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
                {registerMutation.isPending
                  ? "Sending OTP…"
                  : "Register & Send OTP"}
              </button>
            </form>
          )}

          {formType === "otp" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
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
                  autoComplete="one-time-code" // 6. Mobile browsers can auto-fill from SMS/Email
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
                {otpMutation.isPending ? "Verifying…" : "Verify Email"}
              </button>
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                className="btn btn--outline btn--full-width"
                disabled={resendMutation.isPending}
              >
                <FaRedo />
                {resendMutation.isPending ? "Resending…" : "Resend OTP"}
              </button>
            </form>
          )}

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
                  Don&apos;t have an account? <strong>Register here</strong>
                </>
              ) : (
                <>
                  Already have an account? <strong>Login here</strong>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(StudentAuthPage);
