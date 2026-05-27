import { FaCheck, FaLock } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
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

    <div className={authStyles["form-group"]}>
      <label htmlFor="new-password-input" className={authStyles["form-label"]}>
        New Password
      </label>
      <PasswordInput
        id="new-password-input"
        registration={register("newPassword")}
        error={errors.newPassword}
        placeholder="Min 6 chars with A-Z, a-z and number"
        disabled={isAnyPending}
        autoComplete="new-password"
      />
      {errors.newPassword && (
        <div className={authStyles["error-message"]}>
          {errors.newPassword.message}
        </div>
      )}
    </div>

    <div className={authStyles["form-group"]}>
      <label
        htmlFor="confirm-password-input"
        className={authStyles["form-label"]}
      >
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
        <div className={authStyles["error-message"]}>
          {errors.confirmPassword.message}
        </div>
      )}
    </div>

    <button
      type="submit"
      className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
      disabled={isAnyPending}
    >
      <FaLock />
      <span>
        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
      </span>
    </button>
  </form>
);

export default NewPasswordForm;
