import React from "react";
import { Navigate } from "react-router-dom";

const ProfileProtectedRoute = ({ children, currentUser }) => {
  // not logged in
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // profile incomplete
  if (!currentUser.profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
  }

  // allow access
  return children;
};

export default ProfileProtectedRoute;