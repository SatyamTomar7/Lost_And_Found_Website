import React, { useState, useMemo, useCallback, useEffect } from "react"; // Added useEffect
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

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

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

  // 1. AUTO-REDIRECT: If token exists, send them to dashboard immediately
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      navigate("/student-dashboard", { replace: true });
    }
  }, [navigate]);

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
        localStorage.setItem("authToken", result.data.token);
        showMessage("Login successful!", "success");
        
        // 2. HISTORY FIX: Use replace: true
        setTimeout(() => navigate("/student-dashboard", { replace: true }), 1000);
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
        if (result.data.token) {
          localStorage.setItem("authToken", result.data.token);
        }
         localStorage.setItem("userRole",result.data.role)
        showMessage("Registration successful!", "success");
        
        // 3. HISTORY FIX: Use replace: true
        setTimeout(() => navigate("/student-dashboard", { replace: true }), 1000);
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
    <main className="page active">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-header">
            <h2>
              {formType === "login" && "Student Login"}
              {formType === "register" && "Student Registration"}
              {formType === "otp" && "Verify Email"}
            </h2>
            <p>
              {formType === "login" && "Access your account with official Amity email"}
              {formType === "register" && "Create your account with official Amity email"}
              {formType === "otp" && "Enter the OTP sent to your email"}
            </p>
          </header>

          {formType === "login" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">Email Address</label>
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
                <label htmlFor="login-password" className="form-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  {...register("password")}
                  autoComplete="current-password"
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
                <span>{loginMutation.isPending ? "Logging in…" : "Login"}</span>
              </button>
            </form>
          )}

          {formType === "register" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="register-name" className="form-label">Full Name</label>
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
                <label htmlFor="register-email" className="form-label">Amity Email</label>
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
                <label htmlFor="register-password" className="form-label">Password</label>
                <input
                  id="register-password"
                  type="password"
                  {...register("password")}
                  autoComplete="new-password"
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
                <span>
                  {registerMutation.isPending ? "Sending OTP…" : "Register & Send OTP"}
                </span>
              </button>
            </form>
          )}

          {formType === "otp" && (
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="otp-message">
                <FaEnvelope />
                <p>
                  Verification code sent to{" "}
                  <strong>{pendingRegistration?.email}</strong>
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="otp-input" className="form-label">Verification Code</label>
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
                <span>{otpMutation.isPending ? "Verifying…" : "Verify Email"}</span>
              </button>
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                className="btn btn--outline btn--full-width"
                disabled={resendMutation.isPending}
              >
                <FaRedo />
                <span>{resendMutation.isPending ? "Resending…" : "Resend OTP"}</span>
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
                <>Don't have an account? <strong>Register here</strong></>
              ) : (
                <>Already have an account? <strong>Login here</strong></>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default React.memo(StudentAuthPage);