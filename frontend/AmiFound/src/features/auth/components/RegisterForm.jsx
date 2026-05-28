import { FaUserPlus } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import authStyles from "../Auth.module.css";
import PasswordInput from "./PasswordInput";

const RegisterForm = ({
  handleSubmit,
  onSubmit,
  register,
  errors,
  isAnyPending,
  registerMutation,
}) => (
  <form
    onSubmit={handleSubmit(onSubmit)}
    className={authStyles["auth-form"]}
    noValidate
  >
    <div className={authStyles["form-group"]}>
      <label htmlFor="register-name" className={authStyles["form-label"]}>
        Full Name
      </label>
      <input
        id="register-name"
        {...register("name")}
        autoComplete="name"
        className={`${authStyles["form-control"]} ${errors.name ? authStyles["is-invalid"] : ""}`}
        placeholder="Enter your full name"
        disabled={isAnyPending}
      />
      {errors.name && (
        <div className={authStyles["error-message"]}>{errors.name.message}</div>
      )}
    </div>

    <div className={authStyles["form-group"]}>
      <label htmlFor="register-email" className={authStyles["form-label"]}>
        Amity Email
      </label>
      <input
        id="register-email"
        {...register("email")}
        autoComplete="email"
        className={`${authStyles["form-control"]} ${errors.email ? authStyles["is-invalid"] : ""}`}
        placeholder="your.name@s.amity.edu"
        disabled={isAnyPending}
      />
      {errors.email && (
        <div className={authStyles["error-message"]}>{errors.email.message}</div>
      )}
    </div>

    <div className={authStyles["form-group"]}>
      <label htmlFor="register-password" className={authStyles["form-label"]}>
        Password
      </label>
      <PasswordInput
        id="register-password"
        registration={register("password")}
        error={errors.password}
        placeholder="Min 6 chars with A-Z, a-z and number"
        disabled={isAnyPending}
        autoComplete="new-password"
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
    >
      <FaUserPlus aria-hidden="true" />
      <span>
        {registerMutation.isPending ? "Sending OTP..." : "Register & Send OTP"}
      </span>
    </button>
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default RegisterForm;
