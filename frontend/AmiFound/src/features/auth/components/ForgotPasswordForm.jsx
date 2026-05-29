import { FaArrowLeft, FaEnvelope, FaLock } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextInput from "./AuthTextInput";

const ForgotPasswordForm = ({
  handleSubmit,
  onSubmit,
  register,
  errors,
  isAnyPending,
  forgotPasswordMutation,
  switchForm,
}) => (
  <form
    onSubmit={handleSubmit(onSubmit)}
    className={authStyles["auth-form"]}
    noValidate
  >
    <div className={authStyles["reset-info-box"]}>
      <FaLock className={authStyles["reset-info-box__icon"]} />
      <p>
        Enter your registered email. We'll send a 6-digit OTP to reset your
        password.
      </p>
    </div>

    <AuthField id="forgot-email" label="Email Address" error={errors.email}>
      <AuthTextInput
        id="forgot-email"
        registration={register("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="your.email@amity.edu"
        disabled={isAnyPending}
      />
    </AuthField>

    <AuthSubmitButton
      icon={FaEnvelope}
      label="Send Reset OTP"
      pendingLabel="Sending OTP..."
      isPending={forgotPasswordMutation.isPending}
      disabled={isAnyPending}
    />

    <button
      type="button"
      className={`${buttonStyles.btn} ${buttonStyles["btn--ghost"]} ${buttonStyles["btn--full-width"]}`}
      onClick={() => switchForm("login")}
      disabled={isAnyPending}
    >
      <FaArrowLeft />
      <span>Back to Login</span>
    </button>
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default ForgotPasswordForm;
