"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getParticipants,
  uploadParticipants,
  deleteParticipant,
  createParticipant,
  updateParticipant,
  resetParticipantProgress,
  resetParticipantPassword,
} from "@/services/adminService";
import { parseParticipantsExcel } from "@/utils/excelParser";
import type { Participant } from "@/lib/database.types";
import { getLevelTitle } from "@/utils/gamification";

interface ParticipantForm {
  name: string;
  nik: string;
  role: "participant" | "supervisor" | "admin";
  area: string;
  jabatan: string;
  sub_dept: string;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resetPwResult, setResetPwResult] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ParticipantForm>();

  const loadParticipants = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getParticipants(signal);
      setParticipants(data);
    } catch {
      // timeout/network error — loading cleared in finally
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    loadParticipants(controller.signal);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [loadParticipants]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseParticipantsExcel(buffer);

      if (parsed.length === 0) {
        setUploadResult("No participants found in the file");
        return;
      }

      await uploadParticipants(parsed);
      setUploadResult(`Successfully uploaded ${parsed.length} participants!`);
      await loadParticipants();
    } catch (err) {
      setUploadResult(`Error: ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmitParticipant = async (data: ParticipantForm) => {
    setSaving(true);
    try {
      if (editingParticipant) {
        await updateParticipant(editingParticipant.id, {
          name: data.name,
          nik: data.nik,
          role: data.role,
          area: data.area?.trim() || null,
          jabatan: data.jabatan?.trim() || null,
          sub_dept: data.sub_dept?.trim() || null,
        });
      } else {
        await createParticipant({
          name: data.name,
          nik: data.nik,
          role: data.role,
          area: data.area?.trim() || null,
          jabatan: data.jabatan?.trim() || null,
          sub_dept: data.sub_dept?.trim() || null,
        });
      }
      reset();
      setShowForm(false);
      setEditingParticipant(null);
      await loadParticipants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save participant");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: Participant) => {
    setEditingParticipant(p);
    setValue("name", p.name);
    setValue("nik", p.nik ?? "");
    setValue("role", (p.role ?? "participant") as ParticipantForm["role"]);
    setValue("area", p.area ?? "");
    setValue("jabatan", (p as Record<string, unknown>).jabatan as string ?? "");
    setValue("sub_dept", (p as Record<string, unknown>).sub_dept as string ?? "");
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete participant "${name}"? This will remove all their answers and progress.`)) return;
    try {
      await deleteParticipant(id);
      await loadParticipants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleResetProgress = async (id: string, name: string) => {
    if (!confirm(`Reset all progress for "${name}"? This will reset their level, XP, score, and delete all their answers.`)) return;
    try {
      await resetParticipantProgress(id);
      await loadParticipants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    if (!confirm(`Reset password "${name}" ke default (user123)?`)) return;
    try {
      const msg = await resetParticipantPassword(id);
      setResetPwResult({ id, msg, ok: true });
      setTimeout(() => setResetPwResult(null), 4000);
    } catch (err) {
      setResetPwResult({ id, msg: err instanceof Error ? err.message : "Gagal reset password", ok: false });
      setTimeout(() => setResetPwResult(null), 4000);
    }
  };

  const filteredParticipants = searchQuery
    ? participants.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.nik ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : participants;

  if (loading) return <LoadingSpinner text="Loading participants..." />;

  const inputClasses = "w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary focus:outline-none transition-colors";
  const btnSecondary = "px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1";
  const btnDanger = "px-3 py-1.5 bg-error-container/20 text-error text-xs font-bold rounded-lg hover:bg-error-container/30 transition-colors flex items-center gap-1";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Hero Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">{participants.length} heroes registered</p>
        </div>
        <button
          onClick={() => {
            reset({ name: "", nik: "", role: "participant", area: "", jabatan: "", sub_dept: "" });
            setEditingParticipant(null);
            setShowForm(!showForm);
          }}
          className="px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
        >
          <MaterialIcon name={showForm && !editingParticipant ? "close" : "person_add"} className="text-lg" />
          {showForm && !editingParticipant ? "Cancel" : "Add Hero"}
        </button>
      </div>

      {/* Manual Add/Edit Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="bg-white rounded-xl bubbly-shadow p-6 mb-8 border border-primary/10">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <MaterialIcon name={editingParticipant ? "edit" : "person_add"} className="text-primary" />
              {editingParticipant ? "Edit Participant" : "Add New Participant"}
            </h3>
            <form onSubmit={handleSubmit(onSubmitParticipant)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">Nama</label>
                  <input
                    {...register("name", { required: "Nama wajib diisi" })}
                    className={inputClasses}
                    placeholder="Nama lengkap"
                  />
                  {errors.name && (
                    <p className="text-error text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">NIK</label>
                  <input
                    type="text"
                    {...register("nik", {
                      required: "NIK wajib diisi",
                      pattern: { value: /^[a-zA-Z0-9]+$/, message: "NIK hanya boleh huruf dan angka" },
                    })}
                    className={inputClasses}
                    placeholder="Nomor Induk Karyawan"
                  />
                  {errors.nik && (
                    <p className="text-error text-xs mt-1">{errors.nik.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">Role</label>
                  <select {...register("role")} className={inputClasses} defaultValue="participant">
                    <option value="participant">Participant</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">Area</label>
                  <input
                    {...register("area")}
                    className={inputClasses}
                    placeholder="Area / Unit kerja (opsional)"
                  />
                  <p className="text-on-surface-variant text-xs mt-1">Wajib diisi untuk supervisor (digunakan untuk filter essay grading)</p>
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">Jabatan</label>
                  <input
                    {...register("jabatan")}
                    className={inputClasses}
                    placeholder="Jabatan / Posisi (opsional)"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant text-sm font-medium mb-1">Sub Dept</label>
                  <input
                    {...register("sub_dept")}
                    className={inputClasses}
                    placeholder="Sub Department (opsional)"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingParticipant ? "Update" : "Add Participant"}
                </button>
                {editingParticipant && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingParticipant(null);
                      setShowForm(false);
                      reset();
                    }}
                    className={btnSecondary + " py-2.5 px-5"}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Bulk Upload Section */}
      <div className="bg-white rounded-xl bubbly-shadow p-5 mb-8">
        <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
          <MaterialIcon name="upload_file" className="text-primary" />
          Bulk Upload from Excel
        </h3>
        <p className="text-on-surface-variant text-xs mb-3">
          Excel columns: <code className="text-primary font-bold">name</code>,{" "}
          <code className="text-primary font-bold">nik</code>.
          NIK yang sudah ada akan di-update namanya.
        </p>
        <div className="flex gap-3 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="text-sm text-on-surface file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-primary-container file:text-on-primary-container file:font-bold file:cursor-pointer hover:file:opacity-80"
            disabled={uploading}
          />
          {uploading && <LoadingSpinner text="Uploading..." />}
        </div>
        {uploadResult && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-3 text-sm font-medium ${
              uploadResult.startsWith("Error") ? "text-error" : "text-tertiary"
            }`}
          >
            {uploadResult}
          </motion.p>
        )}
      </div>

      {/* Search and Count */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        <h3 className="text-on-surface-variant text-sm font-medium">
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
          {searchQuery && ` (${filteredParticipants.length} matching)`}
        </h3>
        {participants.length > 3 && (
          <div className="relative w-full md:w-72">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or NIK..."
              className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 rounded-lg pl-10 pr-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Participants List */}
      {filteredParticipants.length === 0 ? (
        <div className="bg-white rounded-xl bubbly-shadow p-8 text-center">
          <MaterialIcon name="groups" className="text-5xl text-outline-variant mb-3" />
          <p className="text-on-surface-variant">
            {searchQuery ? "No participants match your search." : "No participants yet. Add one above or upload an Excel file."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl bubbly-shadow overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-9 gap-2 px-6 py-3 bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
            <span className="col-span-2">Peserta</span>
            <span>Role</span>
            <span>Area</span>
            <span>Level</span>
            <span>XP</span>
            <span>Score</span>
            <span>Quests</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-surface-container">
            {filteredParticipants.map((p) => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-9 gap-2 items-center px-6 py-4 hover:bg-surface-container-low/50 transition-colors">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
                    <MaterialIcon name={p.role === "supervisor" ? "manage_accounts" : p.role === "admin" ? "admin_panel_settings" : "person"} className="text-sm text-on-primary-container" fill />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{p.name}</p>
                    <p className="text-on-surface-variant text-xs">{p.nik ?? p.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${p.role === "admin" ? "bg-error-container/40 text-error" : p.role === "supervisor" ? "bg-secondary-container text-on-secondary-container" : "bg-primary-container/40 text-primary"}`}>
                  {p.role ?? "participant"}
                </span>
                <span className="text-xs text-on-surface-variant">{p.area ?? "—"}</span>
                <div className="text-sm">
                  <span className="text-primary font-bold text-xs">LV.{p.level}</span>
                  <span className="text-on-surface-variant text-xs ml-1">{getLevelTitle(p.level)}</span>
                </div>
                <span className="text-sm text-on-surface">{p.xp}</span>
                <span className="text-sm text-primary font-bold">{p.total_score}</span>
                <span className="text-sm text-on-surface">{p.quizzes_taken}</span>
                {/* Action button groups — Gestalt Law of Common Region:
                    neutral actions share one pill, destructive share another */}
                <div className="flex items-center gap-1.5 flex-nowrap">
                  {/* Safe actions */}
                  <div className="flex items-center bg-surface-container-high rounded-lg p-0.5 gap-0.5">
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1.5 rounded-md text-on-surface hover:bg-surface-container transition-colors"
                      title="Edit"
                    >
                      <MaterialIcon name="edit" className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(p.id, p.name)}
                      className="p-1.5 rounded-md text-on-surface hover:bg-surface-container transition-colors"
                      title="Reset password">
                      <MaterialIcon name="lock_reset" className="text-sm" />
                    </button>
                  </div>
                  {/* Destructive actions */}
                  <div className="flex items-center bg-error-container/20 rounded-lg p-0.5 gap-0.5">
                    <button
                      onClick={() => handleResetProgress(p.id, p.name)}
                      className="p-1.5 rounded-md text-error hover:bg-error-container/40 transition-colors"
                      title="Reset progress"
                    >
                      <MaterialIcon name="restart_alt" className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 rounded-md text-error hover:bg-error-container/40 transition-colors"
                      title="Hapus"
                    >
                      <MaterialIcon name="delete" className="text-sm" />
                    </button>
                  </div>
                </div>
                {resetPwResult?.id === p.id && (
                  <p className={`text-xs font-semibold mt-1 ${resetPwResult.ok ? "text-green-600" : "text-rose-600"}`}>
                    {resetPwResult.msg}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
