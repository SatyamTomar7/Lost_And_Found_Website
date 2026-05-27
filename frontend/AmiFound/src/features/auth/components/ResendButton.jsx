import { FaClock, FaRedo } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";

const ResendButton = ({
  onResend,
  isResending,
  timerDisplay,
  timerActive,
  isAnyPending,
}) => (
  <button
    type="button"
    onClick={onResend}
    className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]} ${buttonStyles["btn--full-width"]}`}
    disabled={timerActive || isResending || isAnyPending}
  >
    {isResending ? (
      <>
        <FaRedo className={buttonStyles["spin-icon"]} />
        <span>Resending...</span>
      </>
    ) : timerActive ? (
      <>
        <FaClock />
        <span>Resend in {timerDisplay}</span>
      </>
    ) : (
      <>
        <FaRedo />
        <span>Resend OTP</span>
      </>
    )}
  </button>
);

export default ResendButton;
