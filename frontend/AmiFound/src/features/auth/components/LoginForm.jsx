import { FaSignInAlt } from "react-icons/fa";
import authStyles from "../Auth.module.css";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextInput from "./AuthTextInput";
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
    <AuthField id="login-email" label="Email Address" error={errors.email}>
      <AuthTextInput
        id="login-email"
        registration={register("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="your.email@amity.edu"
        disabled={isAnyPending}
      />
    </AuthField>

    <AuthField
      id="login-password"
      label="Password"
      error={errors.password}
      action={
        <button
          type="button"
          className={authStyles["forgot-password-link"]}
          onClick={() => switchForm("forgot-password")}
          disabled={isAnyPending}
        >
          Forgot password?
        </button>
      }
    >
      <PasswordInput
        id="login-password"
        registration={register("password")}
        error={errors.password}
        placeholder="Enter your password"
        disabled={isAnyPending}
        autoComplete="current-password"
      />
    </AuthField>

    <AuthSubmitButton
      icon={FaSignInAlt}
      label="Login"
      pendingLabel="Logging in..."
      isPending={loginMutation.isPending}
      disabled={isAnyPending}
      ariaBusy={loginMutation.isPending}
    />
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default LoginForm;
