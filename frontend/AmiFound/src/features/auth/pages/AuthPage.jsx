import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import authStyles from "../Auth.module.css";
import {
  fetchCurrentUser,
  getAuthToken,
  setAuthSession,
  forgotPassword,
  login,
  register as registerUser,
  resendOTP,
  resetPassword,
  verifyOTP,
  verifyResetOTP,
} from "../services/authService";
import {
  getAuthHeaderMap,
  getDashboardRoute,
  RESET_FLOW_FORM_TYPES,
} from "../constants";
import { schemaMap } from "../schemas";
import useOTPTimer from "../hooks/useOTPTimer";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import VerificationOtpForm from "../components/VerificationOtpForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import ResetOtpForm from "../components/ResetOtpForm";
import NewPasswordForm from "../components/NewPasswordForm";

const UnifiedAuthPage = ({
  mode = "login",
  setCurrentUser,
  setLoading,
  showMessage,
  currentUser,
}) => {
  const navigate = useNavigate();

  const [formType, setFormType] = useState(
    mode === "register" ? "register" : "login",
  );
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const registrationTimer = useOTPTimer();
  const resetTimer = useOTPTimer();

  useEffect(() => {
    const token = getAuthToken();
    if (token && currentUser) {
      if (currentUser.role === "student" && !currentUser.profileCompleted) {
        navigate("/complete-profile", { replace: true });
      } else {
        navigate(getDashboardRoute(currentUser.role), { replace: true });
      }
    }
  }, [navigate, currentUser]);

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

  const switchForm = useCallback(
    (type) => {
      reset();
      setFormType(type);
    },
    [reset],
  );

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      if (result.message === "ACCOUNT_NOT_VERIFIED") {
        setPendingRegistration({
          email: result.data?.email ?? "",
          name: result.data?.name ?? "",
        });
        registrationTimer.startTimer();
        setFormType("otp");
        reset();
        showMessage(
          "Your email isn't verified - a new code has been sent.",
          "info",
        );
        return;
      }
      if (result.success && result.data) {
        const user = result.data.user;
        setCurrentUser(user);
        setAuthSession(result.data?.token, user.role);
        showMessage("Login successful!", "success");
        setTimeout(() => {
          if (user.role === "student" && !user.profileCompleted) {
            navigate("/complete-profile", { replace: true });
          } else {
            navigate(getDashboardRoute(user.role), { replace: true });
          }
        }, 800);
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
        });
        registrationTimer.startTimer();
        setFormType("otp");
        reset();
        showMessage("A verification code has been sent to your email.", "success");
        return;
      }
      if (result.success) {
        setPendingRegistration({
          name: variables.name,
          email: variables.email,
        });
        registrationTimer.startTimer();
        setFormType("otp");
        reset();
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
    onSuccess: async (result) => {
      if (result.success) {
        const user = result.data.user || result.data;
        if (result.data.token) setAuthSession(result.data.token, user.role);
        const refreshedUser = await fetchCurrentUser().catch(() => user);
        setCurrentUser(refreshedUser);
        showMessage("Registration successful!", "success");
        if (!refreshedUser.profileCompleted) {
          navigate("/complete-profile", { replace: true });
        } else {
          navigate(getDashboardRoute(refreshedUser.role), { replace: true });
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
      } else showMessage(result.message || "Failed to resend OTP", "error");
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

  const headerMap = getAuthHeaderMap(resetEmail);
  const isResetFlow = RESET_FLOW_FORM_TYPES.includes(formType);

  return (
    <main className="page active" id="main-content">
      <div className={authStyles["auth-container"]}>
        <div className={authStyles["auth-card"]}>
          <header className={authStyles["auth-header"]}>
            <h2>{headerMap[formType]?.title}</h2>
            <p>{headerMap[formType]?.sub}</p>
          </header>

          {formType === "login" && (
            <LoginForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              register={register}
              errors={errors}
              isAnyPending={isAnyPending}
              loginMutation={loginMutation}
              switchForm={switchForm}
            />
          )}

          {formType === "register" && (
            <RegisterForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              register={register}
              errors={errors}
              isAnyPending={isAnyPending}
              registerMutation={registerMutation}
            />
          )}

          {formType === "otp" && (
            <VerificationOtpForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              register={register}
              errors={errors}
              isAnyPending={isAnyPending}
              otpMutation={otpMutation}
              pendingRegistration={pendingRegistration}
              resendMutation={resendMutation}
              registrationTimer={registrationTimer}
            />
          )}

          {formType === "forgot-password" && (
            <ForgotPasswordForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              register={register}
              errors={errors}
              isAnyPending={isAnyPending}
              forgotPasswordMutation={forgotPasswordMutation}
              switchForm={switchForm}
            />
          )}

          {formType === "reset-otp" && (
            <ResetOtpForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              register={register}
              errors={errors}
              isAnyPending={isAnyPending}
              verifyResetOTPMutation={verifyResetOTPMutation}
              resetEmail={resetEmail}
              resendResetOTPMutation={resendResetOTPMutation}
              resetTimer={resetTimer}
              switchForm={switchForm}
            />
          )}

          {formType === "new-password" && (
            <NewPasswordForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              register={register}
              errors={errors}
              isAnyPending={isAnyPending}
              resetPasswordMutation={resetPasswordMutation}
            />
          )}

          {!isResetFlow && formType !== "otp" && (
            <div className={authStyles["auth-switch"]}>
              <button
                type="button"
                onClick={() =>
                  switchForm(formType === "login" ? "register" : "login")
                }
                className={authStyles["auth-switch-btn"]}
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

export default React.memo(UnifiedAuthPage);
