import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuArrowRight,
  LuLayoutDashboard,
  LuRefreshCw,
  LuSave,
  LuShieldCheck,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import buttonStyles from "../../../shared/ui/Button.module.css";
import styles from "../SuperAdminDepartment.module.css";
import {
  getAdminAssignmentHistory,
  getAdminAssignments,
  updateAdminAssignments,
} from "../services/adminManagementService";

const BLOCKS = ["A", "B", "C", "D", "E"];

export default function SuperAdminDepartmentPage({ showMessage }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const assignmentsQuery = useQuery({
    queryKey: ["super-admin-assignments"],
    queryFn: getAdminAssignments,
    select: (response) => response.data,
  });
  const historyQuery = useQuery({
    queryKey: ["super-admin-assignment-history"],
    queryFn: getAdminAssignmentHistory,
    select: (response) => response.data.history,
  });

  useEffect(() => {
    if (assignmentsQuery.data?.admins) {
      setAssignments(
        assignmentsQuery.data.admins.map((admin) => ({
          adminId: admin.id,
          block: admin.block,
        })),
      );
      setShowConfirmation(false);
    }
  }, [assignmentsQuery.data]);

  const changes = useMemo(() => {
    const originalById = new Map(
      (assignmentsQuery.data?.admins || []).map((admin) => [admin.id, admin]),
    );

    return assignments
      .map((assignment) => {
        const admin = originalById.get(assignment.adminId);
        return admin && admin.block !== assignment.block
          ? { ...admin, oldBlock: admin.block, newBlock: assignment.block }
          : null;
      })
      .filter(Boolean);
  }, [assignments, assignmentsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateAdminAssignments,
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["super-admin-assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["super-admin-assignment-history"],
        }),
      ]);
      showMessage(response.message, "success");
    },
    onError: (error) => {
      setShowConfirmation(false);
      showMessage(error.message, "error");
    },
  });

  const setBlock = (adminId, block) => {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.adminId === adminId ? { ...assignment, block } : assignment,
      ),
    );
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["super-admin-assignments"] });
    queryClient.invalidateQueries({
      queryKey: ["super-admin-assignment-history"],
    });
  };

  const confirmSave = () => {
    saveMutation.mutate({
      version: assignmentsQuery.data.version,
      assignments,
    });
  };

  const assignedBlocks = new Set(
    assignments.map((assignment) => assignment.block),
  );

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Super Admin</p>
          <h1>Admin Department Assignments</h1>
          <p>
            Assign each active admin to one block. Changes are saved as one
            verified batch.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]} ${buttonStyles["btn--sm"]}`}
            onClick={() => navigate("/super-admin-dashboard")}
          >
            <LuLayoutDashboard size={15} /> View Dashboard
          </button>
          <button
            type="button"
            className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]} ${buttonStyles["btn--sm"]}`}
            onClick={refresh}
            disabled={assignmentsQuery.isFetching || saveMutation.isPending}
          >
            <LuRefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {assignmentsQuery.isLoading ? (
        <p className={styles.status}>Loading assignments...</p>
      ) : assignmentsQuery.isError ? (
        <p className={styles.error}>{assignmentsQuery.error.message}</p>
      ) : (
        <>
          <section
            className={styles.assignmentSection}
            aria-label="Admin assignments"
          >
            <div className={styles.sectionHeading}>
              <h2>Current Assignment Plan</h2>
              <span>
                {assignments.length} active admin
                {assignments.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Email</th>
                    <th>Current block</th>
                    <th>New block</th>
                  </tr>
                </thead>
                <tbody>
                  {(assignmentsQuery.data?.admins || []).map((admin) => {
                    const selectedBlock = assignments.find(
                      (assignment) => assignment.adminId === admin.id,
                    )?.block;
                    return (
                      <tr key={admin.id}>
                        <td>{admin.name}</td>
                        <td className={styles.email}>{admin.email}</td>
                        <td>
                          <span className={styles.block}>{admin.block}</span>
                        </td>
                        <td>
                          <select
                            value={selectedBlock || ""}
                            onChange={(event) =>
                              setBlock(admin.id, event.target.value)
                            }
                            disabled={saveMutation.isPending}
                            aria-label={`New block for ${admin.name}`}
                          >
                            {BLOCKS.map((block) => (
                              <option key={block} value={block}>
                                {block}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {assignedBlocks.size !== assignments.length && (
              <p className={styles.error}>
                Each block can have only one admin. Resolve duplicate selections
                before saving.
              </p>
            )}
          </section>

          <section
            className={styles.actions}
            aria-label="Save assignment changes"
          >
            <span>
              {changes.length
                ? `${changes.length} change${changes.length === 1 ? "" : "s"} pending`
                : "No changes pending"}
            </span>
            <button
              type="button"
              className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
              onClick={() => setShowConfirmation(true)}
              disabled={
                !changes.length ||
                assignedBlocks.size !== assignments.length ||
                saveMutation.isPending
              }
            >
              <LuSave size={16} /> Review changes
            </button>
          </section>

          {showConfirmation && (
            <section className={styles.confirmation} aria-live="polite">
              <div className={styles.sectionHeading}>
                <h2>Confirm Department Changes</h2>
                <LuShieldCheck size={20} aria-hidden="true" />
              </div>
              <ul className={styles.changeList}>
                {changes.map((change) => (
                  <li key={change.id}>
                    <span>{change.name}</span>
                    <span>
                      Block {change.oldBlock} <LuArrowRight size={14} /> Block{" "}
                      {change.newBlock}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={`${buttonStyles.btn} ${buttonStyles["btn--ghost"]}`}
                  onClick={() => setShowConfirmation(false)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
                  onClick={confirmSave}
                  disabled={saveMutation.isPending}
                >
                  <LuSave size={16} />{" "}
                  {saveMutation.isPending ? "Saving..." : "Confirm changes"}
                </button>
              </div>
            </section>
          )}

          <section
            className={styles.historySection}
            aria-label="Assignment history"
          >
            <div className={styles.sectionHeading}>
              <h2>Recent Assignment History</h2>
            </div>
            {historyQuery.isLoading ? (
              <p className={styles.status}>Loading history...</p>
            ) : null}
            {historyQuery.isError ? (
              <p className={styles.error}>{historyQuery.error.message}</p>
            ) : null}
            {!historyQuery.isLoading &&
            !historyQuery.isError &&
            !(historyQuery.data || []).length ? (
              <p className={styles.status}>
                No department changes have been recorded.
              </p>
            ) : null}
            {(historyQuery.data || []).map((batch) => (
              <div className={styles.historyRow} key={batch._id}>
                <div>
                  <strong>Batch #{batch.batchNumber}</strong>
                  <span>{new Date(batch.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  {batch.changes.map((change) => (
                    <p key={change._id}>
                      {change.adminId?.name || "Admin"}: {change.oldBlock} to{" "}
                      {change.newBlock}
                    </p>
                  ))}
                </div>
                <span>By {batch.performedBy?.name || "Super Admin"}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
