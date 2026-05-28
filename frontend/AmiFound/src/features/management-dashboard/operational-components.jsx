import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FaBox,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaIdCard,
  FaInbox,
  FaInfoCircle,
  FaLink,
  FaMapMarkerAlt,
  FaPalette,
  FaPhone,
  FaSpinner,
  FaTimes,
  FaUser,
  FaWalking,
} from "react-icons/fa";
import authStyles from "../auth/Auth.module.css";
import managementStyles from "./ManagementDashboard.module.css";
import studentStyles from "../student-dashboard/StudentDashboard.module.css";
import buttonStyles from "../../shared/ui/Button.module.css";
import modalStyles from "../../shared/ui/Modal.module.css";
import { applyBackendFormErrors } from "../../shared/lib/formErrorMapper";
import { collectOfflineSchema } from "./schemas";
import { getMatchedLostItemsForFoundItem } from "../items/services/itemService";

export const SubmitConfirmModal = ({
  formData,
  onConfirm,
  onEdit,
  isLoading,
}) => (
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
          <h3 id="confirm-submit-title">Confirm Item Details</h3>
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
            verify carefully.
          </p>
        </div>
        <div className={modalStyles["submit-confirm-modal__details"]}>
          {[
            ["Item Name", formData.name],
            ["Color", formData.color],
            ["Condition", formData.condition],
            formData.recoveryMode
              ? [
                  "Recovery Mode",
                  formData.recoveryMode === "enquiry_recovered"
                    ? "Enquiry Recovered"
                    : "Normal",
                ]
              : null,
            formData.brand ? ["Brand", formData.brand] : null,
            formData.description ? ["Description", formData.description] : null,
            ["Place Found", formData.placeFound],
            [
              "Date Found",
              new Date(formData.dateFound).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            ],
          ]
            .filter(Boolean)
            .map(([label, value]) => (
              <div
                key={label}
                className={modalStyles["submit-confirm-modal__row"]}
              >
                <span className={modalStyles["submit-confirm-modal__label"]}>
                  {label}
                </span>
                <span className={modalStyles["submit-confirm-modal__value"]}>
                  {value}
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className={modalStyles["return-modal__footer"]}>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
          onClick={onEdit}
          disabled={isLoading}
        >
          <FaEdit /> Go Back &amp; Edit
        </button>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FaSpinner className={buttonStyles["spin-icon"]} /> Adding...
            </>
          ) : (
            <>
              <FaCheckCircle /> Confirm &amp; Add
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

export const ReturnDetailsModal = ({ item, onClose }) => (
  <div className={modalStyles["return-modal-overlay"]} onClick={onClose}>
    <div
      className={modalStyles["return-modal"]}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
    >
      <div className={modalStyles["return-modal__header"]}>
        <div className={modalStyles["return-modal__title-group"]}>
          <FaInfoCircle className={modalStyles["return-modal__icon"]} />
          <h3 id="details-modal-title">Return Details</h3>
        </div>
        <button
          className={modalStyles["return-modal__close"]}
          onClick={onClose}
          aria-label="Close modal"
        >
          <FaTimes />
        </button>
      </div>
      <div className={modalStyles["return-details__body"]}>
        <div className={modalStyles["return-details__section"]}>
          <p className={modalStyles["return-details__section-label"]}>Returned Item</p>
          <div className={modalStyles["return-details__item-card"]}>
            <div className={modalStyles["return-details__item-name"]}>{item.name}</div>
            <div className={studentStyles["item-meta"]}>
              <span>
                <FaPalette /> {item.color}
              </span>
              <span>
                <FaMapMarkerAlt /> {item.placeFound}
              </span>
              <span>
                <FaCalendarAlt /> {new Date(item.dateFound).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className={modalStyles["return-details__section"]}>
          <p className={modalStyles["return-details__section-label"]}>Claimed By</p>
          <div className={modalStyles["return-details__claimant-grid"]}>
            {[
              [FaUser, "Name", item.claimedBy?.name],
              [FaEnvelope, "Email", item.claimedBy?.email],
              [FaIdCard, "Enrollment No.", item.claimedBy?.enrollmentNumber],
              [FaPhone, "Mobile", item.claimedBy?.phoneNumber],
              [FaBox, "Course", item.claimedBy?.course],
              [FaLink, "Branch", item.claimedBy?.branch],
              [FaClock, "Semester", item.claimedBy?.semester],
              [FaMapMarkerAlt, "Block", item.claimedBy?.block],
            ].map(([Icon, label, val]) => (
              <div
                key={label}
                className={modalStyles["return-details__claimant-row"]}
              >
                <span className={modalStyles["return-details__claimant-icon"]}>
                  <Icon />
                </span>
                <span className={modalStyles["return-details__claimant-field"]}>
                  {label}
                </span>
                <span className={modalStyles["return-details__claimant-val"]}>
                  {val || "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
        {item.returnedAt && (
          <div className={modalStyles["return-details__section"]}>
            <p className={modalStyles["return-details__section-label"]}>Returned On</p>
            <div className={modalStyles["return-details__date"]}>
              <FaCalendarAlt />
              <span>
                {new Date(item.returnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className={modalStyles["return-modal__footer"]}>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export const CollectOfflineModal = ({
  item,
  onConfirm,
  onClose,
  isLoading,
  serverError,
}) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(collectOfflineSchema),
    defaultValues: {
      name: "",
      email: "",
      enrollmentNumber: "",
      phoneNumber: "",
      course: "",
      branch: "",
      semester: "",
      block: "",
    },
  });

  useEffect(() => {
    if (!serverError) return;

    applyBackendFormErrors(setError, serverError, {
      defaultField: "root",
    });
  }, [serverError, setError]);

  return (
    <div className={modalStyles["return-modal-overlay"]} onClick={onClose}>
      <div
        className={modalStyles["return-modal"]}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collect-offline-title"
      >
        <div className={modalStyles["return-modal__header"]}>
          <div className={modalStyles["return-modal__title-group"]}>
            <FaWalking className={modalStyles["return-modal__icon"]} />
            <h3 id="collect-offline-title">Collected Offline</h3>
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
        <div className={modalStyles["return-modal__found-summary"]}>
          <p className={modalStyles["return-modal__label"]}>
            Item being marked as collected:
          </p>
          <p className={modalStyles["return-modal__item-name"]}>
            <strong>{item.name}</strong> - {item.color} - {item.placeFound}
          </p>
        </div>
        <form onSubmit={handleSubmit((d) => onConfirm(item._id, d))} noValidate>
          <div
            className={`${modalStyles["return-modal__body"]} ${modalStyles["return-modal__body--scrollable"]}`}
          >
            <p className={modalStyles["return-modal__helper-text"]}>
              Record who collected this item in person so it can be referenced
              later.
            </p>
            {[
              ["name", "Name", FaUser, "Full Name"],
              ["email", "Email", FaEnvelope, "example@gmail.com"],
              ["enrollmentNumber", "Enrollment Number", FaIdCard, "A2305214118"],
              ["phoneNumber", "Phone Number", FaPhone, "9876543210"],
              ["course", "Course", FaBox, "B.Tech"],
              ["branch", "Branch", FaLink, "CSE"],
              ["semester", "Semester", FaClock, "6"],
              ["block", "Block", FaMapMarkerAlt, "A"],
            ].map(([field, label, Icon, placeholder]) => (
              <div className={authStyles["form-group"]} key={field}>
                <label className={authStyles["form-label"]}>{label} *</label>
                <div className={modalStyles["return-modal__input-wrap"]}>
                  <Icon
                    className={modalStyles["return-modal__input-icon"]}
                  />
                  <input
                    {...register(field)}
                    className={`${authStyles["form-control"]} ${errors[field] ? authStyles["is-invalid"] : ""} ${modalStyles["return-modal__input--icon-offset"]}`}
                    placeholder={placeholder}
                    disabled={isLoading}
                  />
                </div>
                {errors[field] && (
                  <div className={authStyles["error-message"]}>
                    {errors[field]?.message}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={modalStyles["return-modal__footer"]}>
            {errors.root && (
              <div className={authStyles["error-message"]}>
                {errors.root.message}
              </div>
            )}
            <button
              type="button"
              className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${buttonStyles.btn} ${buttonStyles["btn--collected-offline"]} ${modalStyles["return-modal__offline-submit"]}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FaSpinner className={buttonStyles["spin-icon"]} /> Saving...
                </>
              ) : (
                <>
                  <FaWalking /> Confirm Offline Collection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const OfflineCollectedDetailsModal = ({ item, onClose }) => (
  <div className={modalStyles["return-modal-overlay"]} onClick={onClose}>
    <div
      className={modalStyles["return-modal"]}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-modal-title"
    >
      <div className={modalStyles["return-modal__header"]}>
        <div className={modalStyles["return-modal__title-group"]}>
          <FaWalking className={modalStyles["return-modal__icon"]} />
          <h3 id="offline-modal-title">Collected Offline</h3>
        </div>
        <button
          className={modalStyles["return-modal__close"]}
          onClick={onClose}
          aria-label="Close modal"
        >
          <FaTimes />
        </button>
      </div>

      <div className={modalStyles["return-details__body"]}>
        <div className={modalStyles["return-details__section"]}>
          <p className={modalStyles["return-details__section-label"]}>Item</p>
          <div className={modalStyles["return-details__item-card"]}>
            <div className={modalStyles["return-details__item-name"]}>{item.name}</div>
            <div className={studentStyles["item-meta"]}>
              <span>
                <FaPalette /> {item.color}
              </span>
              <span>
                <FaMapMarkerAlt /> {item.placeFound}
              </span>
              <span>
                <FaCalendarAlt /> {new Date(item.dateFound).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className={modalStyles["return-details__section"]}>
          <p className={modalStyles["return-details__section-label"]}>Collected By</p>
          <div className={modalStyles["return-details__claimant-grid"]}>
            {[
              [FaUser, "Name", item.claimedBy?.name],
              [FaEnvelope, "Email", item.claimedBy?.email],
              [FaIdCard, "Enrollment No.", item.claimedBy?.enrollmentNumber],
              [FaPhone, "Mobile", item.claimedBy?.phoneNumber],
              [FaBox, "Course", item.claimedBy?.course],
              [FaLink, "Branch", item.claimedBy?.branch],
              [FaClock, "Semester", item.claimedBy?.semester],
              [FaMapMarkerAlt, "Block", item.claimedBy?.block],
            ].map(([Icon, label, value]) => (
              <div
                key={label}
                className={modalStyles["return-details__claimant-row"]}
              >
                <span className={modalStyles["return-details__claimant-icon"]}>
                  <Icon />
                </span>
                <span className={modalStyles["return-details__claimant-field"]}>
                  {label}
                </span>
                <span className={modalStyles["return-details__claimant-val"]}>
                  {value || "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {item.returnedAt && (
          <div className={modalStyles["return-details__section"]}>
            <p className={modalStyles["return-details__section-label"]}>Collected On</p>
            <div className={modalStyles["return-details__date"]}>
              <FaCalendarAlt />
              <span>
                {new Date(item.returnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={modalStyles["return-modal__footer"]}>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export const ReturnModal = ({ foundItem, onConfirm, onClose, isLoading }) => {
  const [selectedLostItem, setSelectedLostItem] = useState(null);
  const {
    data: matchedLostItems = [],
    isLoading: loadingMatches,
    isError,
  } = useQuery({
    queryKey: ["matchedLostItems", foundItem._id],
    queryFn: async () => {
      const r = await getMatchedLostItemsForFoundItem(foundItem._id);
      return r.data.data || [];
    },
    staleTime: 0,
  });

  return (
    <div className={modalStyles["return-modal-overlay"]} onClick={onClose}>
      <div
        className={modalStyles["return-modal"]}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-modal-title"
      >
        <div className={modalStyles["return-modal__header"]}>
          <div className={modalStyles["return-modal__title-group"]}>
            <FaExchangeAlt className={modalStyles["return-modal__icon"]} />
            <h3 id="return-modal-title">Return Item</h3>
          </div>
          <button
            className={modalStyles["return-modal__close"]}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        <div className={modalStyles["return-modal__found-summary"]}>
          <p className={modalStyles["return-modal__label"]}>Returning found item:</p>
          <p className={modalStyles["return-modal__item-name"]}>
            <strong>{foundItem.name}</strong> - {foundItem.color} -{" "}
            {foundItem.placeFound}
          </p>
        </div>
        <div className={modalStyles["return-modal__body"]}>
          <p className={modalStyles["return-modal__instruction"]}>
            Select the claimant's lost item report:
          </p>
          {loadingMatches ? (
            <div className={modalStyles["return-modal__loading"]}>
              <FaSpinner className={buttonStyles["spin-icon"]} />
              <span>Loading matched items...</span>
            </div>
          ) : isError ? (
            <div className={modalStyles["return-modal__error"]}>
              Failed to load matched items. Please try again.
            </div>
          ) : matchedLostItems.length === 0 ? (
            <div className={modalStyles["return-modal__empty"]}>
              <FaInbox />
              <p>No matched lost items found for this item.</p>
            </div>
          ) : (
            <ul className={modalStyles["return-modal__list"]} role="listbox">
              {matchedLostItems.map((lostItem) => (
                <li
                  key={lostItem._id}
                  role="option"
                  aria-selected={selectedLostItem?._id === lostItem._id}
                  className={`${modalStyles["return-modal__list-item"]} ${selectedLostItem?._id === lostItem._id ? modalStyles["return-modal__list-item--selected"] : ""}`}
                  onClick={() => setSelectedLostItem(lostItem)}
                >
                  <div className={modalStyles["return-modal__list-item-check"]}>
                    {selectedLostItem?._id === lostItem._id && <FaCheck />}
                  </div>
                  <div className={modalStyles["return-modal__list-item-info"]}>
                    <div className={modalStyles["return-modal__list-item-name"]}>
                      {lostItem.name}
                    </div>
                    <div className={modalStyles["return-modal__list-item-meta"]}>
                      <span>
                        <FaPalette /> {lostItem.color}
                      </span>
                      <span>
                        <FaMapMarkerAlt /> {lostItem.placeLost}
                      </span>
                      <span>
                        <FaCalendarAlt />{" "}
                        {new Date(lostItem.dateLost).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={modalStyles["return-modal__list-item-user"]}>
                      <div>
                        <FaUser /> {lostItem.userId?.name || "Unknown"}
                      </div>
                      {lostItem.userId?.email && (
                        <div>
                          <FaEnvelope /> {lostItem.userId.email}
                        </div>
                      )}
                      {lostItem.userId?.enrollmentNumber && (
                        <div>
                          <FaIdCard /> {lostItem.userId.enrollmentNumber}
                        </div>
                      )}
                      {lostItem.userId?.semester && (
                        <div>
                          <FaClock /> Semester {lostItem.userId.semester}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
            className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
            onClick={() =>
              selectedLostItem && onConfirm(foundItem._id, selectedLostItem)
            }
            disabled={!selectedLostItem || isLoading || loadingMatches}
          >
            {isLoading ? (
              <>
                <FaSpinner className={buttonStyles["spin-icon"]} /> Processing...
              </>
            ) : (
              <>
                <FaCheck /> Confirm Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SingleMatchCard = ({ match }) => {
  const [showImg, setShowImg] = useState(false);
  const lostImage = match.lostItem?.images?.[0];
  return (
    <div
      className={`${studentStyles["item-card"]} ${managementStyles["match-card--single"]}`}
    >
      <div className={managementStyles["match-card__header"]}>
        <span
          className={`${managementStyles["match-card__badge"]} ${managementStyles["match-card__badge--single"]}`}
        >
          <FaLink /> 1 Match Found
        </span>
        <span className={managementStyles["match-card__similarity"]}>
          <FaLink />
          {(match.similarity ?? 0).toFixed(0)}% match
        </span>
      </div>
      <div className={managementStyles["match-card__grid"]}>
        <div
          className={`${managementStyles["match-card__side"]} ${managementStyles["match-card__side--found"]}`}
        >
          <p className={managementStyles["match-card__side-label"]}>Found Item</p>
          <h4 className={managementStyles["match-card__item-name"]}>
            {match.foundItem.name}
          </h4>
          <div className={studentStyles["item-meta"]}>
            <span>
              <FaPalette /> {match.foundItem.color}
            </span>
            <span>
              <FaMapMarkerAlt /> {match.foundItem.placeFound}
            </span>
            <span>
              <FaCalendarAlt /> {new Date(match.foundItem.dateFound).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className={managementStyles["match-card__connector"]}>
          <FaExchangeAlt />
        </div>
        <div
          className={`${managementStyles["match-card__side"]} ${managementStyles["match-card__side--lost"]}`}
        >
          <p className={managementStyles["match-card__side-label"]}>Lost Item</p>
          <h4 className={managementStyles["match-card__item-name"]}>
            {match.lostItem.name}
          </h4>
          <div className={studentStyles["item-meta"]}>
            <span>
              <FaPalette /> {match.lostItem.color}
            </span>
            <span>
              <FaMapMarkerAlt /> {match.lostItem.placeLost}
            </span>
            <span>
              <FaCalendarAlt /> {new Date(match.lostItem.dateLost).toLocaleDateString()}
            </span>
          </div>
          {lostImage && (
            <div className={managementStyles["match-image-toggle"]}>
              <button
                className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--outline"]}`}
                onClick={() => setShowImg((p) => !p)}
              >
                {showImg ? "Hide Image" : "View Image"}
              </button>
              {showImg && (
                <img
                  src={lostImage.url}
                  alt="Lost item"
                  className={managementStyles["match-image-preview"]}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <div className={managementStyles["match-card__claimant"]}>
        <FaUser />
        <span className={managementStyles["match-card__claimant-name"]}>
          {match.user?.name ?? "Unknown"}
        </span>
        <span className={managementStyles["match-card__claimant-sep"]}>|</span>
        <FaEnvelope />
        <span className={managementStyles["match-card__claimant-email"]}>
          {match.user?.email}
        </span>
      </div>
    </div>
  );
};

export const MultiMatchSummaryCard = ({ itemName, matchCount, matches }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`${studentStyles["item-card"]} ${managementStyles["match-card--multi"]}`}
    >
      <div className={managementStyles["match-card__header"]}>
        <div className={managementStyles["match-card__title-group"]}>
          <FaBox className={managementStyles["match-card__item-icon"]} />
          <span className={managementStyles["match-card__item-title"]}>
            {itemName}
          </span>
        </div>
        <span
          className={`${managementStyles["match-card__badge"]} ${managementStyles["match-card__badge--multi"]}`}
        >
          <FaLink /> {matchCount} Matches
        </span>
      </div>
      <div className={managementStyles["match-card__meta-row"]}>
        <span className="match-card__dept">
          <FaMapMarkerAlt /> {matches[0]?.foundItem?.block}
        </span>
        <span className="match-card__avg-sim">
          Avg similarity:{" "}
          <strong>
            {(
              matches.reduce((s, m) => s + (m.similarity ?? 0), 0) / matchCount
            ).toFixed(0)}
            %
          </strong>
        </span>
      </div>
      <button
        className={managementStyles["match-card__toggle"]}
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Show all matches"}
        <span
          className={`${managementStyles["match-card__chevron"]} ${expanded ? managementStyles["match-card__chevron--up"] : ""}`}
        >
          v
        </span>
      </button>
      {expanded && (
        <ul className={managementStyles["match-card__expanded-list"]}>
          {matches.map((match, idx) => {
            const lostImage = match.lostItem?.images?.[0];
            return (
              <li
                key={match.lostItem.id}
                className={managementStyles["match-card__expanded-item"]}
              >
                <div className={managementStyles["match-card__expanded-rank"]}>
                  #{idx + 1}
                </div>
                <div className={managementStyles["match-card__expanded-info"]}>
                  <div className={managementStyles["match-card__expanded-name"]}>
                    {match.lostItem.name}
                    <span className={managementStyles["match-card__expanded-sim"]}>
                      {(match.similarity ?? 0).toFixed(0)}% match
                    </span>
                  </div>
                  <div className={studentStyles["item-meta"]}>
                    <span>
                      <FaPalette /> {match.lostItem.color}
                    </span>
                    <span>
                      <FaMapMarkerAlt /> {match.lostItem.placeLost}
                    </span>
                  </div>
                  <div className={managementStyles["match-card__expanded-user"]}>
                    <FaUser /> {match.user?.name ?? "Unknown"} | <FaEnvelope />{" "}
                    {match.user?.email ?? "No Email"}
                  </div>
                  {lostImage && (
                    <a
                      href={lostImage.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--outline"]} ${managementStyles["match-image-link"]}`}
                    >
                      View Image
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const FoundItemCard = ({
  item,
  currentUser,
  onMarkReturned,
  onUpdateStatus,
  onMarkCollectedOffline,
  isUpdating,
  onViewDetails,
  onViewOfflineDetails,
}) => {
  const statusLower = item.status.toLowerCase();
  const statusClass = statusLower.replace(/\s+/g, "-");
  const isActiveItem = statusLower === "found" || statusLower === "matched";
  const isOldItem =
    Date.now() - new Date(item.dateFound).getTime() > 7 * 24 * 60 * 60 * 1000;
  const isReturnedItem = statusLower === "returned";
  const isOfflineCollectedItem = statusLower === "offline returned";

  return (
    <div className={studentStyles["item-card"]}>
      <div className={studentStyles["item-header"]}>
        <div className={studentStyles["item-info"]}>
          <h4>{item.name}</h4>

          {item.handledBy === "security" && item.originalBlock && (
            <div className={managementStyles["transferred-badge"]}>
              Transferred from Block {item.originalBlock}
            </div>
          )}

          {item.recoveryMode === "enquiry_recovered" && (
            <div className={managementStyles["transferred-badge"]}>
              Enquiry Recovered
            </div>
          )}

          <div className={studentStyles["item-meta"]}>
            <span>
              <FaPalette /> {item.color}
            </span>
            <span>
              <FaCalendarAlt /> {new Date(item.dateFound).toLocaleDateString()}
            </span>
            <span>
              <FaMapMarkerAlt /> {item.placeFound}
            </span>
          </div>

          {(statusLower === "found" || statusLower === "matched") &&
            item.matchedLostItemIds?.length > 0 && (
              <div className={studentStyles["item-match-badge"]}>
                <FaLink /> {item.matchedLostItemIds.length} match
                {item.matchedLostItemIds.length > 1 ? "es" : ""} found
              </div>
            )}
        </div>

        <span
          className={`${studentStyles.status} ${studentStyles[`status--${statusClass}`]}`}
        >
          {item.status}
        </span>
      </div>
      {item.description && (
        <p className={studentStyles["item-description"]}>{item.description}</p>
      )}

      <div className={studentStyles["item-actions"]}>
        {isActiveItem && (
          <>
            {!isOldItem && (
              <button
                className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--primary"]}`}
                onClick={() => onMarkReturned(item)}
                disabled={isUpdating}
              >
                <FaCheck /> Mark Returned
              </button>
            )}

            <button
              className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--outline"]}`}
              onClick={() => onMarkCollectedOffline(item)}
              disabled={isUpdating}
            >
              <FaWalking /> Collected Offline
            </button>

            {currentUser?.role === "security" && (
              <button
                className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--outline"]}`}
                onClick={() => onUpdateStatus(item._id, "Unclaimed")}
                disabled={isUpdating}
              >
                <FaTimes /> Mark Unclaimed
              </button>
            )}
          </>
        )}

        {isReturnedItem && (
          <button
            className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--outline"]}`}
            onClick={() => onViewDetails(item)}
          >
            <FaInfoCircle /> View Return Details
          </button>
        )}

        {isOfflineCollectedItem && (
          <button
            className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--outline"]}`}
            onClick={() => onViewOfflineDetails(item)}
          >
            <FaInfoCircle /> View Collection Details
          </button>
        )}
      </div>
    </div>
  );
};

