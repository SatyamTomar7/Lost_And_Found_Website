import React from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import modalStyles from "../../../shared/ui/Modal.module.css";

const SubmitConfirmModal = React.memo(
  ({ formData, onConfirm, onEdit, isLoading }) => (
    <div className={modalStyles["return-modal-overlay"]} role="presentation">
      <div
        className={modalStyles["return-modal"]}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-submit-title"
      >
        <div className={modalStyles["return-modal__header"]}>
          <div className={modalStyles["return-modal__title-group"]}>
            <FaExclamationTriangle
              className={`${modalStyles["return-modal__icon"]} ${modalStyles["return-modal__icon--warning"]}`}
            />
            <h3 id="confirm-submit-title">Confirm Your Details</h3>
          </div>
        </div>

        <div className={modalStyles["return-details__body"]}>
          <div
            className={modalStyles["submit-confirm-modal__warning"]}
            role="alert"
          >
            <FaExclamationTriangle />
            <p>
              <strong>Once submitted, details cannot be edited.</strong> Please
              verify everything is correct before confirming.
            </p>
          </div>

          <div className={modalStyles["submit-confirm-modal__details"]}>
            <div className={modalStyles["submit-confirm-modal__row"]}>
              <span className={modalStyles["submit-confirm-modal__label"]}>
                Item Name
              </span>
              <span className={modalStyles["submit-confirm-modal__value"]}>
                {formData.name}
              </span>
            </div>
            <div className={modalStyles["submit-confirm-modal__row"]}>
              <span className={modalStyles["submit-confirm-modal__label"]}>
                Color
              </span>
              <span className={modalStyles["submit-confirm-modal__value"]}>
                {formData.color}
              </span>
            </div>
            <div className={modalStyles["submit-confirm-modal__row"]}>
              <span className={modalStyles["submit-confirm-modal__label"]}>
                Condition
              </span>
              <span className={modalStyles["submit-confirm-modal__value"]}>
                {formData.condition}
              </span>
            </div>
            {formData.brand && (
              <div className={modalStyles["submit-confirm-modal__row"]}>
                <span className={modalStyles["submit-confirm-modal__label"]}>
                  Brand
                </span>
                <span className={modalStyles["submit-confirm-modal__value"]}>
                  {formData.brand}
                </span>
              </div>
            )}
            <div className={modalStyles["submit-confirm-modal__row"]}>
              <span className={modalStyles["submit-confirm-modal__label"]}>
                Place Lost
              </span>
              <span className={modalStyles["submit-confirm-modal__value"]}>
                {formData.placeLost}
              </span>
            </div>
            <div className={modalStyles["submit-confirm-modal__row"]}>
              <span className={modalStyles["submit-confirm-modal__label"]}>
                Date Lost
              </span>
              <span className={modalStyles["submit-confirm-modal__value"]}>
                {new Date(formData.dateLost).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            {formData.description && (
              <div className={modalStyles["submit-confirm-modal__row"]}>
                <span className={modalStyles["submit-confirm-modal__label"]}>
                  Description
                </span>
                <span className={modalStyles["submit-confirm-modal__value"]}>
                  {formData.description}
                </span>
              </div>
            )}
            {formData.photo?.[0] && (
              <div className={modalStyles["submit-confirm-modal__row"]}>
                <span className={modalStyles["submit-confirm-modal__label"]}>
                  Photo
                </span>
                <span className={modalStyles["submit-confirm-modal__value"]}>
                  {formData.photo[0].name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={modalStyles["return-modal__footer"]}>
          <button
            className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
            onClick={onEdit}
            disabled={isLoading}
          >
            <FaEdit /> Go Back & Edit
          </button>
          <button
            className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className={buttonStyles["spin-icon"]} /> Submitting…
              </>
            ) : (
              <>
                <FaCheckCircle /> Confirm & Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ),
);

SubmitConfirmModal.displayName = "SubmitConfirmModal";

export default SubmitConfirmModal;
