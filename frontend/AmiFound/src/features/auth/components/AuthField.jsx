import authStyles from "../Auth.module.css";

const AuthField = ({
  id,
  label,
  error,
  action,
  children,
}) => (
  <div className={authStyles["form-group"]}>
    {action ? (
      <div className={authStyles["form-label-row"]}>
        <label htmlFor={id} className={authStyles["form-label"]}>
          {label}
        </label>
        {action}
      </div>
    ) : (
      <label htmlFor={id} className={authStyles["form-label"]}>
        {label}
      </label>
    )}
    {children}
    {error && (
      <div className={authStyles["error-message"]}>{error.message}</div>
    )}
  </div>
);

export default AuthField;
