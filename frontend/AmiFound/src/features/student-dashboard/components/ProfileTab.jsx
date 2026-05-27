import React from "react";
import styles from "../StudentDashboard.module.css";
import ProfileField from "./ProfileField";

const ProfileTab = ({ currentUser, joinDate }) => (
  <div className={styles["profile-info"]}>
    <ProfileField label="Name" value={currentUser?.name} />
    <ProfileField label="Email" value={currentUser?.email} />
    <ProfileField
      label="Enrollment Number"
      value={currentUser?.enrollmentNumber}
    />
    <ProfileField label="Phone Number" value={currentUser?.phoneNumber} />
    <ProfileField
      label="Semester"
      value={
        currentUser?.semester ? `Semester ${currentUser.semester}` : "N/A"
      }
    />
    <ProfileField label="Join Date" value={joinDate} />
  </div>
);

export default React.memo(ProfileTab);
