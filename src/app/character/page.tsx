"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import AppShell from "@/components/AppShell";
import MaterialIcon from "@/components/MaterialIcon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CharacterSpriteViewer from "@/components/ui/CharacterSpriteViewer";
import { getXPProgress, getLevelTitle } from "@/utils/gamification";
import { supabase } from "@/lib/supabase";
import {
  DATA, TABS, TAB_LABELS, ANGLE_LABELS, CHAR_NAMES,
  type Gender, type Category,
} from "@/utils/characterData";
import { buildCharacterSVG } from "@/utils/characterRenderer";
import type { AvatarConfig } from "@/lib/database.types";

/* ── hero meta ─────────────────────────────────────── */
const HERO_META: Record<string, { title: string; accent: string; glow: string; icon: string }> = {
  fighter:    { title: "Swordsman",  accent: "#ff6b6b", glow: "rgba(255,107,107,0.35)", icon: "swords" },
  apprentice: { title: "Magician",   accent: "#a78bfa", glow: "rgba(167,139,250,0.35)", icon: "auto_fix_high" },
  scout:      { title: "Archer",     accent: "#4ade80", glow: "rgba(74,222,128,0.35)",  icon: "explore" },
};
const DEFAULT_META = { title: "Adventurer", accent: "#f59e0b", glow: "rgba(245,158,11,0.35)", icon: "person" };

const STAT_LABELS: Record<string, string> = { str: "STR", mag: "INT", agi: "AGI" };
const STAT_COLORS: Record<string, string> = { str: "#ff6b6b", mag: "#a78bfa", agi: "#4ade80" };
const CLASS_STATS: Record<string, { str: number; mag: number; agi: number }> = {
  fighter: { str: 5, mag: 1, agi: 2 },
  apprentice: { str: 1, mag: 5, agi: 2 },
  scout: { str: 2, mag: 2, agi: 5 },
};

function buildAllFrames(gender: Gender, hair: number, outfit: number, acc: number, weapon: number) {
  return Array.from({ length: 8 }, (_, a) => buildCharacterSVG(gender, hair, outfit, acc, weapon, a, DATA));
}

/* ── page entry ────────────────────────────────────── */
export default function CharacterPage() {
  return (
    <AppShell>
      <CharacterInner />
    </AppShell>
  );
}

function CharacterInner() {
  const router = useRouter();
  const { participant, setParticipant, logout } = useAuthStore();

  /* derive current config */
  const cfg = participant?.avatar_config ?? {
    heroClass: "apprentice" as const,
    gender: "f" as Gender,
    hair: 1, outfit: 1, acc: 2, weapon: 3,
  };

  /* viewer state */
  const [angle, setAngle] = useState(0);
  const [pop, setPop]   = useState(false);

  /* customization state - mirrors current config */
  const [customOpen, setCustomOpen] = useState(false);
  const [gender, setGenderState]    = useState<Gender>(cfg.gender);
  const [hair,   setHair]           = useState(cfg.hair);
  const [outfit, setOutfit]         = useState(cfg.outfit);
  const [acc,    setAcc]            = useState(cfg.acc);
  const [weapon, setWeapon]         = useState(cfg.weapon);
  const [tab,    setTab]            = useState<Category>("hair");
  const [saving, setSaving]         = useState(false);

  /* dialogs */
  const [showLogout, setShowLogout] = useState(false);

  const triggerPop = () => { setPop(true); setTimeout(() => setPop(false), 220); };

  const heroClass = cfg.heroClass ?? "apprentice";
  const meta = HERO_META[heroClass] ?? DEFAULT_META;
  const stats = CLASS_STATS[heroClass] ?? { str: 2, mag: 2, agi: 2 };
  const xpProgress = participant ? getXPProgress(participant.xp) : { current: 0, needed: 100, percentage: 0 };
  const levelTitle = participant ? getLevelTitle(participant.level) : "Novice";
  const charName = CHAR_NAMES[gender][outfit] ?? CHAR_NAMES[gender][0];
  const allFrames = buildAllFrames(gender, hair, outfit, acc, weapon);

  const sel = (cat: Category) => ({ hair, outfit, acc, weapon }[cat]);
  const pick = (cat: Category, i: number) => {
    ({ hair: setHair, outfit: setOutfit, acc: setAcc, weapon: setWeapon }[cat])(i);
    triggerPop();
  };

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    try {
      const newCfg: AvatarConfig = { heroClass: heroClass as AvatarConfig["heroClass"], gender, hair, outfit, acc, weapon };
      const { data, error } = await supabase
        .from("participants")
        .update({ avatar_config: newCfg })
        .eq("id", participant.id)
        .select("*")
        .single();
      if (error) throw error;
      if (data) setParticipant(data);
      setCustomOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── page title ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-3"
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${meta.accent}22`, boxShadow: `0 0 16px ${meta.glow}` }}
        >
          <MaterialIcon name={meta.icon} className="text-lg" style={{ color: meta.accent }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-on-surface leading-none">My Character</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{meta.title} · Level {participant?.level ?? 1}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">

        {/* ── LEFT: class illustration ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center"
        >
          {/* Ornate frame around illustration */}
          <div
            className="relative overflow-hidden rounded-sm"
            style={{
              width: 240,
              background: "linear-gradient(180deg, #090d1c 0%, #060910 100%)",
              boxShadow: [
                `0 0 0 3px #3a2608`,
                `0 0 0 5px ${meta.accent}`,
                `0 0 0 6px #261808`,
                `0 0 0 8px #5a3c10`,
                `0 0 32px ${meta.glow}`,
                `inset 0 0 40px rgba(0,0,0,0.6)`,
              ].join(", "),
            }}
          >
            {/* Accent tint overlay */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 30%, ${meta.glow} 0%, transparent 60%)` }}
            />
            {/* Scanlines */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ backgroundImage: "repeating-linear-gradient(to bottom,transparent 0px,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)" }}
            />
            {/* Class illustration */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/heroes/${heroClass}.jpg`}
              alt={meta.title}
              className="relative z-0 w-full"
              style={{ aspectRatio: "4/3", objectFit: "contain", objectPosition: "50% 50%", display: "block", padding: "8px 12px 0" }}
              draggable={false}
            />
            {/* Name bar at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 z-30 py-2 text-center"
              style={{ background: `linear-gradient(to top, rgba(0,0,0,0.92) 70%, transparent)` }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: meta.accent }}>{charName}</p>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/30">{ANGLE_LABELS[angle]}</p>
            </div>
            {/* Top shimmer line */}
            <div
              className="absolute top-0 left-0 right-0 h-px z-30"
              style={{ background: `linear-gradient(90deg, transparent, ${meta.accent}cc 40%, ${meta.accent}dd 50%, ${meta.accent}cc 60%, transparent)` }}
            />
            {/* Corners */}
            {([
              "top-0 left-0",
              "top-0 right-0 scale-x-[-1]",
              "bottom-0 left-0 scale-y-[-1]",
              "bottom-0 right-0 scale-[-1]",
            ] as const).map((pos, i) => (
              <svg key={i} width="20" height="20" viewBox="0 0 20 20" className={`absolute ${pos} z-40`}>
                <polygon points="10,0 20,0 20,3.5 3.5,3.5 3.5,20 0,20 0,0" fill="#0d0803"/>
                <polygon points="10,1 19,1 19,3.5 3.5,3.5 3.5,19 1,19 1,1" fill="#5a3c10"/>
                <polygon points="10,2.2 17.5,2.2 17.5,3.5 3.5,3.5 3.5,17.5 2.2,17.5 2.2,2.2" fill={meta.accent} opacity="0.9"/>
                <polygon points="10,0 12.2,2.2 10,4.4 7.8,2.2" fill={meta.accent}/>
              </svg>
            ))}
          </div>

          {/* Direction dot indicators below frame */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setAngle(a => ((a - 1 + 8) % 8)); triggerPop(); }}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <MaterialIcon name="chevron_left" className="text-base" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setAngle(i); triggerPop(); }}
                  className="rounded-full transition-all"
                  style={
                    i === angle
                      ? { width: 20, height: 8, backgroundColor: meta.accent, boxShadow: `0 0 8px ${meta.accent}66` }
                      : { width: 6, height: 6, backgroundColor: "rgba(255,255,255,0.15)" }
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setAngle(a => (a + 1) % 8); triggerPop(); }}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <MaterialIcon name="chevron_right" className="text-base" />
            </button>
          </div>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
            Direction · {ANGLE_LABELS[angle]}
          </p>
        </motion.div>

        {/* ── RIGHT: info + actions ── */}
        <div className="flex flex-col gap-4">

          {/* identity card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.25em] mb-1"
                  style={{ color: meta.accent }}
                >
                  {meta.title}
                </p>
                <h2 className="text-xl font-black text-on-surface leading-none">{participant?.name ?? "Hero"}</h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Level {participant?.level ?? 1} {levelTitle}
                </p>
              </div>
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${meta.accent}22`, boxShadow: `0 0 20px ${meta.glow}` }}
              >
                <MaterialIcon name={meta.icon} className="text-2xl" style={{ color: meta.accent }} />
              </div>
            </div>

            {/* XP bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold mb-1.5">
                <span className="text-on-surface-variant">XP Progress</span>
                <span style={{ color: meta.accent }}>
                  {xpProgress.current} / {xpProgress.needed} XP
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress.percentage}%` }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)`,
                    boxShadow: `0 0 8px ${meta.accent}66`,
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* class stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm p-5"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-3">
              Class Stats
            </p>
            <div className="space-y-2.5">
              {(Object.entries(stats) as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-8 text-right text-[10px] font-black" style={{ color: STAT_COLORS[k] }}>
                    {STAT_LABELS[k]}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${v * 20}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${STAT_COLORS[k]}, ${STAT_COLORS[k]}88)`,
                        boxShadow: `0 0 8px ${STAT_COLORS[k]}44`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-[10px] font-bold text-on-surface-variant">{v}/5</span>
                </div>
              ))}
            </div>

            {/* quick scores */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
              {[
                { label: "Total Score", value: participant?.total_score ?? 0, icon: "star" },
                { label: "Quests Done", value: participant?.quizzes_taken ?? 0, icon: "check_circle" },
                { label: "Total XP", value: participant?.xp ?? 0, icon: "bolt" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.05] py-3 px-2 text-center">
                  <MaterialIcon name={icon} className="text-base" style={{ color: meta.accent }} fill />
                  <span className="text-base font-black text-on-surface">{value}</span>
                  <span className="text-[9px] text-on-surface-variant leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-2"
          >
            <button
              type="button"
              onClick={() => setCustomOpen(v => !v)}
              className="flex items-center justify-between rounded-xl border px-5 py-3.5 font-bold text-sm transition-all"
              style={{
                borderColor: `${meta.accent}44`,
                background: `linear-gradient(135deg, ${meta.accent}22, ${meta.accent}0a)`,
                color: meta.accent,
                boxShadow: customOpen ? `0 0 20px ${meta.glow}` : "none",
              }}
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="palette" className="text-base" />
                Customize Appearance
              </span>
              <MaterialIcon
                name="expand_more"
                className="text-base transition-transform duration-300"
                style={{ transform: customOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            <button
              type="button"
              onClick={() => setShowLogout(true)}
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-5 py-3.5 text-sm font-bold text-rose-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/10"
            >
              <MaterialIcon name="logout" className="text-base" />
              Logout
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── CUSTOMIZATION PANEL ── */}
      <AnimatePresence>
        {customOpen && (
          <motion.div
            key="custom-panel"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm p-5"
              style={{ boxShadow: `0 0 32px ${meta.glow}` }}
            >
              <h3 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                <MaterialIcon name="palette" className="text-base" style={{ color: meta.accent }} />
                Customize Appearance
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                {/* mini preview */}
                <div className="flex flex-col items-center gap-3">
                  <CharacterSpriteViewer
                    frames={buildAllFrames(gender, hair, outfit, acc, weapon)}
                    angle={angle}
                    onAngleChange={(a) => { setAngle(a); triggerPop(); }}
                    accentColor={meta.accent}
                    size="sm"
                    autoRotate={false}
                  />
                  {/* gender toggle */}
                  <div className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs font-bold">
                    {(["f", "m"] as Gender[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { setGenderState(g); triggerPop(); }}
                        className="rounded-full px-4 py-1.5 transition-all"
                        style={
                          gender === g
                            ? { background: `${meta.accent}33`, color: meta.accent }
                            : { color: "rgba(255,255,255,0.35)" }
                        }
                      >
                        {g === "f" ? "♀ Female" : "♂ Male"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* tabs + items */}
                <div className="flex flex-col gap-4">
                  {/* category tabs */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {TABS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className="flex flex-col items-center gap-1 rounded-xl border py-3 text-center transition-all"
                        style={
                          tab === t
                            ? { borderColor: `${meta.accent}44`, background: `${meta.accent}18`, color: meta.accent }
                            : { borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.35)" }
                        }
                      >
                        <span className="text-sm leading-none">{TAB_LABELS[t].icon}</span>
                        <span className="text-[9px] font-bold">{TAB_LABELS[t].label}</span>
                      </button>
                    ))}
                  </div>

                  {/* items grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {DATA[gender][tab].map((item, idx) => {
                      const isActive = sel(tab) === idx;
                      return (
                        <button
                          key={`${gender}-${tab}-${idx}`}
                          type="button"
                          onClick={() => pick(tab, idx)}
                          className="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all"
                          style={
                            isActive
                              ? { borderColor: `${meta.accent}44`, background: `${meta.accent}18`, boxShadow: `0 0 12px ${meta.glow}` }
                              : { borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }
                          }
                        >
                          <div
                            className="h-9 w-9 rounded-lg border border-white/10"
                            style={{ background: `linear-gradient(135deg, ${item.c} 50%, ${item.c2} 50%)` }}
                          />
                          <span
                            className="text-[9px] font-bold leading-tight text-center"
                            style={{ color: isActive ? meta.accent : "rgba(255,255,255,0.35)" }}
                          >
                            {item.n}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* save button */}
              <div className="mt-5 flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-black text-white disabled:opacity-50 transition-opacity"
                  style={{
                    borderColor: `${meta.accent}44`,
                    background: `linear-gradient(135deg, ${meta.accent}33, ${meta.accent}11)`,
                    boxShadow: `0 0 24px ${meta.glow}`,
                  }}
                >
                  {saving ? (
                    <><MaterialIcon name="progress_activity" className="animate-spin text-base" /> Saving...</>
                  ) : (
                    <><MaterialIcon name="check_circle" className="text-base" fill /> Save Changes</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LOGOUT CONFIRM ── */}
      <ConfirmDialog
        open={showLogout}
        title="Leaving So Soon?"
        message="Are you sure you want to log out of Maple Academy? Your progress is saved."
        icon="logout"
        confirmLabel="Log Out"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />

      {/* css for cylinder animation */}
      <style jsx global>{`
        @keyframes maple-pop {
          0%   { transform: scale(0.94); }
          60%  { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .animate-maple-pop { animation: maple-pop 0.22s ease; }
      `}</style>
    </div>
  );
}
