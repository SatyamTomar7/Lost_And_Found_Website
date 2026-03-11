import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("authToken");
  
  if (!token) {
    // If no token, send them to login and replace history
    return <Navigate to="/" replace />; 
  }
  
  return children;
};

export default ProtectedRoute;