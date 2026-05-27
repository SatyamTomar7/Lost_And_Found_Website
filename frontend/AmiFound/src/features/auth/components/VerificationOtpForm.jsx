import { FaCheck, FaEnvelope } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
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

    <div className={authStyles["form-group"]}>
      <label htmlFor="otp-input" className={authStyles["form-label"]}>
        Verification Code
      </label>
      <input
        id="otp-input"
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
      <FaCheck />
      <span>{otpMutation.isPending ? "Verifying..." : "Verify Email"}</span>
    </button>

    <ResendButton
      onResend={() => resendMutation.mutate()}
      isResending={resendMutation.isPending}
      timerDisplay={registrationTimer.display}
      timerActive={registrationTimer.isActive}
      isAnyPending={isAnyPending}
    />
  </form>
);

export default VerificationOtpForm;
