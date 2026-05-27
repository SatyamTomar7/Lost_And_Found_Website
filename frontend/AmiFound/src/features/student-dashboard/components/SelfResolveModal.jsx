import React from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaHome,
  FaMapMarkerAlt,
  FaPalette,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import modalStyles from "../../../shared/ui/Modal.module.css";
import styles from "../StudentDashboard.module.css";

const SelfResolveModal = React.memo(
  ({ item, onConfirm, onClose, isLoading }) => (
    <div
      className={modalStyles["return-modal-overlay"]}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${modalStyles["return-modal"]} ${modalStyles["self-resolve-modal"]}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="self-resolve-title"
      >
        <div className={modalStyles["return-modal__header"]}>
          <div className={modalStyles["return-modal__title-group"]}>
            <FaHome
              className={`${modalStyles["return-modal__icon"]} ${modalStyles["return-modal__icon--resolve"]}`}
            />
            <h3 id="self-resolve-title">Found it Myself</h3>
          </div>
          <button
            className={modalStyles["return-modal__close"]}
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>

        <div className={modalStyles["return-details__body"]}>
          <div className={modalStyles["self-resolve-modal__item-preview"]}>
            <div className={modalStyles["self-resolve-modal__item-name"]}>
              {item.name}
            </div>
            <div className={styles["item-meta"]}>
              <span>
                <FaPalette /> {item.color}
              </span>
              <span>
                <FaCalendarAlt />{" "}
                {new Date(item.dateLost).toLocaleDateString()}
              </span>
              <span>
                <FaMapMarkerAlt /> {item.placeLost}
              </span>
            </div>
          </div>
          <div className={modalStyles["self-resolve-modal__message"]}>
            <p>
              Glad you found it! This will <strong>close your lost report</strong>{" "}
              and remove it from the matching queue.
            </p>
            <p className={modalStyles["self-resolve-modal__warning"]}>
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className={modalStyles["return-modal__footer"]}>
          <button
            className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`${buttonStyles.btn} ${buttonStyles["btn--self-resolve-confirm"]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className={buttonStyles["spin-icon"]} /> Closing…
              </>
            ) : (
              <>
                <FaCheckCircle /> Yes, I Found It
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ),
);

SelfResolveModal.displayName = "SelfResolveModal";

export default SelfResolveModal;
