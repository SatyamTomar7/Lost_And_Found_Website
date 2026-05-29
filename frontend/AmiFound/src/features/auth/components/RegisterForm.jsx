import { FaUserPlus } from "react-icons/fa";
import authStyles from "../Auth.module.css";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextInput from "./AuthTextInput";
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
    <AuthField id="register-name" label="Full Name" error={errors.name}>
      <AuthTextInput
        id="register-name"
        registration={register("name")}
        autoComplete="name"
        placeholder="Enter your full name"
        disabled={isAnyPending}
      />
    </AuthField>

    <AuthField id="register-email" label="Amity Email" error={errors.email}>
      <AuthTextInput
        id="register-email"
        registration={register("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="your.name@s.amity.edu"
        disabled={isAnyPending}
      />
    </AuthField>

    <AuthField
      id="register-password"
      label="Password"
      error={errors.password}
    >
      <PasswordInput
        id="register-password"
        registration={register("password")}
        error={errors.password}
        placeholder="Min 6 chars with A-Z, a-z and number"
        disabled={isAnyPending}
        autoComplete="new-password"
      />
    </AuthField>

    <AuthSubmitButton
      icon={FaUserPlus}
      label="Register & Send OTP"
      pendingLabel="Sending OTP..."
      isPending={registerMutation.isPending}
      disabled={isAnyPending}
    />
    {errors.root && (
      <div className={authStyles["error-message"]}>{errors.root.message}</div>
    )}
  </form>
);

export default RegisterForm;
