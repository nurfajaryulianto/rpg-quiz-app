import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// --- Types ---
type View = "login" | "home" | "quests" | "leaderboard" | "inventory" | "admin" | "hero-selection";

// --- Components ---
const MaterialIcon = ({ name, className = "", fill = false }: { name: string; className?: string; fill?: boolean }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
  >
    {name}
  </span>
);

const Sidebar = ({ currentView, setView }: { currentView: View; setView: (v: View) => void }) => {
  const navItems = [
    { id: "home", label: "Home", icon: "home" },
    { id: "quests", label: "Quests", icon: "foundation" },
    { id: "leaderboard", label: "Leaderboard", icon: "leaderboard" },
    { id: "inventory", label: "Inventory", icon: "backpack" },
    { id: "admin", label: "Admin", icon: "shield_person", fill: true },
  ];
  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col py-8 z-40 bg-rose-50 dark:bg-pink-950 w-64 rounded-r-[3rem] overflow-hidden shadow-xl shadow-rose-200/50 hidden lg:flex">
      <div className="mt-20 px-6 mb-8">
        <div className="flex items-center gap-4 mb-6 p-4 bg-white/50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
            <MaterialIcon name="shield_person" className="text-white" fill />
          </div>
          <div>
            <p className="font-bold text-on-surface leading-none">Employee Hero</p>
            <p className="text-xs text-on-surface-variant font-medium">Level 1 Novice</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full px-6 py-3 mx-2 my-1 flex items-center gap-4 transition-all group rounded-full ${
              currentView === item.id
                ? "bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-lg shadow-rose-300/50"
                : "text-rose-700/70 dark:text-rose-300/70 hover:bg-white/80"
            }`}
          >
            <MaterialIcon name={item.icon} className="group-hover:scale-110 transition-transform" fill={item.fill || currentView === item.id} />
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 mt-auto space-y-2">
        <button className="w-full py-4 px-6 bg-white text-primary font-bold rounded-xl shadow-sm border-b-4 border-rose-100 active:border-b-0 active:translate-y-1 transition-all mb-4">Join a Guild</button>
        <div className="border-t border-rose-100/50 pt-4">
          <button className="w-full text-rose-700/70 px-6 py-2 flex items-center gap-4 hover:bg-rose-100/50 rounded-full transition-all">
            <MaterialIcon name="settings" className="text-sm" />
            <span className="text-sm font-semibold">Settings</span>
          </button>
          <button onClick={() => setView("login")} className="w-full text-rose-700/70 px-6 py-2 flex items-center gap-4 hover:bg-rose-100/50 rounded-full transition-all">
            <MaterialIcon name="logout" className="text-sm" />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ setView }: { setView: (v: View) => void }) => (
  <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_0_rgba(74,33,53,0.06)] rounded-b-[3rem]">
    <div className="flex items-center gap-4">
      <span className="text-2xl font-black text-rose-800 drop-shadow-sm font-headline tracking-tight">Maple Academy</span>
    </div>
    <div className="flex items-center gap-6">
      <div className="hidden md:flex items-center gap-8 mr-8">
        <button onClick={() => setView("home")} className="text-rose-400 font-semibold hover:scale-105 transition-transform duration-200">Home</button>
        <button onClick={() => setView("quests")} className="text-rose-400 font-semibold hover:scale-105 transition-transform duration-200">Quests</button>
        <button onClick={() => setView("admin")} className="text-rose-900 font-extrabold scale-105 underline decoration-4 underline-offset-8 decoration-primary-container">Admin</button>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-full hover:bg-rose-50 transition-all active:scale-95">
          <MaterialIcon name="person_search" className="text-rose-600" />
        </button>
        <button className="p-2 rounded-full hover:bg-rose-50 transition-all active:scale-95 relative">
          <MaterialIcon name="notifications" className="text-rose-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-primary-container overflow-hidden">
          <img alt="Profile Avatar" className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4STRjeUJGo0MA2Ba-NbNSZcXPUAQW1a-O56k77puIuKMPutm9-JJt5MhOcjjXB6fCRtKFbaq9DZTRNrvxMO2kiz2-qG0frIKet0uYQnqxFb_DQz5msXobrAJKTjhHOGAj6uILiz9R518p6bHXbeohDD703lUtocBOpQ5M8zQGQTZ892UCzw-D_Cqi0yZQEZLTRyXS1iwwrYVnDBbdCx7NEpXEUg1mvxkHBAzQedA79_ezaG-f6AiGUSIYK9cSKx9f0-bcbITH9w"
            referrerPolicy="no-referrer" />
        </div>
      </div>
    </div>
  </header>
);

const LoginView = ({ onLogin }: { onLogin: (isNew?: boolean) => void }) => (
  <div className="h-screen w-full flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 z-0">
      <img alt="Magical village sunset" className="w-full h-full object-cover"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtqCTrL_wTcVSYY556MNgZxdDLAYsH7T0bxbLAyYHG_8YFoZYWztIsm8fZZ883sM3bg9i4xn4IgYzb_izW9F3RGY_ZZOth_SpCen_-tUCtdyzTBrFL06GgNZgrjsSZa0-5oky1ypkd0cXAK5dlXCXVCdyxntENo0eddv_AmRG2_yc7wsOOUK8v2pvLUL_NMicmmakXRZ6uEKKSXpPU3h2gul6sSJm9-HupChPgYrB9uGEKTGpSEbSzX7uqmgou_QrB9_DAFl3p3g"
        referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/20 to-surface/60"></div>
    </div>
    <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg px-6">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-on-surface tracking-tight mb-2 drop-shadow-md">Welcome Back Hero!</h1>
        <p className="text-on-surface-variant font-medium text-lg">Your journey continues in Maple Academy</p>
      </div>
      <div className="bg-surface-container-lowest glass-card rounded-xl bubbly-shadow p-10 relative overflow-hidden border border-white/40">
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-primary-container/20"></div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
            <MaterialIcon name="lock" className="text-on-secondary-container" fill />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Identity Verification</h2>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-on-surface-variant ml-2">Character Alias</label>
            <div className="relative group">
              <MaterialIcon name="person" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" />
              <input className="w-full pl-12 pr-6 py-4 rounded-lg bg-surface-container-highest border-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-semibold placeholder:text-outline-variant/60" placeholder="Enter your name..." type="text" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-on-surface-variant ml-2">Secret Code</label>
            <div className="relative group">
              <MaterialIcon name="key" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" />
              <input className="w-full pl-12 pr-6 py-4 rounded-lg bg-surface-container-highest border-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-semibold placeholder:text-outline-variant/60" placeholder="••••••••" type="password" required />
            </div>
          </div>
          <button className="w-full bubbly-gradient text-white py-5 rounded-full font-black text-xl shadow-lg shadow-primary-container/40 active:scale-95 transition-all relative overflow-hidden group" type="submit">
            <span className="relative z-10 flex items-center justify-center gap-2">Enter World <MaterialIcon name="rocket_launch" fill /></span>
          </button>
        </form>
      </div>
      <div className="mt-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-12 bg-outline-variant/30"></div>
          <span className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">New Recruit?</span>
          <div className="h-px w-12 bg-outline-variant/30"></div>
        </div>
        <button onClick={() => onLogin(true)} className="px-8 py-3 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container transition-colors border border-outline-variant/10">
          Begin a New Adventure (Sign Up)
        </button>
      </div>
    </motion.main>
  </div>
);

// ─────────────────────────────────────────────────────────────
// RPG HERO SELECTION VIEW — FULL REDESIGN
// ─────────────────────────────────────────────────────────────

const HERO_CLASSES = [
  {
    id: "knight",
    name: "Guardian Knight",
    title: "Vanguard of the Realm",
    role: "Tank · Front-liner",
    roleIcon: "shield",
    weapon: "Broadsword & Tower Shield",
    weaponIcon: "swords",
    armor: "Full Plate Armor",
    lore: "An unbreakable fortress of steel and will. The Guardian Knight charges into battle first, shielding allies from harm with unyielding resolve. Masters of defensive arts and sacred oaths.",
    skills: [
      { name: "Iron Fortress", icon: "shield_locked", desc: "Raise shield, reducing all damage by 80% for 5s." },
      { name: "Holy Slash", icon: "swords", desc: "A blessed strike dealing 320% physical damage." },
      { name: "Shield Wall", icon: "security", desc: "Create a barrier that absorbs 500 HP for all allies." },
    ],
    stats: { HP: 5, ATK: 4, DEF: 5, SPD: 2, MAG: 1, DEX: 2 },
    color: "#f59e0b",
    colorDark: "#92400e",
    colorGlow: "rgba(245,158,11,0.4)",
    gradient: "from-amber-900 via-yellow-950 to-stone-950",
    accentBg: "rgba(245,158,11,0.15)",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCL9FpQzBy7WTNRwaqLdmud5FrfNVYsztTYEMuoTvSDN4trdHGX8BsZoC8h9RftfJEaB1zm4-wtEmtOdyfrreoEVEUDtbh7139WR5TX37wL802z3pqtmsrelDJSoVHynL-6JjWeTveofkrvSUQvnGVzNOiSgLd9SJqM2lDGy_P5VMbJvHVA3Tn-0GnrN16zUvQEagVlhNXjTXoU7R4F6SR_nJxV5sP1YfFmj4htEzERxKbjIlY65xOzQuYrkwH8lp1I2h1vlNUQ0Q",
  },
  {
    id: "mage",
    name: "Arcane Scholar",
    title: "Wielder of Ancient Forces",
    role: "Caster · Support",
    roleIcon: "auto_awesome",
    weapon: "Elemental Staff & Grimoire",
    weaponIcon: "magic_button",
    armor: "Enchanted Spellweave Robes",
    lore: "Bound to the cosmic threads of magic, the Arcane Scholar bends reality itself. Fragile of body but limitless in power — a single incantation can turn the tide of any battle.",
    skills: [
      { name: "Meteor Storm", icon: "local_fire_department", desc: "Rain meteors dealing 580% magic damage to all foes." },
      { name: "Arcane Barrier", icon: "bubbles", desc: "Conjure a shield absorbing 400 HP of magic damage." },
      { name: "Chain Lightning", icon: "bolt", desc: "Lightning arcs between enemies, dealing 220% each." },
    ],
    stats: { HP: 2, ATK: 2, DEF: 1, SPD: 3, MAG: 5, DEX: 3 },
    color: "#818cf8",
    colorDark: "#3730a3",
    colorGlow: "rgba(129,140,248,0.45)",
    gradient: "from-indigo-950 via-purple-950 to-slate-950",
    accentBg: "rgba(129,140,248,0.15)",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzbz7RSPIR4n6q7E2Dgwvs-p8NPasn3bR0W5oFjVGwp2lJRoCAO_bdeFNkFfSPodvuTUNV61s5KZByn3n-60uLTo1V6nAtqe-4L4dfjHa48CdeLQ62xdyuEHwThCjvXC8zRBC3NK7ltvIfNHm4O0U9bxjiijg9epPl8H064Sc7iKhGgR1mxqizzavjwPzuycR9VXNUjN7dHKYEImMWxHoMzVyCd_XZLlu5ifssDZku1W3fpVyIjZYuU8w8ulAnyI4CjA23D4rlVw",
    popular: true,
  },
  {
    id: "hunter",
    name: "Shadow Hunter",
    title: "Phantom of the Wilderness",
    role: "Assassin · Ranger",
    roleIcon: "crisis_alert",
    weapon: "Twin Daggers & Composite Bow",
    weaponIcon: "adjust",
    armor: "Shadowweave Leather",
    lore: "Moving like a whisper through darkness, the Shadow Hunter strikes from unseen angles. Masters of terrain and timing — they exploit every weakness with deadly precision and ghost-like speed.",
    skills: [
      { name: "Shadow Step", icon: "directions_run", desc: "Teleport behind target, dealing 240% backstab damage." },
      { name: "Poison Arrow", icon: "spa", desc: "Fire an arrow that poisons for 80 HP/s over 10s." },
      { name: "Death Mark", icon: "gps_fixed", desc: "Mark target — all damage against them +50% for 8s." },
    ],
    stats: { HP: 3, ATK: 4, DEF: 2, SPD: 5, MAG: 2, DEX: 5 },
    color: "#34d399",
    colorDark: "#065f46",
    colorGlow: "rgba(52,211,153,0.35)",
    gradient: "from-emerald-950 via-teal-950 to-slate-950",
    accentBg: "rgba(52,211,153,0.15)",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvkErGc5bi1DsLfeQ7iVg9xOD12k_ifDRZZgmELNZjkEG7nYk3IkNKkHBtnf9UhW9UPkz47UIV820PcSFhzk8kLcNoJg7691PTX9SPzyoG-7Hha2qsHb6QkJwTmi9Vf2MWLrt-0h2hj7FUnXmqupvbcn5Nt8KQUazpp6c8vyKOV4M93rb1jq9NO9QjCqCup5AqjVIHwVQVXQeXbu6sfDfHlWntx2ylYY0MndM2rllLlfGaI3cbaELcZLUBABlWvd7XrVptwXPEZw",
  },
];

const ROTATION_VIEWS = ["FRONT", "RIGHT", "BACK", "LEFT"] as const;
type RotationView = typeof ROTATION_VIEWS[number];

const ROTATION_LABELS: Record<RotationView, string> = {
  FRONT: "Front View",
  RIGHT: "Right Side",
  BACK: "Rear View",
  LEFT: "Left Side",
};

// Simulated "different angle" tint overlay per view
const ROTATION_TINT: Record<RotationView, string> = {
  FRONT: "opacity-0",
  RIGHT: "opacity-20 bg-black",
  BACK: "opacity-40 bg-slate-900",
  LEFT: "opacity-20 bg-black",
};

// ScaleX simulate "turning"
const ROTATION_SCALEX: Record<RotationView, number> = {
  FRONT: 1,
  RIGHT: 0.6,
  BACK: -1,
  LEFT: -0.6,
};

const StatBar = ({ label, value, max = 5, color }: { label: string; value: number; max?: number; color: string }) => (
  <div className="flex items-center gap-3">
    <span className="w-8 text-xs font-black uppercase tracking-wider" style={{ color }}>{label}</span>
    <div className="flex gap-1 flex-1">
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="h-2 flex-1 rounded-full overflow-hidden"
          style={{ background: i < value ? color : "rgba(255,255,255,0.1)" }}
        />
      ))}
    </div>
    <span className="text-xs font-black w-4 text-right" style={{ color }}>{value}/{max}</span>
  </div>
);

// Floating particles for the character showcase
const Particles = ({ color }: { color: string }) => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 3,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: color }}
          animate={{ y: [-20, -80, -20], opacity: [0, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

// Spinning ring around character pedestal
const PedestalRing = ({ color }: { color: string }) => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-12 pointer-events-none">
    <motion.div
      className="absolute inset-0 rounded-full border-2"
      style={{ borderColor: color, boxShadow: `0 0 20px ${color}` }}
      animate={{ rotateX: 70, scaleX: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute inset-2 rounded-full border"
      style={{ borderColor: color, opacity: 0.4 }}
      animate={{ rotateX: 70, scaleX: [1.05, 1, 1.05] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    />
  </div>
);

// ─────────── HERO SELECTION SCREEN ───────────
const HeroSelectionScreen = ({ onSelectHero }: { onSelectHero: (idx: number) => void }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f0c1a 0%, #1a0f2e 40%, #0c1a1a 100%)" }}>
      {/* Stars background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: Math.random() * 2 + 0.5,
              height: Math.random() * 2 + 0.5,
            }}
            animate={{ opacity: [0.1, 0.8, 0.1] }}
            transition={{ duration: Math.random() * 4 + 2, delay: Math.random() * 5, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-16 pb-8 px-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-black uppercase tracking-[0.4em] mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            ◆ CHARACTER CREATION ◆
          </p>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3" style={{
            background: "linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Choose Your Class
          </h1>
          <p className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            Each path demands a different kind of hero. Choose wisely.
          </p>
        </motion.div>
      </div>

      {/* Class Cards */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HERO_CLASSES.map((hero, i) => (
            <motion.div
              key={hero.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.15, duration: 0.5 }}
              onClick={() => onSelectHero(i)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="relative cursor-pointer rounded-2xl overflow-hidden border"
              style={{
                background: `linear-gradient(160deg, ${hero.accentBg} 0%, rgba(0,0,0,0.6) 100%)`,
                borderColor: hoveredIdx === i ? hero.color : "rgba(255,255,255,0.08)",
                boxShadow: hoveredIdx === i ? `0 0 40px ${hero.colorGlow}, inset 0 0 40px ${hero.accentBg}` : "0 8px 32px rgba(0,0,0,0.4)",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
            >
              {/* Popular badge */}
              {hero.popular && (
                <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: hero.color, color: "#000" }}>
                  POPULAR
                </div>
              )}

              {/* Character image */}
              <div className="relative h-56 flex items-end justify-center overflow-hidden">
                <div className="absolute inset-0" style={{
                  background: `radial-gradient(ellipse at 50% 100%, ${hero.colorGlow} 0%, transparent 70%)`,
                }} />
                <Particles color={hero.color} />
                <motion.img
                  src={hero.img}
                  referrerPolicy="no-referrer"
                  className="h-52 w-auto object-contain relative z-10 drop-shadow-2xl"
                  animate={{ y: hoveredIdx === i ? [0, -6, 0] : [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* Info */}
              <div className="p-6 pt-4">
                {/* Role badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: hero.accentBg }}>
                    <MaterialIcon name={hero.roleIcon} className="text-sm" style={{ color: hero.color } as any} fill />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: hero.color }}>{hero.role}</span>
                </div>

                <h3 className="text-2xl font-black text-white mb-1">{hero.name}</h3>
                <p className="text-xs font-medium mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>{hero.title}</p>

                {/* Weapon & Armor */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                    <MaterialIcon name={hero.weaponIcon} className="text-sm" style={{ color: hero.color } as any} fill />
                    <span>{hero.weapon}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                    <MaterialIcon name="checkroom" className="text-sm" style={{ color: hero.color } as any} />
                    <span>{hero.armor}</span>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="space-y-2">
                  {Object.entries(hero.stats).slice(0, 3).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-8 text-xs font-black uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>{key}</span>
                      <div className="flex gap-0.5 flex-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div key={idx} className="h-1.5 flex-1 rounded-full"
                            style={{ background: idx < val ? hero.color : "rgba(255,255,255,0.1)" }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Select button */}
                <motion.div
                  className="mt-5 w-full py-3 rounded-xl text-center text-sm font-black uppercase tracking-widest"
                  style={{
                    background: hoveredIdx === i ? hero.color : "rgba(255,255,255,0.08)",
                    color: hoveredIdx === i ? "#000" : hero.color,
                    transition: "background 0.3s, color 0.3s",
                  }}
                >
                  {hoveredIdx === i ? "Customize →" : "Select Class"}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────── HERO CUSTOMIZATION SCREEN ───────────
const HeroCustomizationScreen = ({ heroIdx, onBack, onComplete }: { heroIdx: number; onBack: () => void; onComplete: () => void }) => {
  const hero = HERO_CLASSES[heroIdx];
  const [viewIdx, setViewIdx] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [rotDir, setRotDir] = useState<"left" | "right">("right");
  const [customization, setCustomization] = useState({
    hairColor: "Natural",
    outfit: hero.armor.split(" ")[0],
    accessory: "None",
    weaponSkin: "Standard",
    name: "",
  });

  const currentView = ROTATION_VIEWS[viewIdx];

  const handleRotate = (dir: "left" | "right") => {
    if (isRotating) return;
    setRotDir(dir);
    setIsRotating(true);
    setTimeout(() => {
      setViewIdx((prev) => (dir === "right" ? (prev + 1) % 4 : (prev + 3) % 4));
    }, 200);
    setTimeout(() => setIsRotating(false), 400);
  };

  // Auto slow rotation
  useEffect(() => {
    const t = setInterval(() => {
      if (!isRotating) handleRotate("right");
    }, 4000);
    return () => clearInterval(t);
  }, [isRotating, viewIdx]);

  const hairColors = [
    { name: "Natural", hex: "#92400e" },
    { name: "Crimson", hex: "#dc2626" },
    { name: "Azure", hex: "#3b82f6" },
    { name: "Golden", hex: "#f59e0b" },
    { name: "Midnight", hex: "#1e1b4b" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Amethyst", hex: "#7c3aed" },
    { name: "Rose", hex: "#fb7185" },
    { name: "Silver", hex: "#94a3b8" },
    { name: "Void", hex: "#0f172a" },
  ];

  const outfits = ["Standard", "Reinforced", "Ceremonial", "Shadow"];
  const accessories = ["None", "Battle Cape", "Honor Medal", "War Insignia"];
  const weaponSkins = ["Standard", "Obsidian", "Radiant", "Infernal"];

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, #0f0c1a 0%, #1a0f2e 40%, #0c1a1a 100%)` }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/3 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: hero.colorGlow, opacity: 0.15 }} />
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div key={i} className="absolute rounded-full bg-white"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: Math.random() * 1.5 + 0.5, height: Math.random() * 1.5 + 0.5 }}
            animate={{ opacity: [0.05, 0.4, 0.05] }}
            transition={{ duration: Math.random() * 4 + 2, delay: Math.random() * 5, repeat: Infinity }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition-all"
            style={{ color: hero.color, background: hero.accentBg }}
          >
            <MaterialIcon name="arrow_back" className="text-sm" />
            Change Class
          </button>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: "rgba(255,255,255,0.35)" }}>CUSTOMIZATION</p>
            <h2 className="text-2xl font-black text-white">{hero.name}</h2>
          </div>
          <div className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ background: hero.accentBg, color: hero.color }}>
            {hero.role}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT PANEL: Character Viewer ── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* 3D Character Viewer */}
            <div className="relative rounded-2xl overflow-hidden border" style={{
              background: `linear-gradient(160deg, rgba(0,0,0,0.7) 0%, ${hero.accentBg} 100%)`,
              borderColor: "rgba(255,255,255,0.08)",
              minHeight: 380,
            }}>
              {/* View angle indicator */}
              <div className="absolute top-4 left-0 right-0 flex justify-center z-20">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.5)", color: hero.color }}>
                  <MaterialIcon name="360" className="text-sm" />
                  {ROTATION_LABELS[currentView]}
                </div>
              </div>

              {/* Angle compass dots */}
              <div className="absolute top-14 left-0 right-0 flex justify-center gap-2 z-20">
                {ROTATION_VIEWS.map((v, i) => (
                  <button key={v} onClick={() => { if (!isRotating) { setViewIdx(i); } }}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i === viewIdx ? hero.color : "rgba(255,255,255,0.2)", transform: i === viewIdx ? "scale(1.4)" : "scale(1)" }}
                  />
                ))}
              </div>

              <Particles color={hero.color} />

              {/* Glow behind character */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: hero.colorGlow, opacity: 0.4 }} />

              {/* Character */}
              <div className="flex items-center justify-center h-72 relative">
                <motion.div
                  className="relative"
                  animate={{
                    scaleX: isRotating ? (rotDir === "right" ? 0 : 0) : ROTATION_SCALEX[currentView],
                    opacity: isRotating ? 0 : 1,
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  {/* Shadow/tint overlay for side/back views */}
                  <div className={`absolute inset-0 rounded-full pointer-events-none z-10 ${ROTATION_TINT[currentView]}`}
                    style={{ mixBlendMode: "multiply" }} />
                  <motion.img
                    src={hero.img}
                    referrerPolicy="no-referrer"
                    className="h-64 w-auto object-contain drop-shadow-2xl relative z-0"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>

              {/* Pedestal ring */}
              <PedestalRing color={hero.color} />

              {/* Rotation Controls */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-between px-6 z-20">
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleRotate("left")}
                  disabled={isRotating}
                  className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.6)", border: `1px solid ${hero.color}`, color: hero.color }}
                >
                  <MaterialIcon name="chevron_left" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleRotate("right")}
                  disabled={isRotating}
                  className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.6)", border: `1px solid ${hero.color}`, color: hero.color }}
                >
                  <MaterialIcon name="chevron_right" />
                </motion.button>
              </div>
            </div>

            {/* Character Name Input */}
            <div className="rounded-2xl p-4 border" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.08)" }}>
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: hero.color }}>
                ◆ Hero Name
              </label>
              <input
                value={customization.name}
                onChange={(e) => setCustomization((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter your legend's name..."
                className="w-full bg-transparent text-white font-bold text-lg border-b-2 pb-1 outline-none placeholder:text-white/20 focus:border-opacity-100"
                style={{ borderColor: hero.color + "66" }}
              />
            </div>

            {/* Equipment Preview */}
            <div className="rounded-2xl p-4 border" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: hero.color }}>◆ Equipment</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: hero.accentBg }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <MaterialIcon name={hero.weaponIcon} className="text-sm" style={{ color: hero.color } as any} fill />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{hero.weapon}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{customization.weaponSkin} Skin</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <MaterialIcon name="shield" className="text-sm" style={{ color: hero.color } as any} fill />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{hero.armor}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{customization.outfit} Style</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── MIDDLE PANEL: Stats & Skills ── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Stats */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: hero.color }}>◆ Battle Stats</p>
              <AnimatePresence mode="wait">
                <motion.div key={heroIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {Object.entries(hero.stats).map(([key, val]) => (
                    <StatBar key={key} label={key} value={val} color={hero.color} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Overall rating */}
              <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Combat Power</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black" style={{ color: hero.color }}>
                    {Object.values(hero.stats).reduce((a, b) => a + b, 0) * 420 + 1200}
                  </span>
                  <MaterialIcon name="bolt" fill style={{ color: hero.color } as any} />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: hero.color }}>◆ Class Skills</p>
              <div className="space-y-3">
                {hero.skills.map((skill, i) => (
                  <motion.div key={skill.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: hero.accentBg }}>
                      <MaterialIcon name={skill.icon} className="text-sm" style={{ color: hero.color } as any} fill />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white mb-0.5">{skill.name}</p>
                      <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{skill.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Lore */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: hero.color }}>◆ Class Lore</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{hero.lore}</p>
            </div>
          </div>

          {/* ── RIGHT PANEL: Customization ── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Hair Color */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: hero.color }}>◆ Hair Color</p>
              <div className="flex flex-wrap gap-3">
                {hairColors.map((h) => (
                  <motion.button
                    key={h.name}
                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setCustomization((p) => ({ ...p, hairColor: h.name }))}
                    title={h.name}
                    className="w-8 h-8 rounded-full relative"
                    style={{
                      background: h.hex,
                      border: customization.hairColor === h.name ? `2px solid ${hero.color}` : "2px solid transparent",
                      boxShadow: customization.hairColor === h.name ? `0 0 12px ${hero.colorGlow}` : "none",
                    }}
                  >
                    {customization.hairColor === h.name && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <MaterialIcon name="check" className="text-white text-sm drop-shadow" />
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Outfit */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: hero.color }}>◆ Outfit Style</p>
              <div className="grid grid-cols-2 gap-2">
                {outfits.map((o) => (
                  <motion.button
                    key={o}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setCustomization((p) => ({ ...p, outfit: o }))}
                    className="py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    style={{
                      background: customization.outfit === o ? hero.color : "rgba(255,255,255,0.05)",
                      color: customization.outfit === o ? "#000" : "rgba(255,255,255,0.5)",
                      border: customization.outfit === o ? `1px solid ${hero.color}` : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: customization.outfit === o ? `0 4px 20px ${hero.colorGlow}` : "none",
                    }}
                  >{o}</motion.button>
                ))}
              </div>
            </div>

            {/* Weapon Skin */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: hero.color }}>◆ Weapon Skin</p>
              <div className="grid grid-cols-2 gap-2">
                {weaponSkins.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setCustomization((p) => ({ ...p, weaponSkin: s }))}
                    className="py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    style={{
                      background: customization.weaponSkin === s ? hero.color : "rgba(255,255,255,0.05)",
                      color: customization.weaponSkin === s ? "#000" : "rgba(255,255,255,0.5)",
                      border: customization.weaponSkin === s ? `1px solid ${hero.color}` : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: customization.weaponSkin === s ? `0 4px 20px ${hero.colorGlow}` : "none",
                    }}
                  >{s}</motion.button>
                ))}
              </div>
            </div>

            {/* Accessories */}
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: hero.color }}>◆ Accessories</p>
              <div className="grid grid-cols-2 gap-2">
                {accessories.map((a) => (
                  <motion.button
                    key={a}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setCustomization((p) => ({ ...p, accessory: a }))}
                    className="py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    style={{
                      background: customization.accessory === a ? hero.color : "rgba(255,255,255,0.05)",
                      color: customization.accessory === a ? "#000" : "rgba(255,255,255,0.5)",
                      border: customization.accessory === a ? `1px solid ${hero.color}` : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: customization.accessory === a ? `0 4px 20px ${hero.colorGlow}` : "none",
                    }}
                  >{a}</motion.button>
                ))}
              </div>
            </div>

            {/* Complete button */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              className="relative w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${hero.color} 0%, ${hero.colorDark} 100%)`,
                color: "#fff",
                boxShadow: `0 8px 40px ${hero.colorGlow}`,
              }}
            >
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <MaterialIcon name="celebration" fill />
                Begin Your Legend
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Wrapper component (replaces old HeroSelectionView) ──
const HeroSelectionView = ({ onSelect }: { onSelect: () => void }) => {
  const [selectedHeroIdx, setSelectedHeroIdx] = useState<number | null>(null);

  if (selectedHeroIdx === null) {
    return <HeroSelectionScreen onSelectHero={setSelectedHeroIdx} />;
  }
  return (
    <HeroCustomizationScreen
      heroIdx={selectedHeroIdx}
      onBack={() => setSelectedHeroIdx(null)}
      onComplete={onSelect}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// REMAINING VIEWS (unchanged)
// ─────────────────────────────────────────────────────────────

const AdminView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div>
        <h1 className="text-5xl font-black text-on-surface tracking-tighter mb-2">Guild Master Panel</h1>
        <p className="text-on-surface-variant font-medium text-lg">Managing the elite heroes of Maple Academy</p>
      </div>
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <MaterialIcon name="campaign" /> Global Announcement
        </button>
        <button className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <MaterialIcon name="redeem" /> Distribute Loot
        </button>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {[
        { label: "Total XP Gained", value: "1,284,500", unit: "EXP", icon: "trending_up", color: "primary", progress: 75 },
        { label: "Active Heroes", value: "42", unit: "Online", icon: "groups", color: "secondary", sub: "8 guilds represented" },
        { label: "Quest Success Rate", value: "98.2", unit: "%", icon: "verified", color: "tertiary", sub: "+2.4% from last moon cycle" },
      ].map((stat, i) => (
        <div key={i} className={`bg-${stat.color}-container/20 p-8 rounded-xl border-b-8 border-${stat.color}/20 bubbly-shadow relative overflow-hidden group`}>
          <div className={`absolute -right-4 -top-4 text-${stat.color}/10 group-hover:rotate-12 transition-transform duration-500`}>
            <MaterialIcon name={stat.icon} className="text-9xl" fill />
          </div>
          <p className={`text-${stat.color} font-bold uppercase tracking-widest text-sm mb-1`}>{stat.label}</p>
          <h3 className={`text-4xl font-black text-on-${stat.color}-container`}>{stat.value} <span className="text-xl font-bold opacity-70">{stat.unit}</span></h3>
          {stat.progress && (<div className="mt-4 h-2 w-full bg-white/50 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${stat.progress}%` }}></div></div>)}
          {stat.sub && <p className={`mt-2 text-on-${stat.color}-container/70 text-sm font-medium italic`}>{stat.sub}</p>}
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-surface-container-lowest rounded-xl bubbly-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  {["Hero", "Job Class", "Level", "Action"].map(h => (
                    <th key={h} className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {[
                  { name: "Zekrom Knight", time: "Active 2m ago", class: "Guardian Knight", level: 124, color: "primary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD71gjDDm5bpoj6xvSMLLx9fillxCUhyei67qU8Fy6ht6her7OWSPRDBiQmF8Z6uGnZui_5CPxrhK16tHEuiwvurp78kd375dOABUB4Cus238spkTXyCH-E1k3i3sVtmXDuVDvMQnM07xZj19vTZ5e45HRwpQYLCpcEl2xLk1V7WcyPQG5i3p9hD4BscY8i_WarIQzAjunVp08zyOa88_jVIXZzCYVaoAHYUSIz-fX1lbRi4BQhSWsW_dwxqPy6nLZXG5TFInbEXg" },
                  { name: "Starry Sorceress", time: "Active 15m ago", class: "Arcane Scholar", level: 118, color: "secondary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzKVkelGYHL-QZK-7vZao4JKWSYbO72cYkyThn_ZAto056fiLPdhd3F_2tgMmf2Hp0IBBPx_7sgz9tcwFmm5Ih_KzYisqLiOKgcrzrOdtNj1cFKKJClhf7n4ndnFwTBGkBvpxhY4TlkbrpGnYHL0o6fnQiBKRr2gJhJJ9otcUdQq2K-S5WqdRX48E2_OQJ-s8VgJb_KU7-kIc8Z4ZfFIDS-tdBN-LzsGH8r7HXKk3mKUOo9x7BcjDgqDUL7AHadYMvpuG9_wQr3A" },
                  { name: "Shadow Blade", time: "Resting", class: "Shadow Hunter", level: 102, color: "tertiary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAx9b5Zix35xAHw3hMvEDZoT38901GttvDU8G9bu8CqUHWdXrD4esonev-gl7-CZveEleEqSDKcWG3Ioz0Vk-GrCZIY21fDgZ3903ZkAW-euppedHwc5Wv-GsdqUdYourS1NbDgNgyt0abnmyGMXymbVC-EKQibx0WVV5QE0G-48TJA8ST8xcr0QojFv0ERuJAFazkYNJpWLzmqGvApdiQo1JUECmoGEr7EwdX5Tc18BpiGu9L6rmKVpkZDq3o67KtCu8qvqlYO9w" },
                ].map((hero, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full" src={hero.img} referrerPolicy="no-referrer" />
                      <div><p className="font-bold">{hero.name}</p><p className="text-xs text-on-surface-variant">{hero.time}</p></div>
                    </td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 bg-${hero.color}-container text-${hero.color} rounded-full text-xs font-bold`}>{hero.class}</span></td>
                    <td className="px-6 py-4 font-black">Lv. {hero.level}</td>
                    <td className="px-6 py-4 text-right"><button className="p-2 hover:bg-white rounded-full transition-all"><MaterialIcon name="more_horiz" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div>
        <div className="bg-surface-container-highest/50 backdrop-blur-md p-8 rounded-xl bubbly-shadow border-t-4 border-primary">
          <h2 className="text-xl font-black text-on-surface mb-5">Create New Quest</h2>
          <form className="space-y-5">
            <input className="w-full bg-white/80 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 font-medium" placeholder="Quest Title" type="text" />
            <div className="grid grid-cols-3 gap-2">
              {["EASY", "ELITE", "CHAOS"].map(d => (
                <button key={d} className="py-2 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-xs" type="button">{d}</button>
              ))}
            </div>
            <button className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-black rounded-xl" type="submit">Post to Bulletin</button>
          </form>
        </div>
      </div>
    </div>
  </div>
);

const QuestsView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="mb-12">
      <h1 className="text-5xl font-black text-on-surface tracking-tight">Available Quests</h1>
      <p className="text-on-surface-variant mt-2">Embark on legendary training missions to level up your professional skills.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {[
        { title: "Aegis Operations", desc: "Master core security protocols and defensive strategies.", progress: 65, xp: "1,200 XP", icon: "shield", color: "tertiary", tag: "Normal" },
        { title: "Market Alchemy", desc: "Transmute raw data into powerful business insights.", progress: 12, xp: "4,500 XP", icon: "science", color: "secondary", tag: "Hard" },
        { title: "Novice Rituals", desc: "Learn daily incantations for effective team collaboration.", progress: 98, xp: "350 XP", icon: "magic_button", color: "primary", tag: "Easy" },
        { title: "Sprint Battle", desc: "Enter the arena of rapid development.", progress: 0, xp: "2,100 XP", icon: "swords", color: "tertiary", tag: "Normal" },
        { title: "Vault Organization", desc: "Master the inventory system of our company cloud.", progress: 40, xp: "800 XP", icon: "backpack", color: "secondary", tag: "Easy" },
      ].map((quest, i) => (
        <div key={i} className="group bg-surface-container-lowest p-8 rounded-xl shadow-lg hover:-translate-y-2 transition-all duration-300 border border-transparent hover:border-primary-container/30">
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 bg-surface-container-high rounded-lg flex items-center justify-center shadow-inner">
              <MaterialIcon name={quest.icon} className="text-4xl text-primary" fill />
            </div>
            <span className={`px-3 py-1 bg-${quest.color}-container text-on-${quest.color}-container text-xs font-black rounded-full uppercase`}>{quest.tag}</span>
          </div>
          <h3 className="text-xl font-extrabold text-on-surface mb-2">{quest.title}</h3>
          <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">{quest.desc}</p>
          <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-tertiary to-tertiary-fixed rounded-full" style={{ width: `${quest.progress}%` }}></div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-surface-container">
            <span className="font-black text-rose-900">{quest.xp}</span>
            <button className="text-primary font-extrabold flex items-center gap-1">Resume <MaterialIcon name="arrow_forward_ios" className="text-sm" /></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HomeView = ({ setView }: { setView: (v: View) => void }) => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="flex flex-col lg:flex-row gap-8 mb-12">
      <div className="flex-1 bg-white/80 backdrop-blur-md p-10 rounded-[3rem] bubbly-shadow border border-white/40">
        <h1 className="text-5xl font-black text-on-surface tracking-tight mb-4">Welcome Home, Hero!</h1>
        <p className="text-xl text-on-surface-variant mb-8 leading-relaxed">Your adventure in Maple Academy is just beginning. New missions await.</p>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => setView("quests")} className="px-10 py-4 bubbly-gradient text-white font-black rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
            <MaterialIcon name="swords" /> Start Questing
          </button>
          <button onClick={() => setView("inventory")} className="px-10 py-4 bg-white text-primary font-black rounded-full shadow-lg border border-rose-100 hover:bg-rose-50 transition-all flex items-center gap-2">
            <MaterialIcon name="backpack" /> Check Gear
          </button>
        </div>
      </div>
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-gradient-to-br from-secondary to-secondary-dim p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Current Rank</p>
          <h3 className="text-3xl font-black mb-4">#1,284</h3>
          <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
            <MaterialIcon name="trending_up" className="text-sm" /> +12 spots today
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-rose-100">
          <h4 className="font-black text-on-surface mb-4 flex items-center gap-2"><MaterialIcon name="bolt" className="text-primary" fill />Quick Stats</h4>
          {[{ label: "Strength", val: 12 }, { label: "Intelligence", val: 18 }, { label: "Agility", val: 15 }].map(s => (
            <div key={s.label} className="mb-3">
              <div className="flex justify-between text-xs font-bold uppercase text-on-surface-variant mb-1"><span>{s.label}</span><span>{s.val}</span></div>
              <div className="h-2 w-full bg-rose-50 rounded-full overflow-hidden"><div className="h-full bg-rose-400" style={{ width: `${(s.val / 20) * 100}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LeaderboardView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="text-center mb-16">
      <h1 className="text-6xl font-black text-on-surface tracking-tight mb-4">Top Heroes</h1>
      <p className="text-on-surface-variant font-medium text-lg">The most elite warriors and mages in the academy.</p>
    </div>
    <div className="bg-white/80 backdrop-blur-md rounded-[3rem] bubbly-shadow overflow-hidden border border-white/40">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low">
          <tr>{["Rank", "Hero", "Class", "Level", "Power"].map(h => <th key={h} className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-rose-100/50">
          {[
            { rank: 1, name: "Zekrom Knight", cls: "Guardian Knight", level: 124, score: 18400 },
            { rank: 2, name: "Starry Sorceress", cls: "Arcane Scholar", level: 118, score: 16200 },
            { rank: 3, name: "Shadow Blade", cls: "Shadow Hunter", level: 102, score: 14100 },
            { rank: 4, name: "Aria Archer", cls: "Shadow Hunter", level: 95, score: 12450 },
          ].map((hero) => (
            <tr key={hero.rank} className="hover:bg-rose-50/30 transition-colors">
              <td className="px-8 py-5 font-black text-on-surface-variant">#{hero.rank}</td>
              <td className="px-8 py-5 font-bold text-on-surface">{hero.name}</td>
              <td className="px-8 py-5"><span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-on-surface-variant">{hero.cls}</span></td>
              <td className="px-8 py-5 font-bold text-primary">Lv. {hero.level}</td>
              <td className="px-8 py-5 text-right font-black text-on-surface">{hero.score.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const InventoryView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <h1 className="text-5xl font-black text-on-surface tracking-tight mb-10">Inventory</h1>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {[
        { name: "Broadsword", type: "Weapon", icon: "swords", color: "amber" },
        { name: "Health Potion", type: "Consumable", icon: "pill", color: "rose" },
        { name: "Mana Elixir", type: "Consumable", icon: "science", color: "blue" },
        { name: "Tower Shield", type: "Armor", icon: "shield", color: "slate" },
        { name: "Old Map", type: "Quest", icon: "map", color: "amber" },
        { name: "Magic Staff", type: "Weapon", icon: "magic_button", color: "purple" },
        { name: "Shadow Daggers", type: "Weapon", icon: "adjust", color: "emerald" },
        { name: "Golden Key", type: "Quest", icon: "key", color: "yellow" },
        { name: "Phoenix Down", type: "Consumable", icon: "local_fire_department", color: "red" },
        { name: "Plate Armor", type: "Armor", icon: "checkroom", color: "slate" },
        { name: "Composite Bow", type: "Weapon", icon: "crisis_alert", color: "green" },
        { name: "Grimoire", type: "Weapon", icon: "auto_stories", color: "indigo" },
      ].map((item, i) => (
        <div key={i} className="group bg-white/80 p-4 rounded-3xl bubbly-shadow hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden">
          <div className="aspect-square bg-surface-container-low rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <MaterialIcon name={item.icon} className={`text-4xl text-${item.color}-500`} fill />
          </div>
          <h4 className="font-black text-on-surface text-sm truncate">{item.name}</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{item.type}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("login");

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  if (view === "login") {
    return <LoginView onLogin={(isNew) => setView(isNew ? "hero-selection" : "home")} />;
  }

  if (view === "hero-selection") {
    return <HeroSelectionView onSelect={() => setView("home")} />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopBar setView={setView} />
      <Sidebar currentView={view} setView={setView} />
      <main className="lg:ml-64 pt-28 pb-12 px-8 min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <img alt="Library Background" className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7zbNjUvXhjDq5TurbB9wl0aCu8AwvQnTlAqEtnmbW5hHFIE27Xft3ugXDb3ZCKv91SMC1VDD1CWj5jrzCJhhMC8b8ySOCMMtW0FJIZsC7PFVJhv6Zz9JHDZlJtpF5wehLw1M1nXaXd6KDKhPOSM4okknSLueyT-yFVvdscBG2O4vPw-fePN6TKXhvBRJ2cNah5lPwh7bUDfZt-l9HK2eKpfWQHSwpJ5mZM-1bxHYQ1yalRxsCXRdI2CAfG_yFeO4IAIOkvqVL8Q"
            referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/90 via-surface/60 to-surface"></div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            {view === "admin" && <AdminView />}
            {view === "quests" && <QuestsView />}
            {view === "leaderboard" && <LeaderboardView />}
            {view === "inventory" && <InventoryView />}
            {view === "home" && <HomeView setView={setView} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg flex justify-around items-center py-4 z-50 rounded-t-[2.5rem] shadow-xl px-6">
        {[
          { id: "home", icon: "home", label: "Home" },
          { id: "quests", icon: "foundation", label: "Quests" },
          { id: "admin", icon: "shield_person", label: "Admin", special: true },
          { id: "leaderboard", icon: "leaderboard", label: "Rank" },
          { id: "inventory", icon: "backpack", label: "Items" },
        ].map((item) => (
          <button key={item.id} onClick={() => setView(item.id as View)}
            className={`flex flex-col items-center gap-1 ${item.special ? "bg-primary-container text-on-primary-container p-3 rounded-full -mt-10 shadow-lg" : "text-rose-400"}`}>
            <MaterialIcon name={item.icon} fill={item.special || view === item.id} />
            {!item.special && <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
