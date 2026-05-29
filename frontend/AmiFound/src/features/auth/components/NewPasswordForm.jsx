import { FaCheck, FaLock } from "react-icons/fa";
import authStyles from "../Auth.module.css";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";

const NewPasswordForm = ({
  handleSubmit,
  onSubmit,
  register,
  errors,
  isAnyPending,
  resetPasswordMutation,
}) => (
  <form
    onSubmit={handleSubmit(onSubmit)}
    className={authStyles["auth-form"]}
    noValidate
  >
    <div
      className={`${authStyles["reset-info-box"]} ${authStyles["reset-info-box--success"]}`}
    >
      <FaCheck className={authStyles["reset-info-box__icon"]} />
      <p>OTP verified! Choose a strong new password for your account.</p>
    </div>

    <AuthField
      id="new-password-input"
      label="New Password"
      error={errors.newPassword}
    >
      <PasswordInput
        id="new-password-input"
        registration={register("newPassword")}
        error={errors.newPassword}
        placeholder="Min 6 chars with A-Z, a-z and number"
        disabled={isAnyPending}
        autoComplete="new-password"
      />
    </AuthField>

    <AuthField
      id="confirm-password-input"
      label="Confirm New Password"
      error={errors.confirmPassword}
    >
      <PasswordInput
        id="confirm-password-input"
        registration={register("confirmPassword")}
        error={errors.confirmPassword}
        placeholder="Re-enter new password"
        disabled={isAnyPending}
        autoComplete="new-password"
      />
    </AuthField>

    <AuthSubmitButton
      icon={FaLock}
      label="Reset Password"
      pendingLabel="Resetting..."
      isPending={resetPasswordMutation.isPending}
      disabled={isAnyPending}
    />
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default NewPasswordForm;
