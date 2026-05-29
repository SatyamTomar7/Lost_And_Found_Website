import { FaCheck, FaEnvelope } from "react-icons/fa";
import authStyles from "../Auth.module.css";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextInput from "./AuthTextInput";
import ResendButton from "./ResendButton";

const VerificationOtpForm = ({
  handleSubmit,
  onSubmit,
  register,
  errors,
  isAnyPending,
  otpMutation,
  pendingRegistration,
  resendMutation,
  registrationTimer,
}) => (
  <form
    onSubmit={handleSubmit(onSubmit)}
    className={authStyles["auth-form"]}
    noValidate
  >
    <div className={authStyles["otp-message"]}>
      <FaEnvelope />
      <p>
        Verification code sent to <strong>{pendingRegistration?.email}</strong>
      </p>
    </div>

    <AuthField id="otp-input" label="Verification Code" error={errors.otp}>
      <AuthTextInput
        id="otp-input"
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
      icon={FaCheck}
      label="Verify Email"
      pendingLabel="Verifying..."
      isPending={otpMutation.isPending}
      disabled={isAnyPending}
    />

    <ResendButton
      onResend={() => resendMutation.mutate()}
      isResending={resendMutation.isPending}
      timerDisplay={registrationTimer.display}
      timerActive={registrationTimer.isActive}
      isAnyPending={isAnyPending}
    />
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default VerificationOtpForm;
