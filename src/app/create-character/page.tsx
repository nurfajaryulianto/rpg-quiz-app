"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthProvider from "@/components/AuthProvider";
import {
  DATA, TABS, TAB_LABELS, ANGLE_LABELS, CHAR_NAMES, STAT_MAP,
  type Gender, type Category,
} from "@/utils/characterData";
import { buildCharacterSVG } from "@/utils/characterRenderer";
import type { AvatarConfig } from "@/lib/database.types";

type HeroClass = "fighter" | "apprentice" | "scout";

type HeroDefinition = {
  id: HeroClass;
  name: string;
  subtitle: string;
  description: string;
  badge?: string;
  icon: string;
  accent: string;
  surface: string;
  glow: string;
  stats: { str: number; mag: number; agi: number };
};

const HEROES: HeroDefinition[] = [
  {
    id: "fighter",
    name: "Fighter",
    subtitle: "Frontline Vanguard",
    description: "A brave warrior with high physical defense and decisive close-range attacks.",
    icon: "swords",
    accent: "#d9586d",
    surface: "rgba(255, 240, 242, 0.92)",
    glow: "rgba(217, 88, 109, 0.26)",
    stats: { str: 5, mag: 1, agi: 2 },
  },
  {
    id: "apprentice",
    name: "Apprentice",
    subtitle: "Arcane Student",
    description: "A student of the mystic arts. Masters of elemental damage and support spells.",
    badge: "Popular",
    icon: "auto_fix_high",
    accent: "#8f5fce",
    surface: "rgba(245, 240, 255, 0.94)",
    glow: "rgba(143, 95, 206, 0.22)",
    stats: { str: 1, mag: 5, agi: 2 },
  },
  {
    id: "scout",
    name: "Scout",
    subtitle: "Swift Pathfinder",
    description: "Swift and nimble explorers specialized in precision, speed, and battlefield mobility.",
    icon: "explore",
    accent: "#5d9a62",
    surface: "rgba(241, 250, 241, 0.94)",
    glow: "rgba(93, 154, 98, 0.22)",
    stats: { str: 2, mag: 2, agi: 5 },
  },
];

const HERO_PRESETS: Record<HeroClass, Record<Gender, { hair: number; outfit: number; acc: number; weapon: number }>> = {
  fighter: {
    f: { hair: 5, outfit: 5, acc: 5, weapon: 1 },
    m: { hair: 0, outfit: 0, acc: 5, weapon: 0 },
  },
  apprentice: {
    f: { hair: 1, outfit: 1, acc: 2, weapon: 3 },
    m: { hair: 5, outfit: 1, acc: 5, weapon: 3 },
  },
  scout: {
    f: { hair: 2, outfit: 5, acc: 1, weapon: 2 },
    m: { hair: 3, outfit: 3, acc: 4, weapon: 2 },
  },
};

const SIDE_NAV = [
  { label: "Home", icon: "home" },
  { label: "Quests", icon: "foundation", active: true },
  { label: "Leaderboard", icon: "leaderboard" },
  { label: "Inventory", icon: "backpack" },
];

const QUICK_OPTIONS = {
  outfits: ["Standard", "Reinforced", "Ceremonial", "Shadow"],
  accessories: ["None", "Hero Cape", "Mystic Amulet", "Tactical Goggles"],
};

export default function CreateCharacterPage() {
  return (
    <AuthProvider>
      <CreateCharacterInner />
    </AuthProvider>
  );
}

function CreateCharacterInner() {
  const router = useRouter();
  const { participant, setParticipant, isLoading } = useAuthStore();

  const [selectedHero, setSelectedHero] = useState<HeroClass | null>(null);
  const [gender, setGenderState] = useState<Gender>("f");
  const [hair, setHair] = useState(0);
  const [outfit, setOutfit] = useState(0);
  const [acc, setAcc] = useState(0);
  const [weapon, setWeapon] = useState(0);
  const [angle, setAngle] = useState(0);
  const [tab, setTab] = useState<Category>("hair");
  const [saving, setSaving] = useState(false);
  const [pop, setPop] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartAngle = useRef(0);

  useEffect(() => {
    if (participant?.avatar_config) {
      router.replace("/");
    }
    if (!participant && !isLoading) {
      router.replace("/login");
    }
  }, [participant, isLoading, router]);

  const triggerPop = () => {
    setPop(true);
    setTimeout(() => setPop(false), 220);
  };

  const applyHeroPreset = (hero: HeroClass, nextGender: Gender) => {
    const preset = HERO_PRESETS[hero][nextGender];
    setHair(preset.hair);
    setOutfit(preset.outfit);
    setAcc(preset.acc);
    setWeapon(preset.weapon);
    setAngle(0);
    setTab("hair");
    triggerPop();
  };

  const handleHeroSelect = (hero: HeroClass) => {
    setSelectedHero(hero);
    applyHeroPreset(hero, gender);
  };

  const setGender = (nextGender: Gender) => {
    setGenderState(nextGender);
    if (selectedHero) {
      applyHeroPreset(selectedHero, nextGender);
      return;
    }
    setHair(0);
    setOutfit(0);
    setAcc(0);
    setWeapon(0);
    triggerPop();
  };

  const rotate = (dir: number) => {
    setAngle((prev) => ((prev + dir) % 8 + 8) % 8);
    triggerPop();
  };

  const pick = (cat: Category, idx: number) => {
    if (cat === "hair") setHair(idx);
    else if (cat === "outfit") setOutfit(idx);
    else if (cat === "acc") setAcc(idx);
    else setWeapon(idx);
    triggerPop();
  };

  const getSelected = (cat: Category) => {
    if (cat === "hair") return hair;
    if (cat === "outfit") return outfit;
    if (cat === "acc") return acc;
    return weapon;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragStartX.current = e.clientX;
    dragStartAngle.current = angle;
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragStartX.current === null) return;
    const newAngle = ((dragStartAngle.current + Math.round((e.clientX - dragStartX.current) / 26)) % 8 + 8) % 8;
    setAngle(newAngle);
  };

  const onPointerUp = () => {
    dragStartX.current = null;
  };

  const hero = HEROES.find((item) => item.id === selectedHero) ?? HEROES[1];
  const charSVG = buildCharacterSVG(gender, hair, outfit, acc, weapon, angle, DATA);
  const charName = CHAR_NAMES[gender][outfit] ?? CHAR_NAMES[gender][0];
  const weaponType = DATA[gender].weapon[weapon].t;
  const statTag = STAT_MAP[weaponType] ?? STAT_MAP.none;
  const currentHair = DATA[gender].hair[hair]?.n ?? "Default";
  const currentOutfit = DATA[gender].outfit[outfit]?.n ?? "Default";
  const currentAccessory = DATA[gender].acc[acc]?.n ?? "None";

  const handleSave = async () => {
    if (!participant || !selectedHero) return;

    setSaving(true);
    try {
      const config: AvatarConfig = { heroClass: selectedHero, gender, hair, outfit, acc, weapon };
      const { data, error } = await supabase
        .from("participants")
        .update({ avatar_config: config })
        .eq("id", participant.id)
        .select("*")
        .single();

      if (error) throw error;
      if (data) setParticipant(data);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save character");
    } finally {
      setSaving(false);
    }
  };

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fffdfd_0%,_#fff4f6_42%,_#ffeaf1_100%)] text-on-surface">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-[-8rem] top-[8rem] h-72 w-72 rounded-full bg-[#ffd9e4] blur-3xl" />
        <div className="absolute bottom-[-3rem] right-[8%] h-64 w-64 rounded-full bg-[#d8f2d6] blur-3xl" />
        <div className="absolute right-[18%] top-[15%] h-40 w-40 rounded-full bg-[#ffe4b8] blur-3xl" />
      </div>

      <header className="relative z-20 flex h-20 items-center justify-between rounded-b-[2.5rem] bg-white/75 px-5 shadow-[0_18px_50px_rgba(108,39,70,0.08)] backdrop-blur-xl md:px-8 lg:ml-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#f7c0cf,#ff8fa7)] shadow-[0_10px_28px_rgba(201,83,113,0.28)]" />
          <div>
            <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-primary">Maple Academy</p>
          </div>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <button className="font-semibold text-primary/75 transition-transform hover:scale-105">Home</button>
          <button className="rounded-full bg-primary/10 px-5 py-2 font-bold text-primary shadow-[0_8px_18px_rgba(156,56,83,0.08)]">Quests</button>
          <button className="font-semibold text-primary/75 transition-transform hover:scale-105">Leaderboard</button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="rounded-full p-2 text-primary/80 transition-colors hover:bg-primary/5">
            <MaterialIcon name="person_search" className="text-[20px]" />
          </button>
          <button className="relative rounded-full p-2 text-primary/80 transition-colors hover:bg-primary/5">
            <MaterialIcon name="notifications" className="text-[20px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-primary/15 bg-[linear-gradient(135deg,#ffe0eb,#fff)] text-sm font-black text-primary shadow-[0_10px_24px_rgba(156,56,83,0.12)]">
            {(participant.name || "A").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-5rem)]">
        <aside className="hidden w-[270px] shrink-0 flex-col rounded-r-[2.75rem] border-r border-white/30 bg-white/55 px-6 pb-8 pt-6 shadow-[0_24px_70px_rgba(108,39,70,0.08)] backdrop-blur-xl lg:flex">
          <div className="mb-10 mt-4 rounded-[2rem] bg-white/75 p-4 shadow-[0_16px_38px_rgba(108,39,70,0.08)]">
            <div className="mb-4 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#3c465f,#151b27)] p-3">
              <div className="mx-auto flex h-32 w-24 items-center justify-center rounded-[1.25rem] bg-[radial-gradient(circle_at_top,_#7082a2,_#1b2231_72%)]">
                <svg
                  viewBox="0 0 200 245"
                  width={82}
                  height={102}
                  dangerouslySetInnerHTML={{ __html: `<g>${buildCharacterSVG("m", 2, 0, 5, 0, 1, DATA)}</g>` }}
                />
              </div>
            </div>
            <p className="text-lg font-extrabold text-primary">{participant.name || "Employee Hero"}</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Level 1 Novice</p>
          </div>

          <nav className="space-y-2">
            {SIDE_NAV.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-4 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                  item.active
                    ? "bg-[linear-gradient(135deg,#ff5f81,#ff6f92)] text-white shadow-[0_14px_30px_rgba(255,95,129,0.35)]"
                    : "text-primary/75 hover:bg-white/70"
                }`}
              >
                <MaterialIcon name={item.icon} className="text-[18px]" fill={item.active} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="mt-auto space-y-3 pt-10">
            <button className="w-full rounded-full bg-white py-4 text-sm font-black text-primary shadow-[0_12px_30px_rgba(108,39,70,0.1)] transition-transform hover:-translate-y-0.5">
              Join a Guild
            </button>
            <button className="flex w-full items-center gap-4 rounded-full px-5 py-3 text-sm font-semibold text-primary/75 transition-colors hover:bg-white/70">
              <MaterialIcon name="settings" className="text-[18px]" />
              <span>Settings</span>
            </button>
            <button className="flex w-full items-center gap-4 rounded-full px-5 py-3 text-sm font-semibold text-primary/75 transition-colors hover:bg-white/70">
              <MaterialIcon name="logout" className="text-[18px]" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-8 md:px-8 lg:px-10 lg:py-10">
          <AnimatePresence mode="wait">
            {!selectedHero ? (
              <motion.section
                key="hero-selection"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                className="mx-auto max-w-7xl"
              >
                <div className="mb-14 text-center">
                  <span className="inline-flex rounded-full bg-primary/12 px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                    Step 2: Creation
                  </span>
                  <h1 className="mt-5 font-headline text-5xl font-black tracking-tight text-on-surface md:text-6xl">
                    Choose Your Hero
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8 text-on-surface-variant">
                    Every legend begins with a single choice. Pick a role first, then refine the look using the existing Maple avatar builder.
                  </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                  {HEROES.map((item) => {
                    const preview = HERO_PRESETS[item.id][gender];
                    const previewSvg = buildCharacterSVG(gender, preview.hair, preview.outfit, preview.acc, preview.weapon, 1, DATA);

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ y: -8, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleHeroSelect(item.id)}
                        className="group relative overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/78 p-7 text-left shadow-[0_18px_60px_rgba(108,39,70,0.08)] backdrop-blur-xl"
                        style={{ boxShadow: `0 22px 70px ${item.glow}` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-32 opacity-60" style={{ background: `linear-gradient(180deg, ${item.surface}, rgba(255,255,255,0))` }} />
                        {item.badge ? (
                          <span className="absolute right-6 top-6 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white" style={{ backgroundColor: item.accent }}>
                            {item.badge}
                          </span>
                        ) : null}

                        <div className="relative z-10 pt-2">
                          <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-[1.8rem] border border-white/70 bg-white shadow-[0_18px_45px_rgba(108,39,70,0.1)]">
                            <svg viewBox="0 0 200 245" width={124} height={154} dangerouslySetInnerHTML={{ __html: `<g>${previewSvg}</g>` }} />
                          </div>

                          <div className="mb-3 flex items-center justify-center gap-2 text-center">
                            <MaterialIcon name={item.icon} className="text-[20px]" />
                            <p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: item.accent }}>
                              {item.subtitle}
                            </p>
                          </div>

                          <h2 className="text-center text-4xl font-black tracking-tight text-on-surface">{item.name}</h2>
                          <p className="mx-auto mt-4 max-w-[19rem] text-center text-sm font-medium leading-6 text-on-surface-variant">
                            {item.description}
                          </p>

                          <div className="mt-7 space-y-4">
                            {[
                              ["Strength", item.stats.str],
                              ["Magic", item.stats.mag],
                              ["Agility", item.stats.agi],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between gap-4">
                                <span className="text-sm font-bold text-on-surface-variant">{label}</span>
                                <div className="flex gap-1">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <MaterialIcon
                                      key={idx}
                                      name="star"
                                      fill={idx < Number(value)}
                                      className={`text-[18px] ${idx < Number(value) ? "text-primary" : "text-outline-variant"}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-8 rounded-full px-6 py-4 text-center text-lg font-black text-white shadow-[0_16px_34px_rgba(156,56,83,0.2)] transition-transform group-hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, ${item.accent}, #ff8aa8)` }}>
                            Select Hero
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="hero-customization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mx-auto max-w-7xl"
              >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedHero(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-5 py-3 text-sm font-bold text-primary shadow-[0_10px_30px_rgba(108,39,70,0.06)]"
                  >
                    <MaterialIcon name="arrow_back" className="text-[18px]" />
                    <span>Back to Stage 1</span>
                  </button>

                  <div className="flex items-center gap-3 rounded-full bg-white/75 px-5 py-3 text-sm font-semibold text-on-surface-variant shadow-[0_10px_30px_rgba(108,39,70,0.06)]">
                    <MaterialIcon name="info" className="text-[18px] text-primary" fill />
                    <span>You can still refine cosmetics later. Class identity is saved with this avatar.</span>
                  </div>
                </div>

                <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
                  <section className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-[0_22px_70px_rgba(108,39,70,0.09)] backdrop-blur-xl md:p-10">
                    <div className="absolute inset-x-0 top-0 h-40 opacity-65" style={{ background: `linear-gradient(180deg, ${hero.surface}, rgba(255,255,255,0))` }} />
                    <div className="relative z-10">
                      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
                        <div>
                          <span className="inline-flex rounded-full px-4 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white" style={{ backgroundColor: hero.accent }}>
                            {hero.name}
                          </span>
                          <h2 className="mt-4 text-4xl font-black tracking-tight text-on-surface md:text-5xl">Build Your Legend</h2>
                          <p className="mt-3 max-w-xl text-base font-medium leading-7 text-on-surface-variant">
                            Start from the {hero.name.toLowerCase()} archetype, then fine-tune the appearance with the parts already supported by the current Maple renderer.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-[0_12px_28px_rgba(108,39,70,0.08)]">
                          <button
                            type="button"
                            onClick={() => setGender("f")}
                            className={`rounded-full px-4 py-2 text-sm font-black transition-all ${gender === "f" ? "text-white shadow-[0_10px_24px_rgba(212,83,126,0.28)]" : "text-primary/65"}`}
                            style={gender === "f" ? { background: "linear-gradient(135deg,#e06d93,#ff92aa)" } : undefined}
                          >
                            Female
                          </button>
                          <button
                            type="button"
                            onClick={() => setGender("m")}
                            className={`rounded-full px-4 py-2 text-sm font-black transition-all ${gender === "m" ? "text-white shadow-[0_10px_24px_rgba(91,143,212,0.28)]" : "text-primary/65"}`}
                            style={gender === "m" ? { background: "linear-gradient(135deg,#679bdd,#81b7ff)" } : undefined}
                          >
                            Male
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,245,248,0.92))] p-6 shadow-[0_18px_50px_rgba(108,39,70,0.08)]">
                          <div className="relative mb-4 overflow-hidden rounded-[1.75rem] border border-white/60 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(255,233,239,0.92)_68%,_rgba(255,214,226,0.9)_100%)] px-4 py-6">
                            <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ backgroundColor: hero.glow }} />
                            <svg
                              ref={svgRef}
                              viewBox="0 0 200 245"
                              width={230}
                              height={280}
                              className={`relative z-10 mx-auto block cursor-grab select-none active:cursor-grabbing ${pop ? "animate-maple-pop" : ""}`}
                              onPointerDown={onPointerDown}
                              onPointerMove={onPointerMove}
                              onPointerUp={onPointerUp}
                              dangerouslySetInnerHTML={{ __html: `<g>${charSVG}</g>` }}
                            />
                          </div>

                          <div className="flex items-center justify-center gap-3">
                            <button type="button" onClick={() => rotate(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-primary/10 bg-white text-primary shadow-[0_10px_20px_rgba(108,39,70,0.05)]">
                              <MaterialIcon name="chevron_left" className="text-[20px]" />
                            </button>
                            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-[0_10px_22px_rgba(108,39,70,0.05)]">
                              {Array.from({ length: 8 }).map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setAngle(i);
                                    triggerPop();
                                  }}
                                  className={`rounded-full transition-all ${i === angle ? "h-3 w-7" : "h-2.5 w-2.5 bg-primary/20"}`}
                                  style={i === angle ? { backgroundColor: hero.accent } : undefined}
                                />
                              ))}
                            </div>
                            <button type="button" onClick={() => rotate(1)} className="grid h-9 w-9 place-items-center rounded-full border border-primary/10 bg-white text-primary shadow-[0_10px_20px_rgba(108,39,70,0.05)]">
                              <MaterialIcon name="chevron_right" className="text-[20px]" />
                            </button>
                          </div>

                          <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-primary/60">{ANGLE_LABELS[angle]}</p>
                          <h3 className="mt-2 text-center text-3xl font-black text-on-surface">{charName}</h3>

                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[1.2rem] bg-white px-4 py-3 text-center shadow-[0_10px_22px_rgba(108,39,70,0.05)]">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/55">Class</p>
                              <p className="mt-1 text-sm font-bold text-on-surface">{hero.name}</p>
                            </div>
                            <div className="rounded-[1.2rem] bg-white px-4 py-3 text-center shadow-[0_10px_22px_rgba(108,39,70,0.05)]">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/55">Stat Focus</p>
                              <p className="mt-1 text-sm font-bold text-on-surface">{statTag}</p>
                            </div>
                            <div className="rounded-[1.2rem] bg-white px-4 py-3 text-center shadow-[0_10px_22px_rgba(108,39,70,0.05)]">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/55">Stage</p>
                              <p className="mt-1 text-sm font-bold text-on-surface">Creation</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <InfoChip label="Hair" value={currentHair} icon="palette" />
                            <InfoChip label="Outfit" value={currentOutfit} icon="checkroom" />
                            <InfoChip label="Accessory" value={currentAccessory} icon="auto_awesome" />
                          </div>

                          <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_50px_rgba(108,39,70,0.08)]">
                            <div className="mb-4 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/60">Customization</p>
                                <h3 className="mt-2 text-2xl font-black text-on-surface">Refine the Details</h3>
                              </div>
                              <div className="rounded-full bg-primary/8 px-4 py-2 text-xs font-bold text-primary">
                                {QUICK_OPTIONS.outfits[Math.min(outfit, QUICK_OPTIONS.outfits.length - 1)]}
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              {TABS.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => setTab(item)}
                                  className={`rounded-[1.25rem] border px-3 py-3 text-center transition-all ${
                                    tab === item
                                      ? "border-primary/25 bg-primary/10 text-primary shadow-[0_12px_24px_rgba(156,56,83,0.1)]"
                                      : "border-primary/10 bg-white text-on-surface-variant hover:bg-surface-container-low"
                                  }`}
                                >
                                  <div className="text-lg leading-none">{TAB_LABELS[item].icon}</div>
                                  <div className="mt-1 text-[11px] font-bold">{TAB_LABELS[item].label}</div>
                                </button>
                              ))}
                            </div>

                            <p className="mt-4 text-sm font-medium text-on-surface-variant">{TAB_LABELS[tab].sublabel}</p>

                            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {DATA[gender][tab].map((item, index) => {
                                const selected = getSelected(tab) === index;

                                return (
                                  <motion.button
                                    key={`${gender}-${tab}-${index}`}
                                    type="button"
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => pick(tab, index)}
                                    className={`rounded-[1.4rem] border p-3 text-left transition-all ${
                                      selected
                                        ? "border-primary/25 bg-primary/10 shadow-[0_16px_28px_rgba(156,56,83,0.1)]"
                                        : "border-primary/10 bg-white hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(108,39,70,0.06)]"
                                    }`}
                                  >
                                    <div className="mb-3 h-12 w-12 rounded-[1rem] border border-black/5" style={{ background: `linear-gradient(135deg, ${item.c} 50%, ${item.c2} 50%)` }} />
                                    <p className="text-sm font-bold text-on-surface">{item.n}</p>
                                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">{item.t}</p>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_50px_rgba(108,39,70,0.08)]">
                            <div className="mb-5 flex items-center gap-3">
                              <MaterialIcon name="star" className="text-[22px] text-primary" fill />
                              <h3 className="text-xl font-black text-on-surface">Hero Affinity</h3>
                            </div>
                            <div className="space-y-4">
                              {[
                                ["Strength", hero.stats.str],
                                ["Magic", hero.stats.mag],
                                ["Agility", hero.stats.agi],
                              ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between gap-4">
                                  <span className="text-sm font-bold text-on-surface-variant">{label}</span>
                                  <div className="flex gap-1">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                      <span
                                        key={idx}
                                        className={`h-2.5 rounded-full ${idx < Number(value) ? "w-8" : "w-4 bg-primary/10"}`}
                                        style={idx < Number(value) ? { backgroundColor: hero.accent } : undefined}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.14em] text-primary/60">
                              <span className="rounded-full bg-primary/8 px-4 py-2">Hair: {currentHair}</span>
                              <span className="rounded-full bg-primary/8 px-4 py-2">Outfit: {QUICK_OPTIONS.outfits[Math.min(outfit, QUICK_OPTIONS.outfits.length - 1)]}</span>
                              <span className="rounded-full bg-primary/8 px-4 py-2">Accessory: {QUICK_OPTIONS.accessories[Math.min(acc, QUICK_OPTIONS.accessories.length - 1)]}</span>
                            </div>
                          </div>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={handleSave}
                            disabled={saving}
                            className="relative w-full overflow-hidden rounded-full px-8 py-5 text-lg font-black text-white shadow-[0_20px_36px_rgba(156,56,83,0.24)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ background: `linear-gradient(135deg, ${hero.accent}, #ff8ea8)` }}
                          >
                            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0))]" />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {saving ? (
                                <>
                                  <MaterialIcon name="progress_activity" className="animate-spin text-[22px]" />
                                  Saving Your Hero...
                                </>
                              ) : (
                                <>
                                  <MaterialIcon name="celebration" className="text-[22px]" fill />
                                  Complete Creation
                                </>
                              )}
                            </span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style jsx global>{`
        @keyframes maple-pop {
          0% { transform: scale(0.94); }
          60% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }

        .animate-maple-pop {
          animation: maple-pop 0.22s ease;
        }

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

function InfoChip({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(108,39,70,0.06)]">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <MaterialIcon name={icon} className="text-[18px]" fill />
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/65">{label}</span>
      </div>
      <p className="text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}
