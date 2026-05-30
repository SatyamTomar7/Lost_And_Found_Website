import ManagementView from "../ManagementView";
import OperationalView from "../OperationalView";

export default function ManagementDashboard({
  currentUser,
  setLoading,
  showMessage,
}) {
  const role = currentUser?.role;

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
    return (
      <OperationalView
        currentUser={currentUser}
        setLoading={setLoading}
        showMessage={showMessage}
        onViewDashboard={null}
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
