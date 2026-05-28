import React from "react";
import { FaPaperPlane, FaPlusCircle } from "react-icons/fa";
import authStyles from "../../auth/Auth.module.css";
import buttonStyles from "../../../shared/ui/Button.module.css";
import styles from "../StudentDashboard.module.css";
import {
  COLORS,
  ITEM_CONDITIONS,
  ITEM_NAME,
  getLocationsByRole,
} from "../../../shared/constants/itemConstants";

const ReportLostTab = ({
  register,
  errors,
  handleSubmit,
  handleFormSubmit,
  isFormDisabled,
  currentUser,
  submitLostItemMutation,
  today,
  minSelectableDate,
  descriptionLength,
}) => (
  <div
    className={`${styles["dashboard-tab"]} ${styles.active}`}
    role="tabpanel"
    id="report-lost-panel"
    aria-labelledby="report-lost"
  >
    <div className={styles["tab-content"]}>
      <h2>
        <FaPlusCircle /> Report Lost Item
      </h2>

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={styles["dashboard-form"]}
      >
        <div className={authStyles["form-row"]}>
          <div className={authStyles["form-group"]}>
            <label htmlFor="name" className={authStyles["form-label"]}>
              Item Name *
            </label>
            <select
              id="name"
              {...register("name")}
              className={`${authStyles["form-control"]} ${errors.name ? authStyles["is-invalid"] : ""}`}
              disabled={isFormDisabled}
            >
              <option value="">Select Name</option>
              {ITEM_NAME.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {errors.name && (
              <div className={authStyles["error-message"]}>
                {errors.name.message}
              </div>
            )}
          </div>

          <div className={authStyles["form-group"]}>
            <label htmlFor="itemColor" className={authStyles["form-label"]}>
              Color *
            </label>
            <select
              id="itemColor"
              {...register("color")}
              className={`${authStyles["form-control"]} ${errors.color ? authStyles["is-invalid"] : ""}`}
              disabled={isFormDisabled}
              aria-invalid={errors.color ? "true" : "false"}
            >
              <option value="">Select a color</option>
              {COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            {errors.color && (
              <div className={authStyles["error-message"]} role="alert">
                {errors.color.message}
              </div>
            )}
          </div>
        </div>

        <div className={authStyles["form-row"]}>
          <div className={authStyles["form-group"]}>
            <label className={authStyles["form-label"]}>Item Condition *</label>
            <div
              style={{
                display: "flex",
                gap: "20px",
                marginTop: "10px",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <input
                  type="radio"
                  value={ITEM_CONDITIONS.NEW}
                  {...register("condition")}
                  disabled={isFormDisabled}
                  style={{ width: "16px", height: "16px" }}
                />
                New
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <input
                  type="radio"
                  value={ITEM_CONDITIONS.USED}
                  {...register("condition")}
                  disabled={isFormDisabled}
                  style={{ width: "16px", height: "16px" }}
                />
                Used
              </label>
            </div>
            {errors.condition && (
              <div
                className={authStyles["error-message"]}
                style={{ marginTop: "5px" }}
              >
                {errors.condition.message}
              </div>
            )}
          </div>
          <div className={authStyles["form-group"]}>
            <label htmlFor="brand" className={authStyles["form-label"]}>
              Brand (optional)
            </label>
            <input
              id="brand"
              {...register("brand")}
              className={authStyles["form-control"]}
              disabled={isFormDisabled}
            />
          </div>
        </div>

        <div className={authStyles["form-row"]}>
          <div className={authStyles["form-group"]}>
            <label htmlFor="placeLost" className={authStyles["form-label"]}>
              Place Lost *
            </label>
            <select
              id="placeLost"
              {...register("placeLost")}
              className={`${authStyles["form-control"]} ${errors.placeLost ? authStyles["is-invalid"] : ""}`}
              disabled={isFormDisabled}
            >
              <option value="">Select Location</option>
              {getLocationsByRole(currentUser.role, currentUser.block).map(
                (location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ),
              )}
            </select>
            {errors.placeLost && (
              <div className={authStyles["error-message"]}>
                {errors.placeLost.message}
              </div>
            )}
          </div>
          <div className={authStyles["form-group"]}>
            <label htmlFor="dateLost" className={authStyles["form-label"]}>
              Date Lost *
            </label>
            <input
              id="dateLost"
              type="date"
              min={minSelectableDate}
              max={today}
              {...register("dateLost")}
              className={`${authStyles["form-control"]} ${errors.dateLost ? authStyles["is-invalid"] : ""}`}
              disabled={isFormDisabled}
            />
            {errors.dateLost && (
              <div className={authStyles["error-message"]}>
                {errors.dateLost.message}
              </div>
            )}
          </div>
        </div>

        <div className={authStyles["form-group"]}>
          <label htmlFor="description" className={authStyles["form-label"]}>
            Description (optional)
          </label>
          <textarea
            id="description"
            {...register("description")}
            className={authStyles["form-control"]}
            rows={3}
            maxLength={500}
            disabled={isFormDisabled}
          />
          <div className={authStyles["form-help"]}>
            Maximum 500 characters. {descriptionLength}/500
          </div>
          {errors.description && (
            <div className={authStyles["error-message"]}>
              {errors.description.message}
            </div>
          )}
        </div>

        <div className={authStyles["form-group"]}>
          <label htmlFor="photo" className={authStyles["form-label"]}>
            Photo (optional)
          </label>
          <input
            id="photo"
            type="file"
            {...register("photo")}
            className={authStyles["form-control"]}
            accept="image/*"
            disabled={isFormDisabled}
          />
        </div>

        <button
          type="submit"
          className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--full-width"]}`}
          disabled={isFormDisabled}
        >
          <FaPaperPlane />
          {submitLostItemMutation.isPending ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  </div>
);

export default React.memo(ReportLostTab);
