import authStyles from "../Auth.module.css";

const AuthTextInput = ({
  id,
  registration,
  error,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  disabled,
  maxLength,
  className = "",
}) => (
  <input
    id={id}
    type={type}
    {...registration}
    autoComplete={autoComplete}
    inputMode={inputMode}
    className={`${authStyles["form-control"]} ${error ? authStyles["is-invalid"] : ""} ${className}`.trim()}
    placeholder={placeholder}
    disabled={disabled}
    maxLength={maxLength}
  />
);

export default AuthTextInput;
