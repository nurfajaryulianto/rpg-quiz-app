import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

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
        <button className="w-full py-4 px-6 bg-white text-primary font-bold rounded-xl shadow-sm border-b-4 border-rose-100 active:border-b-0 active:translate-y-1 transition-all mb-4">
          Join a Guild
        </button>
        <div className="border-t border-rose-100/50 pt-4">
          <button className="w-full text-rose-700/70 px-6 py-2 flex items-center gap-4 hover:bg-rose-100/50 rounded-full transition-all">
            <MaterialIcon name="settings" className="text-sm" />
            <span className="text-sm font-semibold">Settings</span>
          </button>
          <button 
            onClick={() => setView("login")}
            className="w-full text-rose-700/70 px-6 py-2 flex items-center gap-4 hover:bg-rose-100/50 rounded-full transition-all"
          >
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
          <img 
            alt="Profile Avatar" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4STRjeUJGo0MA2Ba-NbNSZcXPUAQW1a-O56k77puIuKMPutm9-JJt5MhOcjjXB6fCRtKFbaq9DZTRNrvxMO2kiz2-qG0frIKet0uYQnqxFb_DQz5msXobrAJKTjhHOGAj6uILiz9R518p6bHXbeohDD703lUtocBOpQ5M8zQGQTZ892UCzw-D_Cqi0yZQEZLTRyXS1iwwrYVnDBbdCx7NEpXEUg1mvxkHBAzQedA79_ezaG-f6AiGUSIYK9cSKx9f0-bcbITH9w"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  </header>
);

const LoginView = ({ onLogin }: { onLogin: (isNew?: boolean) => void }) => (
  <div className="h-screen w-full flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 z-0">
      <img 
        alt="Magical village sunset" 
        className="w-full h-full object-cover" 
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtqCTrL_wTcVSYY556MNgZxdDLAYsH7T0bxbLAyYHG_8YFoZYWztIsm8fZZ883sM3bg9i4xn4IgYzb_izW9F3RGY_ZZOth_SpCen_-tUCtdyzTBrFL06GgNZgrjsSZa0-5oky1ypkd0cXAK5dlXCXVCdyxntENo0eddv_AmRG2_yc7wsOOUK8v2pvLUL_NMicmmakXRZ6uEKKSXpPU3h2gul6sSJm9-HupChPgYrB9uGEKTGpSEbSzX7uqmgou_QrB9_DAFl3p3g"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/20 to-surface/60"></div>
    </div>
    
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 w-full max-w-lg px-6"
    >
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
              <input 
                className="w-full pl-12 pr-6 py-4 rounded-lg bg-surface-container-highest border-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-semibold placeholder:text-outline-variant/60" 
                placeholder="Enter your name..." 
                type="text"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-on-surface-variant ml-2">Secret Code</label>
            <div className="relative group">
              <MaterialIcon name="key" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" />
              <input 
                className="w-full pl-12 pr-6 py-4 rounded-lg bg-surface-container-highest border-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-semibold placeholder:text-outline-variant/60" 
                placeholder="••••••••" 
                type="password"
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input className="w-5 h-5 rounded-md text-primary bg-surface-container-highest border-none focus:ring-offset-0 focus:ring-primary/20" type="checkbox" />
              <span className="text-sm font-semibold text-on-surface-variant">Stay Prepared</span>
            </label>
            <button type="button" className="text-sm font-bold text-primary hover:text-primary-dim transition-colors">Lost your way?</button>
          </div>
          <button className="w-full bubbly-gradient text-white py-5 rounded-full font-black text-xl shadow-lg shadow-primary-container/40 active:scale-95 transition-all relative overflow-hidden group" type="submit">
            <div className="absolute inset-0 glossy-overlay opacity-50"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Enter World
              <MaterialIcon name="rocket_launch" fill />
            </span>
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

const AdminView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div>
        <h1 className="text-5xl font-black text-on-surface tracking-tighter mb-2">Guild Master Panel</h1>
        <p className="text-on-surface-variant font-medium text-lg">Managing the elite heroes of Maple Academy</p>
      </div>
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl shadow-lg shadow-secondary/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <MaterialIcon name="campaign" />
          Global Announcement
        </button>
        <button className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <MaterialIcon name="redeem" />
          Distribute Loot
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
          {stat.progress && (
            <div className="mt-4 h-2 w-full bg-white/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${stat.progress}%` }}></div>
            </div>
          )}
          {stat.sub && <p className={`mt-2 text-on-${stat.color}-container/70 text-sm font-medium italic`}>{stat.sub}</p>}
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <MaterialIcon name="menu_book" />
            </span>
            Warlord Registry
          </h2>
          <span className="text-on-surface-variant font-bold text-sm bg-surface-container px-4 py-1 rounded-full">34 Total Members</span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl bubbly-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Hero</th>
                  <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Job Class</th>
                  <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase">Level</th>
                  <th className="px-6 py-4 text-on-surface-variant font-bold text-sm uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {[
                  { name: "Zekrom Knight", time: "Active 2m ago", class: "Warlord", level: 124, color: "primary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD71gjDDm5bpoj6xvSMLLx9fillxCUhyei67qU8Fy6ht6her7OWSPRDBiQmF8Z6uGnZui_5CPxrhK16tHEuiwvurp78kd375dOABUB4Cus238spkTXyCH-E1k3i3sVtmXDuVDvMQnM07xZj19vTZ5e45HRwpQYLCpcEl2xLk1V7WcyPQG5i3p9hD4BscY8i_WarIQzAjunVp08zyOa88_jVIXZzCYVaoAHYUSIz-fX1lbRi4BQhSWsW_dwxqPy6nLZXG5TFInbEXg" },
                  { name: "Starry Sorceress", time: "Active 15m ago", class: "Arch Mage", level: 118, color: "secondary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzKVkelGYHL-QZK-7vZao4JKWSYbO72cYkyThn_ZAto056fiLPdhd3F_2tgMmf2Hp0IBBPx_7sgz9tcwFmm5Ih_KzYisqLiOKgcrzrOdtNj1cFKKJClhf7n4ndnFwTBGkBvpxhY4TlkbrpGnYHL0o6fnQiBKRr2gJhJJ9otcUdQq2K-S5WqdRX48E2_OQJ-s8VgJb_KU7-kIc8Z4ZfFIDS-tdBN-LzsGH8r7HXKk3mKUOo9x7BcjDgqDUL7AHadYMvpuG9_wQr3A" },
                  { name: "Shadow Blade", time: "Resting", class: "Night Walker", level: 102, color: "tertiary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAx9b5Zix35xAHw3hMvEDZoT38901GttvDU8G9bu8CqUHWdXrD4esonev-gl7-CZveEleEqSDKcWG3Ioz0Vk-GrCZIY21fDgZ3903ZkAW-euppedHwc5Wv-GsdqUdYourS1NbDgNgyt0abnmyGMXymbVC-EKQibx0WVV5QE0G-48TJA8ST8xcr0QojFv0ERuJAFazkYNJpWLzmqGvApdiQo1JUECmoGEr7EwdX5Tc18BpiGu9L6rmKVpkZDq3o67KtCu8qvqlYO9w" },
                  { name: "Aria Archer", time: "In Quest", class: "Wind Breaker", level: 95, color: "orange", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBL_vigweqQn3qmIaZLyIdYBnIFF3aqRE_LVacCyr9ZOq7YGMDHQYjonA-ewx04E7cHu-kgphIzfUPQP6mZzY8MrWJWu28AUIfgPR2QUMTbJoFV8PeWQ61qonfI6SosZhpZPcV6o4A0g-Sdd4MSvNiLfKPatArSxhnNcESthKBwBQ7S0uCnnFeMXDmozDrt4esuqLbvJ8sNcdwN-5DP8NbWig5ErS0Ew9ma2l-PNoC4RtC8Tj_kdjJa08N7hQ5_2qIiOoUESVDCAw" },
                ].map((hero, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full bg-surface-container" src={hero.img} referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-bold">{hero.name}</p>
                        <p className="text-xs text-on-surface-variant">{hero.time}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 bg-${hero.color}-container text-${hero.color} rounded-full text-xs font-bold border border-${hero.color}/20`}>{hero.class}</span>
                    </td>
                    <td className="px-6 py-4 font-black text-on-surface">Lv. {hero.level}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-white rounded-full transition-all text-on-surface-variant hover:text-primary">
                        <MaterialIcon name="more_horiz" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface-container-low text-center">
            <button className="text-primary font-bold text-sm hover:underline">View All Heroes (34)</button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
            <MaterialIcon name="edit_note" />
          </span>
          Create New Quest
        </h2>
        <div className="bg-surface-container-highest/50 backdrop-blur-md p-8 rounded-xl bubbly-shadow border-t-4 border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <MaterialIcon name="auto_awesome" className="text-8xl" />
          </div>
          <form className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Quest Title</label>
              <input className="w-full bg-white/80 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/40 font-medium" placeholder="e.g. Slime Invasion Crisis" type="text" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                <button className="py-2 bg-tertiary-container text-on-tertiary-container rounded-lg font-bold text-xs border-b-4 border-tertiary/20" type="button">EASY</button>
                <button className="py-2 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-xs border-b-4 border-secondary/20" type="button">ELITE</button>
                <button className="py-2 bg-primary/10 text-primary rounded-lg font-bold text-xs border-b-4 border-primary/10" type="button">CHAOS</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Loot Rewards</label>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-bold border border-outline-variant/30 flex items-center gap-1">
                  <MaterialIcon name="monetization_on" className="text-sm text-yellow-600" /> 500 Gold
                </span>
                <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-bold border border-outline-variant/30 flex items-center gap-1">
                  <MaterialIcon name="mystery" className="text-sm text-blue-600" /> 2x EXP
                </span>
                <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-dashed border-outline hover:bg-white/80" type="button">
                  <MaterialIcon name="add" className="text-sm" />
                </button>
              </div>
            </div>
            <div className="pt-4">
              <button className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-black rounded-xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest" type="submit">
                Post to Bulletin
              </button>
            </div>
          </form>
        </div>
        <div className="bg-white p-6 rounded-xl bubbly-shadow flex items-center gap-4 relative">
          <div className="absolute -top-4 -right-2 transform rotate-12">
            <MaterialIcon name="eco" className="text-4xl text-green-500" />
          </div>
          <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-primary">
            <MaterialIcon name="auto_stories" />
          </div>
          <div>
            <p className="font-bold text-sm">Monthly Chronicle</p>
            <p className="text-xs text-on-surface-variant">The library has 12 new spellbooks available for study.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const QuestsView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest text-xs">
          <MaterialIcon name="auto_stories" className="text-sm" />
          Active Missions
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight">Available Quests</h1>
        <p className="text-on-surface-variant max-w-lg">Embark on legendary training missions to level up your professional skills and earn rare academy badges.</p>
      </div>
      <div className="flex bg-surface-container-low p-1.5 rounded-full shadow-inner border border-outline-variant/10">
        <button className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-bold shadow-md transform active:scale-95 transition-all">All</button>
        <button className="px-6 py-2.5 text-on-surface-variant hover:text-primary font-bold transition-colors">Beginner</button>
        <button className="px-6 py-2.5 text-on-surface-variant hover:text-primary font-bold transition-colors">Advanced</button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {[
        { title: "Aegis Operations", desc: "Master the core security protocols and defensive strategies of our digital perimeter.", progress: 65, xp: "1,200 XP", icon: "shield", color: "tertiary", tag: "Normal" },
        { title: "Market Alchemy", desc: "Transmute raw data into powerful business insights using advanced predictive models.", progress: 12, xp: "4,500 XP", icon: "science", color: "secondary", tag: "Hard" },
        { title: "Novice Rituals", desc: "Welcome to the Academy. Learn our daily incantations for effective team collaboration.", progress: 98, xp: "350 XP", icon: "magic_button", color: "primary", tag: "Easy" },
        { title: "Sprint Battle", desc: "Enter the arena of rapid development. Learn to dodge blockers and strike goals.", progress: 0, xp: "2,100 XP", icon: "swords", color: "tertiary", tag: "Normal" },
        { title: "Vault Organization", desc: "Master the inventory system of our company cloud. Keep artifacts safe and accessible.", progress: 40, xp: "800 XP", icon: "backpack", color: "secondary", tag: "Easy" },
      ].map((quest, i) => (
        <div key={i} className="group relative bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_0_rgba(74,33,53,0.06)] transition-all duration-300 border border-transparent hover:border-primary-container/30 hover:-translate-y-2">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
            <MaterialIcon name="local_florist" className="text-tertiary text-3xl" />
          </div>
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 bg-surface-container-high rounded-lg flex items-center justify-center shadow-inner">
              <MaterialIcon name={quest.icon} className="text-4xl text-primary" fill />
            </div>
            <span className={`px-3 py-1 bg-${quest.color}-container text-on-${quest.color}-container text-xs font-black rounded-full uppercase`}>{quest.tag}</span>
          </div>
          <h3 className="text-xl font-extrabold text-on-surface mb-2 group-hover:text-primary transition-colors">{quest.title}</h3>
          <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">{quest.desc}</p>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-xs font-bold uppercase text-on-surface-variant mb-1">
              <span>Quest Progress</span>
              <span>{quest.progress}%</span>
            </div>
            <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden relative shadow-inner">
              <div className="h-full bg-gradient-to-r from-tertiary to-tertiary-fixed rounded-full" style={{ width: `${quest.progress}%` }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-surface-container">
            <div className="flex items-center gap-2">
              <MaterialIcon name="stars" className="text-secondary-fixed-dim" />
              <span className="font-black text-rose-900">{quest.xp}</span>
            </div>
            <button className="text-primary font-extrabold flex items-center gap-1 hover:gap-2 transition-all">
              Resume <MaterialIcon name="arrow_forward_ios" className="text-sm" />
            </button>
          </div>
        </div>
      ))}
      <div className="group border-4 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 bg-white/30 hover:bg-white/50 transition-all cursor-pointer">
        <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center">
          <MaterialIcon name="add_circle" className="text-3xl text-outline" />
        </div>
        <div>
          <h3 className="font-bold text-on-surface">Mystery Quest</h3>
          <p className="text-xs text-on-surface-variant">Unlocks at Level 5</p>
        </div>
      </div>
    </div>
  </div>
);

const HomeView = ({ setView }: { setView: (v: View) => void }) => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="flex flex-col lg:flex-row gap-8 mb-12">
      <div className="flex-1 bg-white/80 backdrop-blur-md p-10 rounded-[3rem] bubbly-shadow border border-white/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <MaterialIcon name="castle" className="text-9xl" fill />
        </div>
        <div className="relative z-10">
          <span className="inline-block px-4 py-1 bg-primary-container/20 text-primary font-bold rounded-full text-xs uppercase tracking-widest mb-4">Daily Briefing</span>
          <h1 className="text-5xl font-black text-on-surface tracking-tight mb-4">Welcome Home, Hero!</h1>
          <p className="text-xl text-on-surface-variant mb-8 max-w-xl leading-relaxed">Your adventure in Maple Academy is just beginning. The guild master has posted new missions on the bulletin board. Are you ready to level up?</p>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => setView("quests")} className="px-10 py-4 bubbly-gradient text-white font-black rounded-full shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <MaterialIcon name="swords" />
              Start Questing
            </button>
            <button onClick={() => setView("inventory")} className="px-10 py-4 bg-white text-primary font-black rounded-full shadow-lg border border-rose-100 hover:bg-rose-50 transition-all flex items-center gap-2">
              <MaterialIcon name="backpack" />
              Check Gear
            </button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-gradient-to-br from-secondary to-secondary-dim p-8 rounded-[2.5rem] text-white shadow-xl shadow-secondary/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:rotate-12 transition-transform duration-500">
            <MaterialIcon name="military_tech" className="text-9xl" fill />
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Current Rank</p>
          <h3 className="text-3xl font-black mb-4">#1,284</h3>
          <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
            <MaterialIcon name="trending_up" className="text-sm" />
            +12 spots today
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-rose-100">
          <h4 className="font-black text-on-surface mb-4 flex items-center gap-2">
            <MaterialIcon name="bolt" className="text-primary" fill />
            Quick Stats
          </h4>
          <div className="space-y-4">
            {[
              { label: "Strength", val: 12, color: "rose" },
              { label: "Intelligence", val: 18, color: "blue" },
              { label: "Agility", val: 15, color: "green" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex justify-between text-xs font-bold uppercase text-on-surface-variant mb-1">
                  <span>{stat.label}</span>
                  <span>{stat.val}</span>
                </div>
                <div className="h-2 w-full bg-rose-50 rounded-full overflow-hidden">
                  <div className={`h-full bg-${stat.color}-400`} style={{ width: `${(stat.val / 20) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { title: "Recent Loot", desc: "Found: Iron Sword", icon: "swords", color: "primary" },
        { title: "Guild Chat", desc: "3 new messages", icon: "forum", color: "secondary" },
        { title: "Academy News", desc: "New spellbooks!", icon: "auto_stories", color: "tertiary" },
        { title: "Next Level", desc: "250 XP remaining", icon: "keyboard_double_arrow_up", color: "primary" },
      ].map((card, i) => (
        <div key={i} className="bg-white/60 p-6 rounded-3xl border border-white/40 bubbly-shadow hover:-translate-y-1 transition-all cursor-pointer group">
          <div className={`w-12 h-12 rounded-2xl bg-${card.color}-container/30 flex items-center justify-center text-${card.color} mb-4 group-hover:scale-110 transition-transform`}>
            <MaterialIcon name={card.icon} fill />
          </div>
          <h4 className="font-black text-on-surface text-sm">{card.title}</h4>
          <p className="text-xs text-on-surface-variant font-medium">{card.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

const LeaderboardView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="text-center mb-16">
      <span className="inline-block px-4 py-1 bg-surface-container-highest text-primary font-bold rounded-full text-xs uppercase tracking-widest mb-4">Hall of Legends</span>
      <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-4">Top Heroes</h1>
      <p className="text-on-surface-variant font-medium text-lg max-w-lg mx-auto">The most elite warriors and mages in the academy. Will your name be etched here next?</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
      {[
        { rank: 2, name: "Starry Sorceress", level: 118, class: "Arch Mage", color: "slate-300", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzKVkelGYHL-QZK-7vZao4JKWSYbO72cYkyThn_ZAto056fiLPdhd3F_2tgMmf2Hp0IBBPx_7sgz9tcwFmm5Ih_KzYisqLiOKgcrzrOdtNj1cFKKJClhf7n4ndnFwTBGkBvpxhY4TlkbrpGnYHL0o6fnQiBKRr2gJhJJ9otcUdQq2K-S5WqdRX48E2_OQJ-s8VgJb_KU7-kIc8Z4ZfFIDS-tdBN-LzsGH8r7HXKk3mKUOo9x7BcjDgqDUL7AHadYMvpuG9_wQr3A" },
        { rank: 1, name: "Zekrom Knight", level: 124, class: "Warlord", color: "yellow-400", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD71gjDDm5bpoj6xvSMLLx9fillxCUhyei67qU8Fy6ht6her7OWSPRDBiQmF8Z6uGnZui_5CPxrhK16tHEuiwvurp78kd375dOABUB4Cus238spkTXyCH-E1k3i3sVtmXDuVDvMQnM07xZj19vTZ5e45HRwpQYLCpcEl2xLk1V7WcyPQG5i3p9hD4BscY8i_WarIQzAjunVp08zyOa88_jVIXZzCYVaoAHYUSIz-fX1lbRi4BQhSWsW_dwxqPy6nLZXG5TFInbEXg", featured: true },
        { rank: 3, name: "Shadow Blade", level: 102, class: "Night Walker", color: "orange-400", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAx9b5Zix35xAHw3hMvEDZoT38901GttvDU8G9bu8CqUHWdXrD4esonev-gl7-CZveEleEqSDKcWG3Ioz0Vk-GrCZIY21fDgZ3903ZkAW-euppedHwc5Wv-GsdqUdYourS1NbDgNgyt0abnmyGMXymbVC-EKQibx0WVV5QE0G-48TJA8ST8xcr0QojFv0ERuJAFazkYNJpWLzmqGvApdiQo1JUECmoGEr7EwdX5Tc18BpiGu9L6rmKVpkZDq3o67KtCu8qvqlYO9w" },
      ].sort((a, b) => (a.rank === 1 ? -1 : b.rank === 1 ? 1 : a.rank - b.rank)).map((hero, i) => (
        <div key={i} className={`relative flex flex-col items-center ${hero.featured ? 'order-first md:order-none' : ''}`}>
          <div className={`relative mb-6 ${hero.featured ? 'w-48 h-48' : 'w-36 h-36'}`}>
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-${hero.color} to-white/0 opacity-20 blur-2xl`}></div>
            <img className="w-full h-full object-cover rounded-full border-4 border-white shadow-2xl relative z-10" src={hero.img} referrerPolicy="no-referrer" />
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center z-20 font-black text-xl text-${hero.color.split('-')[0]}-600`}>
              {hero.rank}
            </div>
          </div>
          <h3 className={`font-black text-on-surface ${hero.featured ? 'text-2xl' : 'text-xl'}`}>{hero.name}</h3>
          <p className="text-primary font-bold text-sm mb-2">{hero.class} <span className="text-on-surface-variant opacity-50">|</span> Lv. {hero.level}</p>
          <div className={`h-24 w-full max-w-[200px] bg-white/40 rounded-t-3xl border-x border-t border-white/40 shadow-inner flex items-end justify-center pb-4 ${hero.featured ? 'h-32' : 'h-24'}`}>
            <MaterialIcon name="workspace_premium" className={`text-4xl text-${hero.color.split('-')[0]}-400`} fill />
          </div>
        </div>
      ))}
    </div>

    <div className="bg-white/80 backdrop-blur-md rounded-[3rem] bubbly-shadow overflow-hidden border border-white/40">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low">
          <tr>
            <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Rank</th>
            <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Hero</th>
            <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Guild</th>
            <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest">Level</th>
            <th className="px-8 py-6 text-on-surface-variant font-bold text-sm uppercase tracking-widest text-right">Power Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rose-100/50">
          {[
            { rank: 4, name: "Aria Archer", guild: "Wind Walkers", level: 95, score: 12450, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBL_vigweqQn3qmIaZLyIdYBnIFF3aqRE_LVacCyr9ZOq7YGMDHQYjonA-ewx04E7cHu-kgphIzfUPQP6mZzY8MrWJWu28AUIfgPR2QUMTbJoFV8PeWQ61qonfI6SosZhpZPcV6o4A0g-Sdd4MSvNiLfKPatArSxhnNcESthKBwBQ7S0uCnnFeMXDmozDrt4esuqLbvJ8sNcdwN-5DP8NbWig5ErS0Ew9ma2l-PNoC4RtC8Tj_kdjJa08N7hQ5_2qIiOoUESVDCAw" },
            { rank: 5, name: "Iron Golem", guild: "Mountain Guard", level: 88, score: 11200, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD71gjDDm5bpoj6xvSMLLx9fillxCUhyei67qU8Fy6ht6her7OWSPRDBiQmF8Z6uGnZui_5CPxrhK16tHEuiwvurp78kd375dOABUB4Cus238spkTXyCH-E1k3i3sVtmXDuVDvMQnM07xZj19vTZ5e45HRwpQYLCpcEl2xLk1V7WcyPQG5i3p9hD4BscY8i_WarIQzAjunVp08zyOa88_jVIXZzCYVaoAHYUSIz-fX1lbRi4BQhSWsW_dwxqPy6nLZXG5TFInbEXg" },
            { rank: 6, name: "Mystic Monk", guild: "Zenith", level: 82, score: 9800, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzKVkelGYHL-QZK-7vZao4JKWSYbO72cYkyThn_ZAto056fiLPdhd3F_2tgMmf2Hp0IBBPx_7sgz9tcwFmm5Ih_KzYisqLiOKgcrzrOdtNj1cFKKJClhf7n4ndnFwTBGkBvpxhY4TlkbrpGnYHL0o6fnQiBKRr2gJhJJ9otcUdQq2K-S5WqdRX48E2_OQJ-s8VgJb_KU7-kIc8Z4ZfFIDS-tdBN-LzsGH8r7HXKk3mKUOo9x7BcjDgqDUL7AHadYMvpuG9_wQr3A" },
            { rank: 7, name: "Frost Mage", guild: "Ice Citadel", level: 79, score: 9240, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAx9b5Zix35xAHw3hMvEDZoT38901GttvDU8G9bu8CqUHWdXrD4esonev-gl7-CZveEleEqSDKcWG3Ioz0Vk-GrCZIY21fDgZ3903ZkAW-euppedHwc5Wv-GsdqUdYourS1NbDgNgyt0abnmyGMXymbVC-EKQibx0WVV5QE0G-48TJA8ST8xcr0QojFv0ERuJAFazkYNJpWLzmqGvApdiQo1JUECmoGEr7EwdX5Tc18BpiGu9L6rmKVpkZDq3o67KtCu8qvqlYO9w" },
          ].map((hero) => (
            <tr key={hero.rank} className="hover:bg-rose-50/30 transition-colors group">
              <td className="px-8 py-5 font-black text-on-surface-variant">#{hero.rank}</td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <img className="w-10 h-10 rounded-full bg-surface-container" src={hero.img} referrerPolicy="no-referrer" />
                  <span className="font-bold text-on-surface">{hero.name}</span>
                </div>
              </td>
              <td className="px-8 py-5">
                <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-on-surface-variant">{hero.guild}</span>
              </td>
              <td className="px-8 py-5 font-bold text-primary">Lv. {hero.level}</td>
              <td className="px-8 py-5 text-right font-black text-on-surface">{hero.score.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-8 text-center bg-surface-container-low/30">
        <button className="text-primary font-black hover:underline flex items-center gap-2 mx-auto">
          Load More Heroes
          <MaterialIcon name="expand_more" />
        </button>
      </div>
    </div>
  </div>
);

const InventoryView = () => (
  <div className="max-w-7xl mx-auto relative z-10">
    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest text-xs">
          <MaterialIcon name="backpack" className="text-sm" fill />
          Hero's Satchel
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight">Inventory</h1>
        <p className="text-on-surface-variant max-w-lg">Manage your collected artifacts, equipment, and magical consumables.</p>
      </div>
      <div className="flex bg-surface-container-low p-1.5 rounded-full shadow-inner border border-outline-variant/10">
        {["All", "Gear", "Potions", "Quest"].map((tab) => (
          <button key={tab} className={`px-6 py-2.5 rounded-full font-bold transition-all ${tab === "All" ? "bg-gradient-to-br from-primary to-primary-container text-white shadow-md" : "text-on-surface-variant hover:text-primary"}`}>
            {tab}
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {[
        { name: "Iron Sword", type: "Weapon", rarity: "Common", icon: "swords", color: "slate" },
        { name: "Health Potion", type: "Consumable", rarity: "Common", icon: "pill", color: "rose" },
        { name: "Mana Elixir", type: "Consumable", rarity: "Uncommon", icon: "vial", color: "blue" },
        { name: "Dragon Scale", type: "Material", rarity: "Rare", icon: "diamond", color: "orange" },
        { name: "Old Map", type: "Quest", rarity: "Common", icon: "map", color: "amber" },
        { name: "Magic Wand", type: "Weapon", rarity: "Uncommon", icon: "magic_button", color: "purple" },
        { name: "Leather Boots", type: "Armor", rarity: "Common", icon: "steps", color: "stone" },
        { name: "Golden Key", type: "Quest", rarity: "Rare", icon: "key", color: "yellow" },
        { name: "Phoenix Down", type: "Consumable", rarity: "Epic", icon: "local_fire_department", color: "red" },
        { name: "Iron Shield", type: "Armor", rarity: "Common", icon: "shield", color: "slate" },
        { name: "Empty Bottle", type: "Material", rarity: "Common", icon: "liquor", color: "blue" },
        { name: "Scroll of Fire", type: "Consumable", rarity: "Uncommon", icon: "scroll", color: "orange" },
      ].map((item, i) => (
        <div key={i} className="group bg-white/80 backdrop-blur-sm p-4 rounded-3xl bubbly-shadow border border-white/40 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-12 h-12 bg-${item.color}-400/10 rounded-bl-3xl flex items-center justify-center`}>
             <div className={`w-2 h-2 rounded-full bg-${item.color}-400`}></div>
          </div>
          <div className="aspect-square bg-surface-container-low rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-105 transition-transform">
            <MaterialIcon name={item.icon} className={`text-4xl text-${item.color}-500`} fill />
          </div>
          <h4 className="font-black text-on-surface text-sm truncate">{item.name}</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{item.type}</p>
          
          <div className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
            <p className="text-white font-black text-xs mb-2">{item.rarity}</p>
            <button className="bg-white text-primary text-[10px] font-black px-4 py-2 rounded-full shadow-lg">View Details</button>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-12 p-8 bg-primary-container/20 rounded-[3rem] border border-primary/10 flex flex-col md:flex-row items-center gap-8">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
        <MaterialIcon name="inventory_2" className="text-5xl text-primary" fill />
      </div>
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-2xl font-black text-on-surface mb-2">Inventory Capacity</h3>
        <p className="text-on-surface-variant font-medium mb-4">You are using 12 out of 50 slots. Upgrade your backpack to carry more loot!</p>
        <div className="h-4 w-full max-w-md bg-white rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-primary" style={{ width: '24%' }}></div>
        </div>
      </div>
      <button className="px-8 py-4 bg-white text-primary font-black rounded-full shadow-lg hover:scale-105 transition-all">Upgrade Slots</button>
    </div>
  </div>
);

const HeroSelectionView = ({ onSelect }: { onSelect: () => void }) => {
  const [selectedHeroIndex, setSelectedHeroIndex] = useState<number | null>(null);
  const [customization, setCustomization] = useState({
    hairColor: "Natural",
    outfit: "Standard",
    accessory: "None"
  });

  const heroes = [
    { 
      name: "Fighter", 
      desc: "A brave warrior with high physical defense and strong close-range attacks.", 
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCL9FpQzBy7WTNRwaqLdmud5FrfNVYsztTYEMuoTvSDN4trdHGX8BsZoC8h9RftfJEaB1zm4-wtEmtOdyfrreoEVEUDtbh7139WR5TX37wL802z3pqtmsrelDJSoVHynL-6JjWeTveofkrvSUQvnGVzNOiSgLd9SJqM2lDGy_P5VMbJvHVA3Tn-0GnrN16zUvQEagVlhNXjTXoU7R4F6SR_nJxV5sP1YfFmj4htEzERxKbjIlY65xOzQuYrkwH8lp1I2h1vlNUQ0Q", 
      stats: { str: 4, mag: 1, agi: 2 },
      color: "rose"
    },
    { 
      name: "Apprentice", 
      desc: "A student of the mystic arts. Masters of elemental damage and helpful support spells.", 
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzbz7RSPIR4n6q7E2Dgwvs-p8NPasn3bR0W5oFjVGwp2lJRoCAO_bdeFNkFfSPodvuTUNV61s5KZByn3n-60uLTo1V6nAtqe-4L4dfjHa48CdeLQ62xdyuEHwThCjvXC8zRBC3NK7ltvIfNHm4O0U9bxjiijg9epPl8H064Sc7iKhGgR1mxqizzavjwPzuycR9VXNUjN7dHKYEImMWxHoMzVyCd_XZLlu5ifssDZku1W3fpVyIjZYuU8w8ulAnyI4CjA23D4rlVw", 
      stats: { str: 1, mag: 5, agi: 2 }, 
      popular: true,
      color: "blue"
    },
    { 
      name: "Scout", 
      desc: "Swift and nimble explorers. Specialized in long-range precision and rapid movement.", 
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvkErGc5bi1DsLfeQ7iVg9xOD12k_ifDRZZgmELNZjkEG7nYk3IkNKkHBtnf9UhW9UPkz47UIV820PcSFhzk8kLcNoJg7691PTX9SPzyoG-7Hha2qsHb6QkJwTmi9Vf2MWLrt-0h2hj7FUnXmqupvbcn5Nt8KQUazpp6c8vyKOV4M93rb1jq9NO9QjCqCup5AqjVIHwVQVXQeXbu6sfDfHlWntx2ylYY0MndM2rllLlfGaI3cbaELcZLUBABlWvd7XrVptwXPEZw", 
      stats: { str: 2, mag: 2, agi: 4 },
      color: "green"
    },
  ];

  const customizationOptions = {
    hairColors: [
      { name: "Natural", color: "bg-stone-500" },
      { name: "Crimson", color: "bg-rose-600" },
      { name: "Azure", color: "bg-blue-500" },
      { name: "Golden", color: "bg-amber-400" },
      { name: "Midnight", color: "bg-slate-900" },
      { name: "Emerald", color: "bg-emerald-500" },
      { name: "Amethyst", color: "bg-purple-500" },
      { name: "Rose", color: "bg-rose-400" },
      { name: "Silver", color: "bg-slate-300" },
      { name: "Sunset", color: "bg-orange-500" },
      { name: "Mint", color: "bg-teal-300" },
      { name: "Lavender", color: "bg-violet-300" }
    ],
    outfits: ["Standard", "Reinforced", "Ceremonial", "Shadow"],
    accessories: ["None", "Hero Cape", "Mystic Amulet", "Tactical Goggles"]
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center">
      <AnimatePresence mode="wait">
        {selectedHeroIndex === null ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            <div className="text-center mb-16 relative">
              <span className="inline-block px-4 py-1 bg-surface-container-highest text-primary font-bold rounded-full text-xs uppercase tracking-widest mb-4">Step 2: Creation</span>
              <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-4 drop-shadow-sm">Choose Your Hero</h1>
              <p className="text-on-surface-variant font-medium text-lg max-w-lg mx-auto">Every legend begins with a single choice. Which path will you carve in the Maple Academy?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full">
              {heroes.map((hero, i) => (
                <motion.div 
                  key={i} 
                  onClick={() => setSelectedHeroIndex(i)}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 20px 50px rgba(255, 133, 161, 0.2)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`group relative bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_0_rgba(74,33,53,0.06)] transition-all duration-300 cursor-pointer ${hero.popular ? 'ring-4 ring-primary/20' : ''}`}
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 z-10">
                    <motion.img 
                      className="w-full h-full object-contain drop-shadow-lg" 
                      src={hero.img} 
                      referrerPolicy="no-referrer"
                      animate={{ 
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </div>
                  {hero.popular && <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">Popular</div>}
                  <div className="pt-32 text-center">
                    <h3 className="text-3xl font-extrabold text-on-surface mb-2">{hero.name}</h3>
                    <p className="text-sm text-on-surface-variant font-semibold mb-6">{hero.desc}</p>
                    <div className="space-y-4 mb-8">
                      {Object.entries(hero.stats).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm font-bold text-on-surface-variant capitalize">{key === 'str' ? 'Strength' : key === 'mag' ? 'Magic' : 'Agility'}</span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, idx) => (
                              <span key={idx}>
                                <MaterialIcon name="star" className={`text-lg ${idx < val ? 'text-primary' : 'text-outline-variant'}`} fill={idx < val} />
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-full py-4 rounded-full bg-surface-container-high text-on-surface-variant font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all">
                      Customize Hero
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="customization"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-5xl"
          >
            <button 
              onClick={() => setSelectedHeroIndex(null)}
              className="mb-8 flex items-center gap-2 text-primary font-bold hover:underline"
            >
              <MaterialIcon name="arrow_back" />
              Back to Class Selection
            </button>

            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] bubbly-shadow border border-white/40 overflow-hidden flex flex-col lg:flex-row">
              {/* Preview Panel */}
              <div className={`lg:w-1/2 bg-${heroes[selectedHeroIndex].color}-50 p-12 flex flex-col items-center justify-center relative`}>
                <div className="absolute top-8 left-8">
                  <span className={`px-4 py-1 bg-${heroes[selectedHeroIndex].color}-container text-on-${heroes[selectedHeroIndex].color}-container font-black rounded-full text-xs uppercase tracking-widest`}>
                    {heroes[selectedHeroIndex].name}
                  </span>
                </div>
                
                <div className="relative w-64 h-64 mb-8">
                  <motion.div 
                    className={`absolute inset-0 rounded-full bg-${heroes[selectedHeroIndex].color}-200/30 blur-3xl`}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  ></motion.div>
                  <motion.img 
                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl" 
                    src={heroes[selectedHeroIndex].img} 
                    referrerPolicy="no-referrer" 
                    animate={{ 
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>

                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black text-on-surface">Your Legend</h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-rose-100 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${customizationOptions.hairColors.find(c => c.name === customization.hairColor)?.color}`}></div>
                      <span className="text-xs font-bold text-on-surface-variant">{customization.hairColor} Hair</span>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-rose-100 flex items-center gap-2">
                      <MaterialIcon name="checkroom" className="text-sm text-primary" />
                      <span className="text-xs font-bold text-on-surface-variant">{customization.outfit} Outfit</span>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-rose-100 flex items-center gap-2">
                      <MaterialIcon name="auto_awesome" className="text-sm text-primary" />
                      <span className="text-xs font-bold text-on-surface-variant">{customization.accessory}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Options Panel */}
              <div className="lg:w-1/2 p-12 space-y-10">
                <div>
                  <h3 className="text-xl font-black text-on-surface mb-6 flex items-center gap-2">
                    <MaterialIcon name="palette" className="text-primary" />
                    Hair Color
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {customizationOptions.hairColors.map((option) => (
                      <button
                        key={option.name}
                        onClick={() => setCustomization(prev => ({ ...prev, hairColor: option.name }))}
                        className={`w-12 h-12 rounded-full ${option.color} border-4 transition-all ${customization.hairColor === option.name ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        title={option.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-on-surface mb-6 flex items-center gap-2">
                    <MaterialIcon name="checkroom" className="text-primary" />
                    Outfit Style
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {customizationOptions.outfits.map((option) => (
                      <button
                        key={option}
                        onClick={() => setCustomization(prev => ({ ...prev, outfit: option }))}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${customization.outfit === option ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-on-surface mb-6 flex items-center gap-2">
                    <MaterialIcon name="auto_awesome" className="text-primary" />
                    Accessories
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {customizationOptions.accessories.map((option) => (
                      <button
                        key={option}
                        onClick={() => setCustomization(prev => ({ ...prev, accessory: option }))}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${customization.accessory === option ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={onSelect}
                    className="w-full py-5 rounded-full bubbly-gradient text-white font-black text-xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 glossy-overlay opacity-50"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Complete Creation
                      <MaterialIcon name="celebration" fill />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>("login");

  useEffect(() => {
    // Scroll to top on view change
    window.scrollTo(0, 0);
  }, [view]);

  if (view === "login") {
    return <LoginView onLogin={(isNew) => setView(isNew ? "hero-selection" : "home")} />;
  }

  if (view === "hero-selection") {
    return (
      <div className="min-h-screen bg-surface pt-20 pb-12 px-8">
        <HeroSelectionView onSelect={() => setView("home")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopBar setView={setView} />
      <Sidebar currentView={view} setView={setView} />
      
      <main className="lg:ml-64 pt-28 pb-12 px-8 min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <img 
            alt="Library Background" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7zbNjUvXhjDq5TurbB9wl0aCu8AwvQnTlAqEtnmbW5hHFIE27Xft3ugXDb3ZCKv91SMC1VDD1CWj5jrzCJhhMC8b8ySOCMMtW0FJIZsC7PFVJhv6Zz9JHDZlJtpF5wehLw1M1nXaXd6KDKhPOSM4okknSLueyT-yFVvdscBG2O4vPw-fePN6TKXhvBRJ2cNah5lPwh7bUDfZt-l9HK2eKpfWQHSwpJ5mZM-1bxHYQ1yalRxsCXRdI2CAfG_yFeO4IAIOkvqVL8Q"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/90 via-surface/60 to-surface"></div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {view === "admin" && <AdminView />}
            {view === "quests" && <QuestsView />}
            {view === "leaderboard" && <LeaderboardView />}
            {view === "inventory" && <InventoryView />}
            {view === "home" && <HomeView setView={setView} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Decorative Element */}
      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20 z-0">
        <MaterialIcon name="filter_vintage" className="text-9xl text-primary" />
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg flex justify-around items-center py-4 z-50 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] px-6">
        {[
          { id: "home", icon: "home", label: "Home" },
          { id: "quests", icon: "foundation", label: "Quests" },
          { id: "admin", icon: "shield_person", label: "Admin", special: true },
          { id: "leaderboard", icon: "leaderboard", label: "Rank" },
          { id: "inventory", icon: "backpack", label: "Items" },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`flex flex-col items-center gap-1 ${item.special ? 'bg-primary-container text-on-primary-container p-3 rounded-full -mt-10 shadow-lg shadow-primary/30' : 'text-rose-400'}`}
          >
            <MaterialIcon name={item.icon} fill={item.special || view === item.id} />
            {!item.special && <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
