// Character data definitions for the Maple Character Customizer
// Supports male and female characters with hair, outfit, accessories, and weapons

export interface CharItem {
  n: string;   // display name
  c: string;   // primary color
  c2: string;  // secondary color
  t: string;   // type identifier
}

export type Gender = "f" | "m";
export type Category = "hair" | "outfit" | "acc" | "weapon";

export const TABS: Category[] = ["hair", "outfit", "acc", "weapon"];

export const TAB_LABELS: Record<Category, { icon: string; label: string; sublabel: string }> = {
  hair: { icon: "\u263A", label: "Rambut", sublabel: "Pilih gaya rambut" },
  outfit: { icon: "\u25C6", label: "Outfit", sublabel: "Pilih outfit" },
  acc: { icon: "\u2733", label: "Aksesori", sublabel: "Pilih aksesori" },
  weapon: { icon: "\u2694", label: "Senjata", sublabel: "Pilih senjata" },
};

export const ANGLE_LABELS = [
  "Depan", "3/4 Kanan", "Samping Kanan", "Blkg Kanan",
  "Belakang", "Blkg Kiri", "Samping Kiri", "3/4 Kiri",
];

export const BASE_ANGLES = [0, 1, 2, 3, 4, 3, 2, 1];
export const MIRROR_ANGLES = [0, 0, 0, 0, 0, 1, 1, 1];

export const CHAR_NAMES: Record<Gender, string[]> = {
  f: ["Maple Heroine", "Starlight Mage", "Dawn Fairy", "Crystal Sage", "Rose Knight", "Forest Dancer"],
  m: ["Maple Hero", "Thunder Blade", "Iron Guardian", "Shadow Rogue", "Storm Archer", "Brave Knight"],
};

export const STAT_MAP: Record<string, string> = {
  wand: "INT \u2733\u2733\u2733", sword: "STR \u2733\u2733\u2733", bow: "DEX \u2733\u2733\u2733",
  staff: "MAG \u2733\u2733\u2733", dagger: "LUK \u2733\u2733\u2733", axe: "STR \u2733\u2733\u2733",
  spear: "STR \u2733\u2733", none: "STR \u2733\u2733",
};

export const DATA: Record<Gender, Record<Category, CharItem[]>> = {
  f: {
    hair: [
      { n: "Pink Bob", c: "#FFB7C5", c2: "#FF8FAB", t: "bob" },
      { n: "Ungu Panjang", c: "#C3A6FF", c2: "#9B72F5", t: "long" },
      { n: "Twin Tails", c: "#FFD6A5", c2: "#FFAA5C", t: "twin" },
      { n: "Biru Keriting", c: "#A5E4FF", c2: "#5BBCE4", t: "curly" },
      { n: "Hijau Wavy", c: "#B5F5C0", c2: "#6DD47E", t: "wavy" },
      { n: "Dark Sleek", c: "#4A3060", c2: "#2A1840", t: "dark" },
    ],
    outfit: [
      { n: "Seragam Sekolah", c: "#3A5FA0", c2: "#FFFFFF", t: "school" },
      { n: "Jubah Penyihir", c: "#6B3FA0", c2: "#2D1B4A", t: "witch" },
      { n: "Gaun Musim Panas", c: "#FF7B9C", c2: "#FFD93D", t: "summer" },
      { n: "Kostum Maid", c: "#F0F0F0", c2: "#333333", t: "maid" },
      { n: "Baju Peri", c: "#B5F5C0", c2: "#9B72F5", t: "fairy" },
      { n: "Petualang", c: "#7B5E3A", c2: "#4A7A3A", t: "adv" },
    ],
    acc: [
      { n: "Telinga Kucing", c: "#FFB7C5", c2: "#FF6B8A", t: "cat" },
      { n: "Mahkota Bunga", c: "#FFD700", c2: "#FF87AB", t: "flower" },
      { n: "Topi Penyihir", c: "#4B0082", c2: "#9B72F5", t: "whood" },
      { n: "Telinga Kelinci", c: "#F5F0FF", c2: "#FFB7C5", t: "bunny" },
      { n: "Halo Malaikat", c: "#FFD700", c2: "#FFF0A0", t: "halo" },
      { n: "Tanpa Aksesori", c: "#D0D0D0", c2: "#B0B0B0", t: "none" },
    ],
    weapon: [
      { n: "Tongkat Sihir", c: "#FFB7C5", c2: "#FF87AB", t: "wand" },
      { n: "Pedang", c: "#C8C8D8", c2: "#808090", t: "sword" },
      { n: "Busur Panah", c: "#8B6914", c2: "#C4A01C", t: "bow" },
      { n: "Tongkat Kristal", c: "#9B72F5", c2: "#C3A6FF", t: "staff" },
      { n: "Dagger Kembar", c: "#5BB8FF", c2: "#3A88CC", t: "dagger" },
      { n: "Tanpa Senjata", c: "#D0D0D0", c2: "#B0B0B0", t: "none" },
    ],
  },
  m: {
    hair: [
      { n: "Spiky Merah", c: "#FF6B5B", c2: "#CC3322", t: "mspiky" },
      { n: "Acak-acakan", c: "#8B6914", c2: "#5A4010", t: "mrugged" },
      { n: "Pendek Rapi", c: "#2A1840", c2: "#1A0C28", t: "mclean" },
      { n: "Biru Punk", c: "#5BB8FF", c2: "#2A6FAA", t: "mpunk" },
      { n: "Hijau Edgy", c: "#6DD47E", c2: "#3A7A40", t: "medgy" },
      { n: "Silver Cool", c: "#C8C8D8", c2: "#9090A8", t: "msilver" },
    ],
    outfit: [
      { n: "Baju Zirah", c: "#8B9DC3", c2: "#D4AF37", t: "knight" },
      { n: "Jubah Petarung", c: "#6B3FA0", c2: "#2D1B4A", t: "mwitch" },
      { n: "Seragam Ninja", c: "#1A1A2E", c2: "#E03030", t: "ninja" },
      { n: "Pakaian Ranger", c: "#4A7A3A", c2: "#8B6914", t: "ranger" },
      { n: "Bajak Laut", c: "#3A3060", c2: "#CC3322", t: "pirate" },
      { n: "Petualang", c: "#7B5E3A", c2: "#4A7A3A", t: "adv" },
    ],
    acc: [
      { n: "Headband Ninja", c: "#1A1A2E", c2: "#E03030", t: "ninja_b" },
      { n: "Topi Bajak Laut", c: "#3A3060", c2: "#D4AF37", t: "pirate_h" },
      { n: "Mahkota Raja", c: "#FFD700", c2: "#CC8800", t: "crown" },
      { n: "Masker Siluman", c: "#333333", c2: "#888888", t: "mask" },
      { n: "Topi Ranger", c: "#4A7A3A", c2: "#8B6914", t: "ranger_h" },
      { n: "Tanpa Aksesori", c: "#D0D0D0", c2: "#B0B0B0", t: "none" },
    ],
    weapon: [
      { n: "Pedang Besar", c: "#C8C8D8", c2: "#D4AF37", t: "sword" },
      { n: "Kapak Perang", c: "#8B6914", c2: "#C8C8D8", t: "axe" },
      { n: "Busur Panah", c: "#8B6914", c2: "#C4A01C", t: "bow" },
      { n: "Tongkat Sihir", c: "#9B72F5", c2: "#C3A6FF", t: "staff" },
      { n: "Tombak", c: "#8B6914", c2: "#C8C8D8", t: "spear" },
      { n: "Tanpa Senjata", c: "#D0D0D0", c2: "#B0B0B0", t: "none" },
    ],
  },
};
