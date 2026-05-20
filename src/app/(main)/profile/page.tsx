"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import MaterialIcon from "@/components/MaterialIcon";
import { getLevelTitle } from "@/utils/gamification";

export default function ProfilePage() {
  const router = useRouter();
  const { participant, user, logout, setParticipant } = useAuthStore();

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Photo upload
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const levelTitle = participant ? getLevelTitle(participant.level) : "Novice";

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!currentPw) {
      setPwMsg({ type: "err", text: "Masukkan password saat ini terlebih dahulu." });
      return;
    }
    if (!newPw || newPw.length < 6) {
      setPwMsg({ type: "err", text: "Password baru minimal 6 karakter." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Konfirmasi password tidak cocok." });
      return;
    }
    if (currentPw === newPw) {
      setPwMsg({ type: "err", text: "Password baru harus berbeda dari password saat ini." });
      return;
    }
    if (!user?.email) {
      setPwMsg({ type: "err", text: "Tidak dapat memverifikasi akun. Silakan login ulang." });
      return;
    }
    setPwLoading(true);
    try {
      // Supabase requires a fresh session before password update (Secure Password Change).
      // Re-authenticate with current credentials first.
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (reAuthError) {
        setPwMsg({ type: "err", text: "Password saat ini salah." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwMsg({ type: "ok", text: "Password berhasil diperbarui. Gunakan password baru ini saat login berikutnya." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setPwMsg({ type: "err", text: (e as Error).message });
    } finally {
      setPwLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setPhotoMsg({ type: "err", text: "Ukuran foto maksimal 1MB. Kompres foto terlebih dahulu." });
      return;
    }
    setPhotoMsg(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handlePhotoUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !user || !participant) return;
    setPhotoLoading(true);
    setPhotoMsg(null);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from("participants")
        .update({ avatar_url: publicUrl })
        .eq("id", participant.id);
      if (updateErr) throw updateErr;

      setParticipant({ ...participant, avatar_url: publicUrl });
      setPhotoMsg({ type: "ok", text: "Foto profil berhasil diperbarui." });
    } catch (e) {
      setPhotoMsg({ type: "err", text: (e as Error).message });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const currentAvatar = preview ?? participant?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 relative z-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-on-surface">Account</h1>
        <p className="text-on-surface-variant mt-1">Kelola profil dan keamanan akun kamu.</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white/40 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
          {currentAvatar ? (
            <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <MaterialIcon name="person" className="text-4xl text-white" fill />
          )}
        </div>
        <div>
          <p className="text-2xl font-black text-on-surface">{participant?.name ?? "—"}</p>
          <p className="text-sm text-on-surface-variant font-medium capitalize">
            {participant?.role}
            {participant?.area ? ` · ${participant.area}` : ""}
          </p>
          <p className="text-sm text-primary font-bold mt-1">
            Level {participant?.level ?? 1} — {levelTitle}
          </p>
          {participant?.nik && (
            <p className="text-xs text-on-surface-variant mt-0.5">NIK: {participant.nik}</p>
          )}
        </div>
      </div>

      {/* Photo Upload */}
      <section className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white/40 space-y-4">
        <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
          <MaterialIcon name="photo_camera" className="text-primary" />
          Foto Profil
        </h2>
        <p className="text-sm text-on-surface-variant">
          Format JPG / PNG / WebP, maks 1MB.{" "}
          <span className="font-medium text-amber-600">
            Fitur ini memerlukan bucket <code className="bg-amber-50 px-1 rounded">avatars</code> di Supabase Storage.
          </span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors"
          >
            Pilih Foto
          </button>
          {preview && (
            <button
              onClick={handlePhotoUpload}
              disabled={photoLoading}
              className="px-4 py-2 rounded-full bg-primary text-white font-bold text-sm disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {photoLoading ? "Mengupload..." : "Upload & Simpan"}
            </button>
          )}
        </div>
        {photoMsg && (
          <p className={`text-sm font-semibold ${photoMsg.type === "ok" ? "text-green-600" : "text-rose-600"}`}>
            {photoMsg.text}
          </p>
        )}
      </section>

      {/* Change Password */}
      <section className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white/40 space-y-4">
        <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
          <MaterialIcon name="lock" className="text-primary" />
          Ganti Password
        </h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Password saat ini"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            placeholder="Password baru (min 6 karakter)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            placeholder="Konfirmasi password baru"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
          />
        </div>
        {pwMsg && (
          <p className={`text-sm font-semibold ${pwMsg.type === "ok" ? "text-green-600" : "text-rose-600"}`}>
            {pwMsg.text}
          </p>
        )}
        <button
          onClick={handleChangePassword}
          disabled={pwLoading}
          className="px-6 py-3 bg-primary text-white font-bold rounded-full text-sm disabled:opacity-60 hover:bg-primary/90 transition-colors"
        >
          {pwLoading ? "Memperbarui..." : "Perbarui Password"}
        </button>
      </section>

      {/* Character link */}
      <section className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white/40">
        <h2 className="text-lg font-black text-on-surface mb-4 flex items-center gap-2">
          <MaterialIcon name="sports_esports" className="text-primary" />
          Karakter RPG
        </h2>
        <button
          onClick={() => router.push("/character")}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors"
        >
          <MaterialIcon name="person" fill />
          Lihat & Edit Karakter
          <MaterialIcon name="arrow_forward" className="text-sm" />
        </button>
      </section>

      {/* Logout */}
      <section className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white/40">
        <h2 className="text-lg font-black text-on-surface mb-4">Keluar</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-colors"
        >
          <MaterialIcon name="logout" />
          Logout dari Maple Academy
        </button>
      </section>
    </div>
  );
}
