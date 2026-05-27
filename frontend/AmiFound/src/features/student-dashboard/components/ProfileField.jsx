import React from "react";
import styles from "../StudentDashboard.module.css";

const ProfileField = React.memo(({ label, value }) => (
  <div className={styles["profile-field"]}>
    <label>{label}:</label>
    <span>{value}</span>
  </div>
));

ProfileField.displayName = "ProfileField";

export default ProfileField;
