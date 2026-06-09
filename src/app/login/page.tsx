"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/store/authStore";
import MaterialIcon from "@/components/MaterialIcon";

interface LoginForm {
  nik: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.nik.trim(), data.password);
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid credentials")) {
        setError("NIK atau password salah. Jika sudah ganti password dan lupa, minta admin untuk reset password kamu.");
      } else if (msg === "SESSION_CONFLICT_DENIED") {
        setError("Login ditolak. Pemilik akun sedang aktif dan menolak percobaan login ini. Pastikan Anda menggunakan NIK yang benar.");
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center relative overflow-hidden bg-surface">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Magical village sunset"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtqCTrL_wTcVSYY556MNgZxdDLAYsH7T0bxbLAyYHG_8YFoZYWztIsm8fZZ883sM3bg9i4xn4IgYzb_izW9F3RGY_ZZOth_SpCen_-tUCtdyzTBrFL06GgNZgrjsSZa0-5oky1ypkd0cXAK5dlXCXVCdyxntENo0eddv_AmRG2_yc7wsOOUK8v2pvLUL_NMicmmakXRZ6uEKKSXpPU3h2gul6sSJm9-HupChPgYrB9uGEKTGpSEbSzX7uqmgou_QrB9_DAFl3p3g"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/20 to-surface/60" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg px-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-on-surface tracking-tight mb-2 drop-shadow-md">
            Welcome Back Hero!
          </h1>
          <p className="text-on-surface-variant font-medium text-lg">
            Your journey continues in Maple Academy
          </p>
        </div>

        <div className="bg-surface-container-lowest glass-card rounded-xl bubbly-shadow p-10 relative overflow-hidden border border-white/40">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-primary-container/20" />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
              <MaterialIcon name="lock" className="text-on-secondary-container" fill />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Identity Verification</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface-variant ml-2">
                NIK (Nomor Induk Karyawan)
              </label>
              <div className="relative group">
                <MaterialIcon
                  name="badge"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors"
                />
                <input
                  type="text"
                  {...register("nik", {
                    required: "NIK wajib diisi",
                    pattern: {
                      value: /^[a-zA-Z0-9]+$/,
                      message: "NIK hanya boleh huruf dan angka",
                    },
                  })}
                  className="w-full pl-12 pr-6 py-4 rounded-lg bg-surface-container-highest border-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-semibold placeholder:text-outline-variant/60"
                  placeholder="Masukkan NIK"
                />
              </div>
              {errors.nik && (
                <p className="text-error text-xs ml-2">{errors.nik.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface-variant ml-2">
                Secret Code
              </label>
              <div className="relative group">
                <MaterialIcon
                  name="key"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors"
                />
                <input
                  type="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Minimum 6 characters" },
                  })}
                  className="w-full pl-12 pr-6 py-4 rounded-lg bg-surface-container-highest border-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-semibold placeholder:text-outline-variant/60"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-error text-xs ml-2">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-error/10 border border-error p-3 rounded-xl text-error text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              className="w-full bubbly-gradient text-white py-5 rounded-full font-black text-xl shadow-lg shadow-primary-container/40 active:scale-95 transition-all relative overflow-hidden group disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              <div className="absolute inset-0 glossy-overlay opacity-50" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? "Entering..." : "Enter World"}
                {!isLoading && <MaterialIcon name="rocket_launch" fill />}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-6">
          Default password: <span className="font-bold text-primary">user123</span> — Hubungi admin untuk mendapatkan akun
        </p>
      </motion.main>
    </div>
  );
}
