import { useState } from "react";
import ManagementView from "../ManagementView";
import OperationalView from "../OperationalView";

export default function ManagementDashboard({
  currentUser,
  setLoading,
  showMessage,
}) {
  const role = currentUser?.role;
  const [securityView, setSecurityView] = useState("operations");

  if (role === "director") {
    return <ManagementView role="director" onBackToOps={null} />;
  }

  if (role === "admin") {
    return (
      <OperationalView
        currentUser={currentUser}
        setLoading={setLoading}
        showMessage={showMessage}
        onViewDashboard={null}
      />
    );
  }

  if (role === "security") {
    if (securityView === "dashboard") {
      return (
        <ManagementView
          role="security"
          onBackToOps={() => setSecurityView("operations")}
        />
      );
    }

    return (
      <OperationalView
        currentUser={currentUser}
        setLoading={setLoading}
        showMessage={showMessage}
        onViewDashboard={() => setSecurityView("dashboard")}
      />
    );
  }

  return (
    <div
      className="page active"
      style={{ padding: "2rem", textAlign: "center" }}
    >
      <p>Unauthorized role: {role}</p>
    </div>
  );
}
