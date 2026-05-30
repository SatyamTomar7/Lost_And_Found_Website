import { Link } from "react-router-dom";
import { FaCompass } from "react-icons/fa";
import loaderStyles from "../ui/Loader.module.css";
import buttonStyles from "../ui/Button.module.css";

export default function NotFoundPage() {
  return (
    <div className={loaderStyles["page-loader"]}>
      <div className={loaderStyles["loading-spinner"]}>
        <FaCompass className={loaderStyles["chunk-error-icon"]} />
        <p>The page you are looking for does not exist.</p>
        <div className={loaderStyles["session-recovery-actions"]}>
          <Link
            to="/"
            className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
          >
            Go To Home
          </Link>
        </div>
      </div>
    </div>
  );
}
