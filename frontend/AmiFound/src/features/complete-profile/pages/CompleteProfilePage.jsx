import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  completeProfile,
  fetchCurrentUser,
} from "../../auth/services/authService.js";
import {
  BRANCHES,
  COURSES,
  YEAR_OPTIONS,
  SECTION_OPTIONS,
  BLOCK_OPTIONS,
} from "../../../shared/constants/itemConstants.js";
import { applyBackendFormErrors } from "../../../shared/lib/formErrorMapper.js";
import styles from "../CompleteProfile.module.css";
import homeStyles from "../../home/HomePage.module.css";

const profileSchema = z.object({
  enrollmentNumber: z
    .string()
    .min(1, "Enrollment number is required")
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters allowed"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"),
  course: z.string().min(1, "Course is required"),
  branch: z.string().min(1, "Branch is required"),
  year: z.string().min(1, "Year is required"),
  semester: z.string().min(1, "Semester is required"),
  section: z.string().min(1, "Section is required"),
  block: z.enum(["A", "B", "C", "D", "E"]),
});

const getSemestersForYear = (year) => {
  const map = { 1: ["1", "2"], 2: ["3", "4"], 3: ["5", "6"], 4: ["7", "8"] };
  return map[year] || ["1", "2", "3", "4", "5", "6", "7", "8"];
};

const Field = ({ label, error, required, children }) => (
  <div className={styles["cp-field"]}>
    <label className={styles["cp-label"]}>
      {label}
      {required && <span className={styles["cp-required"]}> *</span>}
    </label>
    {children}
    {error && <p className={styles["cp-error-text"]}>{error}</p>}
  </div>
);

const ConfirmModal = ({ data, onConfirm, onCancel, isLoading, error }) => {
  const rows = [
    ["Enrollment No.", data.enrollmentNumber],
    ["Phone", data.phoneNumber],
    ["Course", data.course],
    ["Branch", data.branch],
    ["Year", `Year ${data.year}`],
    ["Semester", `Semester ${data.semester}`],
    ["Section", `Section ${data.section}`],
    data.block ? ["Block", data.block] : null,
  ].filter(Boolean);

  return (
    <div className={styles["cp-overlay"]}>
      <div className={styles["cp-modal"]}>
        <div className={styles["cp-modal-header"]}>
          <div className={styles["cp-modal-icon"]}>✦</div>
          <h3 className={styles["cp-modal-title"]}>Confirm Your Details</h3>
          <p className={styles["cp-modal-subtitle"]}>
            Please review carefully - this information will be linked to your
            account.
          </p>
        </div>

        <div className={styles["cp-modal-body"]}>
          {rows.map(([key, val]) => (
            <div key={key} className={styles["cp-modal-row"]}>
              <span className={styles["cp-modal-key"]}>{key}</span>
              <span className={styles["cp-modal-val"]}>{val}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className={styles["cp-modal-error"]}>
            <span>!</span> {error}
          </div>
        )}

        <div className={styles["cp-modal-footer"]}>
          <button
            onClick={onCancel}
            className={`${styles["cp-btn"]} ${styles["cp-btn-secondary"]}`}
            disabled={isLoading}
          >
            Back To Edit
          </button>
          <button
            onClick={onConfirm}
            className={`${styles["cp-btn"]} ${styles["cp-btn-primary"]}${isLoading ? ` ${styles["cp-btn-loading"]}` : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles["cp-spinner"]} />
                Saving...
              </>
            ) : (
              "Confirm & Submit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const CompleteProfile = ({ setCurrentUser }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      enrollmentNumber: "",
      phoneNumber: "",
      course: "",
      branch: "",
      year: "",
      semester: "",
      section: "",
      block: "",
    },
  });

  const mutation = useMutation({
    mutationFn: completeProfile,
    onSuccess: async () => {
      const refreshedUser = await fetchCurrentUser().catch(() => null);

      if (refreshedUser) {
        setCurrentUser(refreshedUser);
      } else {
        setCurrentUser((prev) => ({
          ...prev,
          ...pendingData,
          profileCompleted: true,
        }));
      }

      navigate("/student-dashboard", { replace: true });
    },
    onError: (error) => {
      setShowModal(false);
      applyBackendFormErrors(setError, error, {
        defaultField: "root",
      });
    },
  });

  const onSubmit = (data) => {
    setPendingData(data);
    setShowModal(true);
  };

  const handleConfirm = () => mutation.mutate(pendingData);

  const selectedYear = watch("year");
  useEffect(() => {
    setValue("semester", "");
  }, [selectedYear, setValue]);

  const semesterOptions = selectedYear
    ? getSemestersForYear(selectedYear)
    : ["1", "2", "3", "4", "5", "6", "7", "8"];

  return (
    <div className="page active">
      <section className={`${homeStyles.hero} ${styles["cp-hero"]}`}>
        <div className="container">
          <div className={styles["cp-page"]}>
            <div className={styles["cp-card"]}>
              <div className={styles["cp-card-header"]}>
                <div className={styles["cp-badge"]}>AMIFOUND</div>
                <h1 className={styles["cp-title"]}>Complete Your Profile</h1>
                <p className={styles["cp-subtitle"]}>
                  Fill in your academic details to get started with AmiFound.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles["cp-form"]}>
                <div className={`${styles["cp-grid"]} ${styles["cp-grid--2"]}`}>
                  <Field
                    label="Enrollment Number"
                    error={errors.enrollmentNumber?.message}
                    required
                  >
                    <input
                      className={`${styles["cp-input"]}${errors.enrollmentNumber ? ` ${styles["cp-input--error"]}` : ""}`}
                      placeholder="e.g. A12345678090"
                      {...register("enrollmentNumber")}
                    />
                  </Field>

                  <Field
                    label="Phone Number"
                    error={errors.phoneNumber?.message}
                    required
                  >
                    <input
                      type="tel"
                      inputMode="numeric"
                      className={`${styles["cp-input"]}${errors.phoneNumber ? ` ${styles["cp-input--error"]}` : ""}`}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      {...register("phoneNumber")}
                    />
                  </Field>
                </div>

                <div className={`${styles["cp-grid"]} ${styles["cp-grid--2"]}`}>
                  <Field label="Course" error={errors.course?.message} required>
                    <select
                      className={`${styles["cp-select"]}${errors.course ? ` ${styles["cp-input--error"]}` : ""}`}
                      {...register("course")}
                    >
                      <option value="">Select Course</option>
                      {COURSES.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Branch" error={errors.branch?.message} required>
                    <select
                      className={`${styles["cp-select"]}${errors.branch ? ` ${styles["cp-input--error"]}` : ""}`}
                      {...register("branch")}
                    >
                      <option value="">Select Branch</option>
                      {BRANCHES.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className={`${styles["cp-grid"]} ${styles["cp-grid--3"]}`}>
                  <Field label="Year" error={errors.year?.message} required>
                    <select
                      className={`${styles["cp-select"]}${errors.year ? ` ${styles["cp-input--error"]}` : ""}`}
                      {...register("year")}
                    >
                      <option value="">Year</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Semester" error={errors.semester?.message} required>
                    <select
                      className={`${styles["cp-select"]}${errors.semester ? ` ${styles["cp-input--error"]}` : ""}`}
                      {...register("semester")}
                    >
                      <option value="">Semester</option>
                      {semesterOptions.map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Section" error={errors.section?.message} required>
                    <select
                      className={`${styles["cp-select"]}${errors.section ? ` ${styles["cp-input--error"]}` : ""}`}
                      {...register("section")}
                    >
                      <option value="">Section</option>
                      {SECTION_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          Section {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Block" error={errors.block?.message} required>
                  <select
                    className={`${styles["cp-select"]}${errors.block ? ` ${styles["cp-input--error"]}` : ""}`}
                    {...register("block")}
                  >
                    <option value="">Select Block</option>
                    {BLOCK_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        Block {b}
                      </option>
                    ))}
                  </select>
                </Field>

                <button type="submit" className={`${styles["cp-btn"]} ${styles["cp-btn-primary"]} ${styles["cp-btn-full"]}`}>
                  Review & Complete Profile
                </button>
                {errors.root && (
                  <p className={styles["cp-error-text"]}>{errors.root.message}</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {showModal && pendingData && (
        <ConfirmModal
          data={pendingData}
          onConfirm={handleConfirm}
          onCancel={() => {
            setShowModal(false);
            mutation.reset();
          }}
          isLoading={mutation.isPending}
          error={mutation.error?.message}
        />
      )}
    </div>
  );
};

export default CompleteProfile;
