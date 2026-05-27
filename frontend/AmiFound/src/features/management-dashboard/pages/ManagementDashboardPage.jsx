import { useState } from "react";
import ManagementView from "../ManagementView";
import OperationalView from "../OperationalView";

export default function ManagementDashboard({
  currentUser,
  setLoading,
  showMessage,
}) {
  const role = currentUser?.role;
  const [securityMode, setSecurityMode] = useState("operational");

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
    if (securityMode === "management") {
      return (
        <ManagementView
          role="security"
          onBackToOps={() => setSecurityMode("operational")}
        />
      );
    }

    return (
      <OperationalView
        currentUser={currentUser}
        setLoading={setLoading}
        showMessage={showMessage}
        onViewDashboard={() => setSecurityMode("management")}
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
