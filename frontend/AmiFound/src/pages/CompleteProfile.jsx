import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { completeProfile } from "../services/authService.js";
import {
  BRANCHES,
  COURSES,
  YEAR_OPTIONS,
  SECTION_OPTIONS,
  BLOCK_OPTIONS,
} from "../utils/itemConstants.js";
/* ─── Zod Schema ─────────────────────────────────────────────────────── */
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

/* ─── Helpers ────────────────────────────────────────────────────────── */
const getSemestersForYear = (year) => {
  const map = { 1: ["1", "2"], 2: ["3", "4"], 3: ["5", "6"], 4: ["7", "8"] };
  return map[year] || ["1", "2", "3", "4", "5", "6", "7", "8"];
};

/* ─── Sub-components ─────────────────────────────────────────────────── */
const Field = ({ label, error, required, children }) => (
  <div className="cp-field">
    <label className="cp-label">
      {label}
      {required && <span className="cp-required"> *</span>}
    </label>
    {children}
    {error && <p className="cp-error-text">{error}</p>}
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
    <div className="cp-overlay">
      <div className="cp-modal">
        <div className="cp-modal-header">
          <div className="cp-modal-icon">✦</div>
          <h3 className="cp-modal-title">Confirm Your Details</h3>
          <p className="cp-modal-subtitle">
            Please review carefully — this information will be linked to your
            account.
          </p>
        </div>

        <div className="cp-modal-body">
          {rows.map(([key, val]) => (
            <div key={key} className="cp-modal-row">
              <span className="cp-modal-key">{key}</span>
              <span className="cp-modal-val">{val}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="cp-modal-error">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="cp-modal-footer">
          <button
            onClick={onCancel}
            className="cp-btn cp-btn-secondary"
            disabled={isLoading}
          >
            ← Edit Details
          </button>
          <button
            onClick={onConfirm}
            className={`cp-btn cp-btn-primary${isLoading ? " cp-btn-loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="cp-spinner" />
                Saving…
              </>
            ) : (
              "Confirm & Submit ✓"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────── */
const CompleteProfile = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  const {
    register,
    handleSubmit,
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
    onSuccess: () => {
      setCurrentUser((prev) => ({
        ...prev,
        ...pendingData,
        profileCompleted: true,
      }));
      navigate("/student-dashboard", { replace: true });
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
    <div className="cp-page">
      <div className="cp-bg-accent cp-bg-accent--1" />
      <div className="cp-bg-accent cp-bg-accent--2" />

      <div className="cp-card">
        {/* Header */}
        <div className="cp-card-header">
          <div className="cp-badge">AMIFOUND</div>
          <h1 className="cp-title">Complete Your Profile</h1>
          <p className="cp-subtitle">
            Fill in your academic details to get started with AmiFound.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="cp-form">
          <div className="cp-grid cp-grid--2">
            {/* Enrollment Number */}
            <Field
              label="Enrollment Number"
              error={errors.enrollmentNumber?.message}
              required
            >
              <input
                className={`cp-input${errors.enrollmentNumber ? " cp-input--error" : ""}`}
                placeholder="e.g. A12345678090"
                {...register("enrollmentNumber")}
              />
            </Field>

            {/* Phone Number */}
            <Field
              label="Phone Number"
              error={errors.phoneNumber?.message}
              required
            >
<input
  type="tel"
  inputMode="numeric"
  className={`cp-input${errors.phoneNumber ? " cp-input--error" : ""}`}
  placeholder="10-digit mobile number"
  maxLength={10}
  {...register("phoneNumber")}
/>
            </Field>
          </div>

          <div className="cp-grid cp-grid--2">
            {/* Course */}
            <Field label="Course" error={errors.course?.message} required>
              <select
                className={`cp-select${errors.course ? " cp-input--error" : ""}`}
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

            {/* Branch */}
            <Field label="Branch" error={errors.branch?.message} required>
              <select
                className={`cp-select${errors.branch ? " cp-input--error" : ""}`}
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

          <div className="cp-grid cp-grid--3">
            {/* Year */}
            <Field label="Year" error={errors.year?.message} required>
              <select
                className={`cp-select${errors.year ? " cp-input--error" : ""}`}
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

            {/* Semester */}
            <Field label="Semester" error={errors.semester?.message} required>
              <select
                className={`cp-select${errors.semester ? " cp-input--error" : ""}`}
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

            {/* Section */}
            <Field label="Section" error={errors.section?.message} required>
              <select
                className={`cp-select${errors.section ? " cp-input--error" : ""}`}
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
              className={`cp-select${errors.block ? " cp-input--error" : ""}`}
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

          {/* Submit */}
          <button type="submit" className="cp-btn cp-btn-primary cp-btn-full">
            Review & Complete Profile →
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
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
