import { FaArrowLeft, FaEnvelope, FaKey } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextInput from "./AuthTextInput";
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

    <AuthField
      id="reset-otp-input"
      label="Reset OTP"
      error={errors.otp}
    >
      <AuthTextInput
        id="reset-otp-input"
        registration={register("otp")}
        autoComplete="one-time-code"
        inputMode="numeric"
        className={authStyles["otp-input"]}
        maxLength={6}
        placeholder="000000"
        disabled={isAnyPending}
      />
    </AuthField>

    <AuthSubmitButton
      icon={FaKey}
      label="Verify OTP"
      pendingLabel="Verifying..."
      isPending={verifyResetOTPMutation.isPending}
      disabled={isAnyPending}
    />

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
