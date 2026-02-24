import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { FaSignInAlt } from "react-icons/fa";
import { adminLogin } from "../services/authService";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const adminLoginSchema = z.object({
  department: z.string().min(1, "Please select a department"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const getAdminLoginSchema = () => adminLoginSchema;

// ─── Component ───────────────────────────────────────────────────────────────
const AdminAuthPage = ({ setCurrentAdmin, setLoading, showMessage }) => {
  const navigate = useNavigate();

  const resolver = useMemo(
    () => zodResolver(getAdminLoginSchema()),
    []
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    defaultValues: {
      department: "",
      username: "",
      password: "",
    },
  });

  // ── TanStack Query Mutation ──────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: ({ department, username, password }) =>
      adminLogin(department, username, password),
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setCurrentAdmin(result.data.user);
        localStorage.setItem("authToken", result.data.token);
        showMessage("Admin login successful!", "success");
        setTimeout(() => navigate("/admin-dashboard"), 1000);
      } else {
        setError("root.serverError", {
          type: "manual",
          message: result.message || "Invalid credentials",
        });
      }
    },
    onError: () => {
      showMessage("Error connecting to server", "error");
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const onSubmit = (data) => {
    loginMutation.mutate(data);
  };

  const isDisabled = isSubmitting || loginMutation.isPending;

  return (
    /* 1. Landmark Change: div ko main mein badla */
    <main className="page active" id="main-content">
      <div className="auth-container">
        <div className="auth-card">
          {/* 2. Semantic Header for the Card */}
          <header className="auth-header">
            <h2>Admin Login</h2>
            <p>Department administrator access</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
            {/* Department Selection */}
            <div className="form-group">
              <label htmlFor="admin-department" className="form-label">
                Department
              </label>
              <select
                id="admin-department"
                className={`form-control ${errors.department ? "is-invalid" : ""}`}
                disabled={isDisabled}
                {...register("department")}
                aria-invalid={errors.department ? "true" : "false"}
              >
                <option value="">Select Department</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
                <option value="Block D">Block D</option>
                <option value="Block E">Block E</option>
              </select>
              {errors.department && (
                <div className="error-message" role="alert">
                  {errors.department.message}
                </div>
              )}
            </div>

            {/* Username Field */}
            <div className="form-group">
              <label htmlFor="admin-username" className="form-label">
                Username
              </label>
              <input
                type="text"
                id="admin-username"
                className={`form-control ${errors.username ? "is-invalid" : ""}`}
                placeholder="admin_a"
                autoComplete="username"
                disabled={isDisabled}
                {...register("username")}
                aria-invalid={errors.username ? "true" : "false"}
              />
              {errors.username && (
                <div className="error-message" role="alert">
                  {errors.username.message}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="admin-password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="admin-password"
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                placeholder="Enter admin password"
                autoComplete="current-password"
                disabled={isDisabled}
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
              />

              {(errors.password || errors.root?.serverError) && (
                <div className="error-message" role="alert">
                  {errors.password?.message || errors.root?.serverError?.message}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full-width"
              disabled={isDisabled}
              aria-busy={loginMutation.isPending}
            >
              <FaSignInAlt aria-hidden="true" style={{ marginRight: '8px' }} />
              <span>{loginMutation.isPending ? "Logging in…" : "Admin Login"}</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default React.memo(AdminAuthPage);