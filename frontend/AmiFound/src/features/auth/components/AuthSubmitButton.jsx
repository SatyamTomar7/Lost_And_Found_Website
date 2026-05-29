import buttonStyles from "../../../shared/ui/Button.module.css";

const AuthSubmitButton = ({
  icon: Icon,
  label,
  pendingLabel,
  isPending,
  disabled,
  ariaBusy,
}) => (
  <button
    type="submit"
    className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
    disabled={disabled}
    aria-busy={ariaBusy}
  >
    {Icon && <Icon aria-hidden="true" />}
    <span>{isPending ? pendingLabel : label}</span>
  </button>
);

export default AuthSubmitButton;
