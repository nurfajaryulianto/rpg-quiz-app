"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthProvider from "@/components/AuthProvider";
import {
  DATA, TABS, TAB_LABELS, CHAR_NAMES, STAT_MAP,
  type Gender, type Category,
} from "@/utils/characterData";
import { buildCharacterSVG } from "@/utils/characterRenderer";
import type { AvatarConfig } from "@/lib/database.types";
import CharacterSpriteViewer from "@/components/ui/CharacterSpriteViewer";

/* ═══════════════ types & constants ═══════════════ */

type HeroClass = "fighter" | "apprentice" | "scout";

interface HeroDef {
  id: HeroClass;
  name: string;
  title: string;
  desc: string;
  badge?: string;
  icon: string;
  accent: string;
  glow: string;
  stats: { str: number; mag: number; agi: number };
}

const HEROES: HeroDef[] = [
  {
    id: "fighter",
    name: "Fighter",
    title: "Swordsman",
    desc: "A brave warrior with high physical defense and devastating close-range attacks. Masters of the blade.",
    icon: "swords",
    accent: "#ff6b6b",
    glow: "rgba(255,107,107,0.35)",
    stats: { str: 5, mag: 1, agi: 2 },
  },
  {
    id: "apprentice",
    name: "Apprentice",
    title: "Magician",
    desc: "A student of the mystic arts. Wields devastating elemental magic and powerful support spells.",
    badge: "Popular",
    icon: "auto_fix_high",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.35)",
    stats: { str: 1, mag: 5, agi: 2 },
  },
  {
    id: "scout",
    name: "Scout",
    title: "Archer",
    desc: "Swift and nimble pathfinders. Specialized in long-range precision strikes and rapid movement.",
    icon: "explore",
    accent: "#4ade80",
    glow: "rgba(74,222,128,0.35)",
    stats: { str: 2, mag: 2, agi: 5 },
  },
];

const PRESETS: Record<HeroClass, Record<Gender, { hair: number; outfit: number; acc: number; weapon: number }>> = {
  fighter:    { f: { hair: 5, outfit: 5, acc: 5, weapon: 1 }, m: { hair: 0, outfit: 0, acc: 5, weapon: 0 } },
  apprentice: { f: { hair: 1, outfit: 1, acc: 2, weapon: 3 }, m: { hair: 5, outfit: 1, acc: 5, weapon: 3 } },
  scout:      { f: { hair: 2, outfit: 5, acc: 1, weapon: 2 }, m: { hair: 3, outfit: 3, acc: 4, weapon: 2 } },
};

const STAT_LABELS: Record<string, string> = { str: "STR", mag: "INT", agi: "AGI" };
const STAT_COLORS: Record<string, string> = { str: "#ff6b6b", mag: "#a78bfa", agi: "#4ade80" };

/** build all 8 angle frames for the cylinder */
function buildAllFrames(gender: Gender, hair: number, outfit: number, acc: number, weapon: number): string[] {
  return Array.from({ length: 8 }, (_, a) => buildCharacterSVG(gender, hair, outfit, acc, weapon, a, DATA));
}

/* ═══════════════ HeroCard sub-component ═══════════════ */
interface HeroCardProps {
  h: HeroDef;
  idx: number;
  gender: Gender;
  onSelect: () => void;
}

function HeroCard({ h, idx, gender, onSelect }: HeroCardProps) {
  const pr = PRESETS[h.id][gender];
  const allFrames = buildAllFrames(gender, pr.hair, pr.outfit, pr.acc, pr.weapon);
  const [cardViewAngle, setCardViewAngle] = useState(1);

  return (
    <motion.div
      key={h.id}
      className="group relative flex flex-col items-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 pt-6 text-center backdrop-blur-sm transition-all hover:border-white/[0.15] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + idx * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      {/* glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100" style={{ boxShadow: `inset 0 1px 0 ${h.accent}44, 0 0 60px ${h.glow}` }} />

      {h.badge && (
        <span className="absolute -top-2.5 right-4 z-20 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(251,191,36,0.3)]">
          {h.badge}
        </span>
      )}

      <div className="mb-5 mt-1">
        <CharacterSpriteViewer
          frames={allFrames}
          angle={cardViewAngle}
          onAngleChange={setCardViewAngle}
          accentColor={h.accent}
          size="sm"
        />
      </div>

      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${h.accent}22`, boxShadow: `0 0 16px ${h.accent}22` }}>
        <MaterialIcon name={h.icon} className="text-base" style={{ color: h.accent }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: h.accent }}>{h.title}</p>
      <h3 className="mt-1 text-2xl font-black text-white">{h.name}</h3>
      <p className="mt-2 text-[11px] leading-relaxed text-white/40">{h.desc}</p>

      <div className="mt-5 w-full space-y-2.5">
        {(Object.entries(h.stats) as [string, number][]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-8 text-right text-[10px] font-black" style={{ color: STAT_COLORS[k] }}>{STAT_LABELS[k]}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${v * 20}%` }}
                transition={{ delay: 0.4 + idx * 0.1, duration: 0.6 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${STAT_COLORS[k]}, ${STAT_COLORS[k]}88)`, boxShadow: `0 0 8px ${STAT_COLORS[k]}44` }}
              />
            </div>
            <span className="w-4 text-[10px] font-bold text-white/30">{v}</span>
          </div>
        ))}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onSelect}
        className="mt-4 w-full rounded-xl border py-3 text-sm font-black transition-all"
        style={{
          borderColor: `${h.accent}33`,
          background: `linear-gradient(135deg, ${h.accent}15, ${h.accent}08)`,
          color: h.accent,
        }}
      >
        Select Class
      </motion.button>
    </motion.div>
  );
}

/* ═══════════════ entry ═══════════════ */

export default function CreateCharacterPage() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}

/* ═══════════════ stars background ═══════════════ */

function Starfield() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            width: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
            height: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 23 + 7) % 70}%`,
            animationDelay: `${(i * 0.3) % 4}s`,
            opacity: 0.4 + (i % 4) * 0.15,
          }}
        />
      ))}
      <div className="absolute top-[15%] left-[10%] h-[1px] w-[80px] bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shooting-star" />
    </div>
  );
}

/* ═══════════════ main component ═══════════════ */

function Inner() {
  const router = useRouter();
  const { participant, setParticipant, isLoading } = useAuthStore();

  const [heroId, setHeroId] = useState<HeroClass | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [gender, setGenderRaw] = useState<Gender>("f");
  const [hair, setHair] = useState(0);
  const [outfit, setOutfit] = useState(0);
  const [acc, setAcc] = useState(0);
  const [weapon, setWeapon] = useState(0);
  const [angle, setAngle] = useState(0);
  const [tab, setTab] = useState<Category>("hair");
  const [saving, setSaving] = useState(false);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (participant?.avatar_config) router.replace("/");
    if (!participant && !isLoading) router.replace("/login");
  }, [participant, isLoading, router]);

  const triggerPop = () => { setPop(true); setTimeout(() => setPop(false), 220); };

  const applyPreset = (h: HeroClass, g: Gender) => {
    const p = PRESETS[h][g];
    setHair(p.hair); setOutfit(p.outfit); setAcc(p.acc); setWeapon(p.weapon);
    setAngle(0); setTab("hair"); triggerPop();
  };

  const selectHero = (h: HeroClass) => { setHeroId(h); applyPreset(h, gender); setCustomOpen(true); };

  const setGender = (g: Gender) => {
    setGenderRaw(g);
    if (heroId) applyPreset(heroId, g);
    else { setHair(0); setOutfit(0); setAcc(0); setWeapon(0); }
    triggerPop();
  };

  const rotate = (d: number) => { setAngle((p: number) => ((p + d) % 8 + 8) % 8); triggerPop(); };

  const pick = (cat: Category, i: number) => {
    ({ hair: setHair, outfit: setOutfit, acc: setAcc, weapon: setWeapon }[cat])(i);
    triggerPop();
  };

  const sel = (cat: Category) => ({ hair, outfit, acc, weapon }[cat]);

  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[1];
  const charName = CHAR_NAMES[gender][outfit] ?? CHAR_NAMES[gender][0];
  // All 8 frames for the cylinder viewer in stage 2
  const allCharFrames = buildAllFrames(gender, hair, outfit, acc, weapon);

  const handleSave = async () => {
    if (!participant || !heroId) return;
    setSaving(true);
    try {
      const config: AvatarConfig = { heroClass: heroId, gender, hair, outfit, acc, weapon };
      const { data, error } = await supabase
        .from("participants").update({ avatar_config: config }).eq("id", participant.id).select("*").single();
      if (error) throw error;
      if (data) setParticipant(data);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save character");
    } finally { setSaving(false); }
  };

  if (!participant) return <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]"><LoadingSpinner text="Loading..." /></div>;

  /* ═══════ render ═══════ */
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0e1a] text-white selection:bg-amber-400/30">
      <Starfield />

      {/* ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[#1a1040] blur-[120px] opacity-70" />
        <div className="absolute -right-32 top-[40%] h-[400px] w-[400px] rounded-full bg-[#0c2a3a] blur-[100px] opacity-60" />
        <div className="absolute bottom-0 left-[30%] h-[300px] w-[500px] rounded-full bg-[#1a0a28] blur-[100px] opacity-50" />
      </div>

      {/* ═══ header bar ═══ */}
      <header className="relative z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0d1220]/80 px-5 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-[#1a0a00] shadow-[0_4px_16px_rgba(251,191,36,0.3)]">M</div>
          <span className="font-headline text-lg font-bold tracking-tight text-amber-100/90">Maple Academy</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-semibold text-white/40 md:block">Server: Maple World 1</span>
          <div className="h-5 w-px bg-white/10 hidden md:block" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="text-xs font-bold text-emerald-300/80">{participant.name || "Adventurer"}</span>
          </div>
        </div>
      </header>

      {/* ═══ main body ═══ */}
      <div className="relative z-10 flex flex-1 flex-col">

        <AnimatePresence mode="wait">
          {!heroId ? (
            /* ════════════ STAGE 1 — CLASS SELECTION ════════════ */
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-1 flex-col"
            >
              {/* title area */}
              <div className="relative px-4 pt-10 pb-6 text-center md:pt-14">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-400/70">Step 1 of 2</p>
                  <h1 className="font-headline text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
                    Choose Your <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">Class</span>
                  </h1>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/45">
                    Every adventure begins with a choice. Select your class wisely — it will shape your destiny in Maple Academy.
                  </p>
                </motion.div>
              </div>

              {/* gender toggle */}
              <div className="flex justify-center pb-8">
                <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-sm">
                  {(["f", "m"] as Gender[]).map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all ${gender === g ? "bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]" : "text-white/35 hover:text-white/55"}`}
                    >
                      {g === "f" ? "♀ Female" : "♂ Male"}
                    </button>
                  ))}
                </div>
              </div>

              {/* hero cards */}
              <div className="mx-auto grid w-full max-w-5xl flex-1 gap-5 px-4 pb-10 md:grid-cols-3 md:px-8">
                {HEROES.map((h, idx) => (
                  <HeroCard key={h.id} h={h} idx={idx} gender={gender} onSelect={() => selectHero(h.id)} />
                ))}
              </div>

              {/* footer info */}
              <div className="border-t border-white/[0.05] bg-white/[0.02] py-4 text-center">
                <p className="text-xs text-white/25">
                  <MaterialIcon name="info" className="mr-1 inline text-[14px] align-text-bottom text-amber-400/40" fill />
                  You can change your class later at <span className="font-bold text-amber-400/50">Level 30</span>
                </p>
              </div>
            </motion.div>

          ) : (
            /* ════════════ STAGE 2 — CUSTOMIZATION ════════════ */
            <motion.div
              key="customize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col lg:flex-row"
            >
              {/* left — big preview area */}
              <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 lg:py-0">
                {/* back button */}
                <button
                  type="button"
                  onClick={() => { setHeroId(null); setCustomOpen(false); }}
                  className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/50 backdrop-blur-sm transition-colors hover:border-white/[0.15] hover:text-white/70 lg:left-8 lg:top-8"
                >
                  <MaterialIcon name="arrow_back" className="text-sm" />
                  Back
                </button>

                {/* class badge */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded" style={{ background: `${hero.accent}22` }}>
                    <MaterialIcon name={hero.icon} className="text-sm" style={{ color: hero.accent }} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: hero.accent }}>{hero.title}</span>
                </div>

                {/* character preview */}
                <div className="relative flex flex-col items-center">
                  {/* ambient glow */}
                  <div className="absolute inset-0 -m-8 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${hero.glow}, transparent 70%)` }} />
                  <div className="relative z-10">
                    <CharacterSpriteViewer
                      frames={allCharFrames}
                      angle={angle}
                      onAngleChange={(a) => { setAngle(a); triggerPop(); }}
                      accentColor={hero.accent}
                      name={charName}
                      size="lg"
                      autoRotate={false}
                    />
                  </div>
                </div>

                {/* stat bars under character */}
                <div className="mt-8 w-full max-w-xs space-y-2">
                  {(Object.entries(hero.stats) as [string, number][]).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-8 text-right text-[10px] font-black" style={{ color: STAT_COLORS[k] }}>{STAT_LABELS[k]}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v * 20}%`, background: `linear-gradient(90deg, ${STAT_COLORS[k]}, ${STAT_COLORS[k]}88)`, boxShadow: `0 0 8px ${STAT_COLORS[k]}44` }} />
                      </div>
                      <span className="w-8 text-[10px] font-bold text-white/30">{v}/5</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* right — customization panel */}
              <aside className="relative w-full border-l border-white/[0.06] bg-[#0d1220]/60 backdrop-blur-xl lg:w-[380px] lg:max-w-[380px]">
                <div className="flex h-full flex-col overflow-y-auto">
                  {/* panel header */}
                  <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0d1220]/90 px-6 py-5 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-black text-white">Customize</h2>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Step 2 of 2</p>
                      </div>
                      <button type="button" onClick={() => setCustomOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-white/60 lg:hidden">
                        <MaterialIcon name="close" className="text-base" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 p-6">
                    {/* gender toggle */}
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Gender</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["f", "m"] as Gender[]).map(g => (
                          <button key={g} type="button" onClick={() => setGender(g)}
                            className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                              gender === g
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.1)]"
                                : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:border-white/[0.1] hover:text-white/50"
                            }`}
                          >
                            {g === "f" ? "♀ Female" : "♂ Male"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* category tabs */}
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Category</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {TABS.map(t => (
                          <button key={t} type="button" onClick={() => setTab(t)}
                            className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-center transition-all ${
                              tab === t
                                ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                                : "border-white/[0.05] bg-white/[0.02] text-white/30 hover:border-white/[0.1] hover:text-white/45"
                            }`}
                          >
                            <span className="text-sm leading-none">{TAB_LABELS[t].icon}</span>
                            <span className="text-[9px] font-bold">{TAB_LABELS[t].label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* items grid */}
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">{TAB_LABELS[tab].sublabel}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {DATA[gender][tab].map((item, idx) => {
                          const isActive = sel(tab) === idx;
                          return (
                            <motion.button
                              key={`${gender}-${tab}-${idx}`}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => pick(tab, idx)}
                              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                                isActive
                                  ? "border-amber-400/30 bg-amber-400/10 shadow-[0_0_16px_rgba(251,191,36,0.08)]"
                                  : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1]"
                              }`}
                            >
                              <div className="h-9 w-9 rounded-lg border border-white/10" style={{ background: `linear-gradient(135deg, ${item.c} 50%, ${item.c2} 50%)` }} />
                              <span className={`text-[9px] font-bold leading-tight ${isActive ? "text-amber-300" : "text-white/35"}`}>{item.n}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* sticky save */}
                  <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0d1220]/90 p-5 backdrop-blur-xl">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={saving}
                      className="relative w-full overflow-hidden rounded-xl border py-3.5 text-sm font-black text-white transition-opacity disabled:opacity-40"
                      style={{
                        borderColor: `${hero.accent}44`,
                        background: `linear-gradient(135deg, ${hero.accent}33, ${hero.accent}11)`,
                        boxShadow: `0 0 24px ${hero.accent}22, inset 0 1px 0 ${hero.accent}33`,
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {saving ? (
                          <><MaterialIcon name="progress_activity" className="animate-spin text-base" /> Saving...</>
                        ) : (
                          <><MaterialIcon name="celebration" className="text-base" fill /> Save & Begin Adventure</>
                        )}
                      </span>
                    </motion.button>
                    <p className="mt-2 text-center text-[10px] text-white/20">You can customize again later</p>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ animations ═══ */}
      <style jsx global>{`
        @keyframes maple-pop {
          0% { transform: scale(0.94); }
          60% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .animate-maple-pop { animation: maple-pop 0.22s ease; }

        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-hero-float { animation: hero-float 4s ease-in-out infinite; }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }

        @keyframes shooting-star {
          0% { transform: translateX(-100px) translateY(0) rotate(-15deg); opacity: 0; }
          10% { opacity: 1; }
          40% { opacity: 0; }
          100% { transform: translateX(calc(100vw + 100px)) translateY(120px) rotate(-15deg); opacity: 0; }
        }
        .animate-shooting-star { animation: shooting-star 8s ease-in-out infinite; }

        @keyframes blink {
          0%, 88%, 100% { transform: scaleY(1); }
          91%, 96% { transform: scaleY(0.06); }
        }
        .el { transform-origin: 82px 84px; animation: blink 3.8s ease-in-out infinite; }
        .er { transform-origin: 118px 84px; animation: blink 3.8s ease-in-out infinite; }
        .eq { transform-origin: 86px 84px; animation: blink 3.8s ease-in-out 0.4s infinite; }
        .eqr { transform-origin: 118px 84px; animation: blink 3.8s ease-in-out infinite; }
        .es { transform-origin: 119px 80px; animation: blink 4.2s ease-in-out 1s infinite; }
      `}</style>
    </div>
  );
}
