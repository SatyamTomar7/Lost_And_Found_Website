import { FaArrowLeft, FaEnvelope, FaLock } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";

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

    <div className={authStyles["form-group"]}>
      <label htmlFor="forgot-email" className={authStyles["form-label"]}>
        Email Address
      </label>
      <input
        id="forgot-email"
        {...register("email")}
        autoComplete="email"
        className={`${authStyles["form-control"]} ${errors.email ? authStyles["is-invalid"] : ""}`}
        placeholder="your.email@amity.edu"
        disabled={isAnyPending}
      />
      {errors.email && (
        <div className={authStyles["error-message"]}>{errors.email.message}</div>
      )}
    </div>

    <button
      type="submit"
      className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
      disabled={isAnyPending}
    >
      <FaEnvelope />
      <span>
        {forgotPasswordMutation.isPending ? "Sending OTP..." : "Send Reset OTP"}
      </span>
    </button>

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
