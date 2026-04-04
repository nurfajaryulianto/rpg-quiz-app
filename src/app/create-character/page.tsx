"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function CreateCharacterPage() {
  return (
    <AuthProvider>
      <CreateCharacterInner />
    </AuthProvider>
  );
}

function CreateCharacterInner() {
  const router = useRouter();
  const { participant, setParticipant } = useAuthStore();

  const [gender, setGenderState] = useState<Gender>("f");
  const [hair, setHair] = useState(0);
  const [outfit, setOutfit] = useState(0);
  const [acc, setAcc] = useState(0);
  const [weapon, setWeapon] = useState(0);
  const [angle, setAngle] = useState(0);
  const [tab, setTab] = useState<Category>("hair");
  const [saving, setSaving] = useState(false);
  const [pop, setPop] = useState(false);

  // Drag-to-rotate state
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartAngle = useRef(0);

  // Redirect if already has avatar
  useEffect(() => {
    if (participant?.avatar_config) {
      router.replace("/");
    }
    if (!participant && !useAuthStore.getState().isLoading) {
      router.replace("/login");
    }
  }, [participant, router]);

  const triggerPop = useCallback(() => {
    setPop(true);
    setTimeout(() => setPop(false), 220);
  }, []);

  const setGender = (g: Gender) => {
    setGenderState(g);
    setHair(0); setOutfit(0); setAcc(0); setWeapon(0);
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
    else if (cat === "weapon") setWeapon(idx);
    triggerPop();
  };

  const getSelected = (cat: Category) => {
    if (cat === "hair") return hair;
    if (cat === "outfit") return outfit;
    if (cat === "acc") return acc;
    return weapon;
  };

  // Pointer drag to rotate
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragStartAngle.current = angle;
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const newAngle = ((dragStartAngle.current + Math.round((e.clientX - dragStartX.current) / 26)) % 8 + 8) % 8;
    setAngle(newAngle);
  };
  const onPointerUp = () => { dragStartX.current = null; };

  const charSVG = buildCharacterSVG(gender, hair, outfit, acc, weapon, angle, DATA);
  const charName = CHAR_NAMES[gender][outfit] ?? CHAR_NAMES[gender][0];
  const weaponType = DATA[gender].weapon[weapon].t;
  const stat = STAT_MAP[weaponType] ?? STAT_MAP.none;

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    try {
      const config: AvatarConfig = { gender, hair, outfit, acc, weapon };
      const { data, error } = await supabase
        .from("participants")
        .update({ avatar_config: config })
        .eq("id", participant.id)
        .select()
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

  const genderColor = gender === "f" ? "pink" : "blue";
  const primaryClr = gender === "f" ? "#D4537E" : "#5B8FD4";

  return (
    <div className="min-h-screen bg-[#f9f9f9] relative">
      {/* Header */}
      <div className="text-center pt-6 pb-2">
        <h1
          className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(90deg, #D4537E, #9B72F5, #5B8FD4)" }}
        >
          &#9670; Maple Character Customizer
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Drag karakter untuk rotasi 360° &bull; Klik item untuk kostumisasi
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-4xl mx-auto items-start">
        {/* Left: Character Preview */}
        <div className="w-full lg:w-auto mx-auto lg:mx-0 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-3 min-w-[200px] shadow-sm">
            {/* Gender Buttons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setGender("f")}
                className={`flex-1 py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                  gender === "f"
                    ? "border-[#D4537E] text-[#D4537E] bg-pink-50"
                    : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                &#9792; Wanita
              </button>
              <button
                onClick={() => setGender("m")}
                className={`flex-1 py-2 px-3 border rounded-lg text-xs font-semibold transition-all ${
                  gender === "m"
                    ? "border-[#5B8FD4] text-[#5B8FD4] bg-blue-50"
                    : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                &#9794; Pria
              </button>
            </div>

            {/* Character SVG */}
            <svg
              ref={svgRef}
              viewBox="0 0 200 245"
              width={162}
              height={220}
              className={`cursor-grab active:cursor-grabbing select-none block ${pop ? "animate-pop" : ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              dangerouslySetInnerHTML={{ __html: `<g>${charSVG}</g>` }}
            />

            {/* Rotation Controls */}
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={() => rotate(-1)}
                className="w-7 h-7 border border-gray-200 rounded-full bg-gray-50 flex items-center justify-center text-xs hover:bg-gray-100 transition-colors"
              >
                &#9664;
              </button>
              <div className="flex gap-1 items-center">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setAngle(i); triggerPop(); }}
                    className={`rounded-full transition-all ${
                      i === angle
                        ? `w-2.5 h-2.5 ${genderColor === "pink" ? "bg-[#D4537E]" : "bg-[#5B8FD4]"}`
                        : "w-1.5 h-1.5 bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => rotate(1)}
                className="w-7 h-7 border border-gray-200 rounded-full bg-gray-50 flex items-center justify-center text-xs hover:bg-gray-100 transition-colors"
              >
                &#9654;
              </button>
            </div>

            <p className="text-[10px] text-gray-400">{ANGLE_LABELS[angle]}</p>
            <p className="text-xs font-semibold text-gray-800 text-center">{charName} Lv.1</p>

            <div className="flex gap-2 w-full">
              <div className="flex-1 bg-gray-50 rounded-md py-1 text-[10px] font-semibold text-gray-500 text-center">
                {stat}
              </div>
              <div className="flex-1 bg-gray-50 rounded-md py-1 text-[10px] font-semibold text-gray-500 text-center">
                Style &#10024;
              </div>
            </div>
          </div>
        </div>

        {/* Right: Customization Panel */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          <p className="text-sm font-bold text-gray-800">Kostumisasi Karakter</p>

          {/* Tabs */}
          <div className="grid grid-cols-4 gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2 px-1 border rounded-xl flex flex-col items-center gap-1 transition-all text-center shadow-sm ${
                  tab === t
                    ? "bg-gray-100 border-gray-400"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="text-base leading-none">{TAB_LABELS[t].icon}</span>
                <span className={`text-[10px] font-medium ${tab === t ? "text-gray-800" : "text-gray-500"}`}>
                  {TAB_LABELS[t].label}
                </span>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-gray-400">{TAB_LABELS[tab].sublabel}</p>

          {/* Items Grid */}
          <div className="grid grid-cols-3 gap-2">
            {DATA[gender][tab].map((item, i) => {
              const selected = getSelected(tab) === i;
              return (
                <motion.button
                  key={`${gender}-${tab}-${i}`}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => pick(tab, i)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all shadow-sm ${
                    selected
                      ? gender === "f"
                        ? "border-2 border-[#D4537E] bg-pink-50"
                        : "border-2 border-[#5B8FD4] bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-400 hover:-translate-y-0.5"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg border border-black/8"
                    style={{ background: `linear-gradient(135deg, ${item.c} 50%, ${item.c2} 50%)` }}
                  />
                  <span className={`text-[10px] font-medium text-center leading-tight ${selected ? "text-gray-800" : "text-gray-500"}`}>
                    {item.n}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4 py-4 rounded-full font-black text-lg text-white shadow-lg transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${primaryClr}, #9B72F5)` }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner text="" />
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <MaterialIcon name="save" className="text-xl" fill />
                Simpan & Mulai Petualangan
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* CSS for pop animation & SVG eye blink */}
      <style jsx global>{`
        @keyframes pop {
          0% { transform: scale(0.93); }
          60% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .animate-pop { animation: pop 0.22s ease; }
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
