import { FaSignInAlt } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
import PasswordInput from "./PasswordInput";

const LoginForm = ({
  handleSubmit,
  onSubmit,
  register,
  errors,
  isAnyPending,
  loginMutation,
  switchForm,
}) => (
  <form
    onSubmit={handleSubmit(onSubmit)}
    className={authStyles["auth-form"]}
    noValidate
  >
    <div className={authStyles["form-group"]}>
      <label htmlFor="login-email" className={authStyles["form-label"]}>
        Email Address
      </label>
      <input
        id="login-email"
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

    <div className={authStyles["form-group"]}>
      <div className={authStyles["form-label-row"]}>
        <label htmlFor="login-password" className={authStyles["form-label"]}>
          Password
        </label>
        <button
          type="button"
          className={authStyles["forgot-password-link"]}
          onClick={() => switchForm("forgot-password")}
          disabled={isAnyPending}
        >
          Forgot password?
        </button>
      </div>
      <PasswordInput
        id="login-password"
        registration={register("password")}
        error={errors.password}
        placeholder="Enter your password"
        disabled={isAnyPending}
        autoComplete="current-password"
      />
      {errors.password && (
        <div className={authStyles["error-message"]}>
          {errors.password.message}
        </div>
      )}
    </div>

    <button
      type="submit"
      className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
      disabled={isAnyPending}
      aria-busy={loginMutation.isPending}
    >
      <FaSignInAlt aria-hidden="true" />
      <span>{loginMutation.isPending ? "Logging in..." : "Login"}</span>
    </button>
  </form>
);

export default LoginForm;
