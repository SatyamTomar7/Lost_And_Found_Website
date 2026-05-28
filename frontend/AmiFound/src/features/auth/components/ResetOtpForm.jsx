import { FaArrowLeft, FaEnvelope, FaKey } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
import ResendButton from "./ResendButton";

const ResetOtpForm = ({
  handleSubmit,
  onSubmit,
  register,
  errors,
  isAnyPending,
  verifyResetOTPMutation,
  resetEmail,
  resendResetOTPMutation,
  resetTimer,
  switchForm,
}) => (
  <form
    onSubmit={handleSubmit(onSubmit)}
    className={authStyles["auth-form"]}
    noValidate
  >
    <div className={authStyles["otp-message"]}>
      <FaEnvelope />
      <p>
        Reset OTP sent to <strong>{resetEmail}</strong>
      </p>
    </div>

    <div className={authStyles["form-group"]}>
      <label htmlFor="reset-otp-input" className={authStyles["form-label"]}>
        Reset OTP
      </label>
      <input
        id="reset-otp-input"
        {...register("otp")}
        autoComplete="one-time-code"
        className={`${authStyles["form-control"]} ${authStyles["otp-input"]} ${errors.otp ? authStyles["is-invalid"] : ""}`}
        maxLength="6"
        placeholder="000000"
        disabled={isAnyPending}
      />
      {errors.otp && (
        <div className={authStyles["error-message"]}>{errors.otp.message}</div>
      )}
    </div>

    <button
      type="submit"
      className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
      disabled={isAnyPending}
    >
      <FaKey />
      <span>
        {verifyResetOTPMutation.isPending ? "Verifying..." : "Verify OTP"}
      </span>
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
      className={`${buttonStyles.btn} ${buttonStyles["btn--ghost"]} ${buttonStyles["btn--full-width"]}`}
      onClick={() => switchForm("forgot-password")}
      disabled={isAnyPending}
    >
      <FaArrowLeft />
      <span>Change Email</span>
    </button>
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default ResetOtpForm;
