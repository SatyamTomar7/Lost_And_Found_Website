import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import authStyles from "../Auth.module.css";

const PasswordInput = ({
  id,
  registration,
  error,
  placeholder,
  disabled,
  autoComplete,
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className={authStyles["password-input-wrapper"]}>
      <input
        id={id}
        type={show ? "text" : "password"}
        {...registration}
        autoComplete={autoComplete || "current-password"}
        className={`${authStyles["form-control"]} ${error ? authStyles["is-invalid"] : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="button"
        className={authStyles["password-toggle-btn"]}
        onClick={() => setShow((p) => !p)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
};

export default PasswordInput;
