import { Component } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import loaderStyles from "../ui/Loader.module.css";
import buttonStyles from "../ui/Button.module.css";
import {
  APP_ERROR_FALLBACK_MESSAGE,
  getAppErrorRetryState,
} from "./appErrorBoundary.utils.js";

export class AppErrorBoundary extends Component {
  state = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary] Application rendering failure", {
      name: error?.name || "Error",
      componentStack: info?.componentStack,
    });
  }

  handleRetry = () => {
    this.setState(getAppErrorRetryState);
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className={loaderStyles["page-loader"]} role="alert">
          <div className={loaderStyles["loading-spinner"]}>
            <FaExclamationTriangle
              className={loaderStyles["chunk-error-icon"]}
              aria-hidden="true"
            />
            <h1>Something went wrong</h1>
            <p>{APP_ERROR_FALLBACK_MESSAGE}</p>
            <div className={loaderStyles["session-recovery-actions"]}>
              <button
                type="button"
                className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
                onClick={this.handleRetry}
              >
                Try again
              </button>
              <button
                type="button"
                className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
                onClick={this.handleReload}
              >
                Reload application
              </button>
            </div>
          </div>
        </main>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

export default AppErrorBoundary;
