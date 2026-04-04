// SVG rendering functions for Maple character customizer
// Ported from the original HTML template
import type { CharItem, Gender } from "./characterData";
import { BASE_ANGLES, MIRROR_ANGLES } from "./characterData";

/* ── HAIR BACK ─────────────────────────────────────── */
function hairBack(h: CharItem, g: Gender): string {
  const { c, c2, t } = h;
  if (g === "f") {
    if (t === "bob") return `<path d="M52 80 Q52 36 100 30 Q148 36 148 80 L140 96 L60 96Z"fill="${c}"/><rect x="52"y="75"width="17"height="36"rx="8"fill="${c}"/><rect x="131"y="75"width="17"height="36"rx="8"fill="${c}"/>`;
    if (t === "long") return `<path d="M52 80 Q52 36 100 30 Q148 36 148 80"fill="${c}"/><rect x="46"y="74"width="18"height="108"rx="9"fill="${c}"/><rect x="136"y="74"width="18"height="108"rx="9"fill="${c}"/>`;
    if (t === "twin") return `<path d="M54 80 Q54 36 100 30 Q146 36 146 80"fill="${c}"/><path d="M54 88 Q28 104 26 144 Q32 182 54 188 Q46 158 56 136 Q68 114 68 96Z"fill="${c}"/><path d="M146 88 Q172 104 174 144 Q168 182 146 188 Q154 158 144 136 Q132 114 132 96Z"fill="${c}"/><circle cx="62"cy="92"r="8"fill="${c2}"/><circle cx="138"cy="92"r="8"fill="${c2}"/>`;
    if (t === "curly") return `<path d="M54 80 Q52 44 68 34 Q78 24 100 22 Q122 24 132 34 Q148 44 146 80"fill="${c}"/><circle cx="46"cy="90"r="20"fill="${c}"/><circle cx="46"cy="114"r="16"fill="${c}"/><circle cx="154"cy="90"r="20"fill="${c}"/><circle cx="154"cy="114"r="16"fill="${c}"/>`;
    if (t === "wavy") return `<path d="M54 80 Q54 36 100 30 Q146 36 146 80"fill="${c}"/><path d="M46 76 Q36 100 44 122 Q52 144 46 164"stroke="${c}"stroke-width="16"fill="none"stroke-linecap="round"/><path d="M154 76 Q164 100 156 122 Q148 144 154 164"stroke="${c}"stroke-width="16"fill="none"stroke-linecap="round"/>`;
    if (t === "dark") return `<path d="M54 78 Q54 36 100 30 Q146 36 146 78 L140 80 Q140 46 100 42 Q60 46 60 80Z"fill="${c}"/><rect x="50"y="68"width="18"height="66"rx="9"fill="${c}"/><rect x="132"y="68"width="18"height="66"rx="9"fill="${c}"/>`;
  } else {
    if (t === "mspiky") return `<path d="M56 80 Q56 38 100 32 Q144 38 144 80"fill="${c}"/><polygon points="100,30 92,2 114,28"fill="${c}"/><polygon points="114,28 122,4 140,32"fill="${c2}"/><polygon points="86,28 78,2 96,30"fill="${c}"/><polygon points="56,80 36,70 56,96"fill="${c}"/><polygon points="144,80 164,70 144,96"fill="${c}"/>`;
    if (t === "mrugged") return `<path d="M56 80 Q56 38 100 32 Q144 38 144 80"fill="${c}"/><polygon points="56,80 36,72 56,96"fill="${c}"/><polygon points="144,80 164,72 144,96"fill="${c}"/><rect x="48"y="72"width="16"height="40"rx="5"fill="${c}"/>`;
    if (t === "mclean") return `<path d="M56 80 Q56 40 100 34 Q144 40 144 80 L138 74 Q128 56 100 54 Q72 56 62 74Z"fill="${c}"/>`;
    if (t === "mpunk") return `<path d="M56 80 Q56 38 100 32 Q144 38 144 80"fill="${c}"/><polygon points="78,34 74,6 88,32"fill="${c}"/><polygon points="88,30 86,4 100,30"fill="${c2}"/><polygon points="100,30 100,6 114,30"fill="${c}"/><polygon points="56,80 38,70 58,96"fill="${c}"/>`;
    if (t === "medgy") return `<path d="M56 80 Q56 38 100 32 Q144 38 144 80"fill="${c}"/><rect x="46"y="72"width="16"height="36"rx="5"fill="${c}"/><polygon points="52,78 32,68 48,90"fill="${c}"/><polygon points="148,78 168,68 152,90"fill="${c}"/>`;
    if (t === "msilver") return `<path d="M56 78 Q56 38 100 32 Q144 38 144 78 L138 72 Q128 54 100 52 Q72 54 62 72Z"fill="${c}"/>`;
  }
  return "";
}

/* ── HAIR FRONT ────────────────────────────────────── */
function hairFront(h: CharItem, g: Gender): string {
  const { c, t } = h;
  if (g === "f") {
    if (t === "bob") return `<path d="M54 78 Q54 38 100 32 Q146 38 146 78 L138 70 Q126 58 100 56 Q74 58 62 70Z"fill="${c}"/>`;
    if (t === "long") return `<path d="M54 78 Q54 38 100 32 Q146 38 146 78 L138 70 Q126 58 100 56 Q74 58 62 70Z"fill="${c}"/>`;
    if (t === "twin") return `<path d="M54 78 Q54 38 100 32 Q146 38 146 78 L138 70 Q128 60 100 58 Q72 60 62 70Z"fill="${c}"/>`;
    if (t === "curly") return `<path d="M54 80 Q54 40 100 34 Q146 40 146 80 L138 70 Q128 62 100 60 Q72 62 62 70Z"fill="${c}"/>`;
    if (t === "wavy") return `<path d="M54 78 Q54 38 100 32 Q146 38 146 78 L138 68 Q128 58 100 56 Q72 58 62 68Z"fill="${c}"/>`;
    if (t === "dark") return `<path d="M54 78 Q54 38 100 32 Q146 38 146 78 L138 60 Q130 46 114 44 L106 48 L100 38 L94 48 Q78 52 70 60Z"fill="${c}"/>`;
  } else {
    if (t === "mspiky") return `<path d="M56 78 Q56 38 100 32 Q144 38 144 78 L138 65 Q128 52 100 50 Q72 52 62 65Z"fill="${c}"/>`;
    if (t === "mrugged") return `<path d="M56 80 Q56 40 100 34 Q144 40 144 80 L138 68 Q128 58 100 56 Q72 58 62 68Z"fill="${c}"/><polygon points="64,62 60,40 76,62"fill="${c}"/>`;
    if (t === "mclean") return `<path d="M56 80 Q56 40 100 34 Q144 40 144 80 L138 66 Q128 54 100 52 Q72 54 62 66Z"fill="${c}"/>`;
    if (t === "mpunk") return `<path d="M56 80 Q56 40 100 34 Q144 40 144 80 L138 65 Q128 52 100 50 Q72 52 62 65Z"fill="${c}"/>`;
    if (t === "medgy") return `<path d="M56 80 Q56 40 100 34 Q144 40 144 80 L136 66 Q128 56 100 54 Q72 56 64 66Z"fill="${c}"/>`;
    if (t === "msilver") return `<path d="M56 78 Q56 40 100 34 Q144 40 144 78 L136 64 Q126 52 100 50 Q74 52 64 64Z"fill="${c}"/>`;
  }
  return "";
}

/* ── HAIR SIDE ─────────────────────────────────────── */
function hairSide(h: CharItem, g: Gender): string {
  const { c, c2, t } = h;
  if (g === "f") {
    if (t === "bob") return `<path d="M76 40 Q90 26 116 32 Q140 38 140 82 Q140 130 116 136 Q92 140 76 132 L70 100Z"fill="${c}"/>`;
    if (t === "long") return `<path d="M76 40 Q90 26 116 32 Q140 38 140 80 Q140 130 116 136 L116 205 Q90 215 76 204 L70 132 Q56 124 58 88Z"fill="${c}"/>`;
    if (t === "twin") return `<path d="M78 42 Q90 28 116 32 Q136 38 136 78 L132 118 Q112 132 88 128Z"fill="${c}"/><circle cx="52"cy="122"r="22"fill="${c}"/><circle cx="52"cy="122"r="14"fill="${c2}"opacity="0.55"/>`;
    if (t === "curly") return `<path d="M78 44 Q90 28 114 34 Q136 38 136 78 Q136 130 114 136 Q90 140 74 128Z"fill="${c}"/><circle cx="50"cy="90"r="22"fill="${c}"/><circle cx="50"cy="116"r="18"fill="${c}"/>`;
    if (t === "wavy") return `<path d="M78 42 Q90 28 116 32 Q138 36 138 80 Q138 130 116 136 L100 136Z"fill="${c}"/><path d="M52 76 Q42 102 50 126 Q58 150 50 170"stroke="${c}"stroke-width="18"fill="none"stroke-linecap="round"/>`;
    if (t === "dark") return `<path d="M76 42 Q90 28 116 32 Q138 36 138 80 Q138 128 116 134 Q90 136 72 126 L68 86Z"fill="${c}"/>`;
  } else {
    if (t === "mspiky") return `<path d="M78 46 Q90 30 114 36 Q136 40 136 78 Q134 116 112 128 Q88 132 72 122Z"fill="${c}"/><polygon points="112,34 122,6 138,40"fill="${c2}"/><polygon points="100,32 108,4 122,36"fill="${c}"/>`;
    if (t === "mrugged") return `<path d="M78 46 Q90 32 114 38 Q136 42 136 80 Q134 118 110 130 Q86 132 70 122 L66 80Z"fill="${c}"/><polygon points="68,84 46,74 66,98"fill="${c}"/>`;
    if (t === "mclean") return `<path d="M80 48 Q92 36 116 40 Q136 44 136 80 Q134 118 112 128 Q88 130 74 122 L70 84 Q74 62 92 52Z"fill="${c}"/>`;
    if (t === "mpunk") return `<path d="M78 46 Q90 32 114 36 Q136 40 136 78 Q134 116 110 128 Q86 130 70 120Z"fill="${c}"/><polygon points="86,34 82,6 98,36"fill="${c}"/><polygon points="98,32 96,4 110,34"fill="${c2}"/>`;
    if (t === "medgy") return `<path d="M78 46 Q90 34 114 38 Q136 42 136 80 Q134 116 110 128 Q86 130 70 120Z"fill="${c}"/><polygon points="68,82 46,72 66,96"fill="${c}"/>`;
    if (t === "msilver") return `<path d="M80 48 Q92 36 116 40 Q134 44 134 80 Q132 118 110 128 Q88 130 74 120 L70 82 Q74 64 92 54Z"fill="${c}"/>`;
  }
  return "";
}

/* ── FRONT BODY ────────────────────────────────────── */
function bodyFront(o: CharItem, g: Gender): string {
  const { c, c2, t } = o;
  if (g === "f") {
    if (t === "school") return `<rect x="62"y="140"width="76"height="82"rx="10"fill="${c}"/><polygon points="100,140 84,158 100,164 116,158"fill="white"/><polygon points="98,158 102,158 101,183 99,183"fill="#E03030"/><rect x="38"y="144"width="24"height="58"rx="10"fill="${c}"/><rect x="138"y="144"width="24"height="58"rx="10"fill="${c}"/>`;
    if (t === "witch") return `<rect x="58"y="140"width="84"height="82"rx="10"fill="${c}"/><rect x="58"y="140"width="84"height="9"rx="4"fill="${c2}"/><rect x="32"y="144"width="26"height="64"rx="10"fill="${c}"/><rect x="142"y="144"width="26"height="64"rx="10"fill="${c}"/><ellipse cx="36"cy="210"rx="14"ry="8"fill="${c2}"/><ellipse cx="164"cy="210"rx="14"ry="8"fill="${c2}"/>`;
    if (t === "summer") return `<path d="M68 140 Q54 162 52 190 L50 222 L150 222 L148 190 Q146 162 132 140Z"fill="${c}"/><rect x="34"y="144"width="22"height="58"rx="10"fill="${c}"/><rect x="144"y="144"width="22"height="58"rx="10"fill="${c}"/><circle cx="80"cy="174"r="5"fill="${c2}"opacity="0.8"/><circle cx="100"cy="165"r="4"fill="${c2}"opacity="0.8"/><circle cx="120"cy="175"r="5"fill="${c2}"opacity="0.8"/>`;
    if (t === "maid") return `<rect x="62"y="140"width="76"height="82"rx="10"fill="${c}"stroke="#E0E0E0"stroke-width="0.5"/><rect x="62"y="140"width="76"height="9"rx="4"fill="${c2}"/><rect x="80"y="152"width="40"height="58"rx="6"fill="white"opacity="0.9"/><polygon points="100,140 84,156 100,162 116,156"fill="white"/><rect x="40"y="144"width="22"height="58"rx="10"fill="${c}"/><rect x="138"y="144"width="22"height="58"rx="10"fill="${c}"/>`;
    if (t === "fairy") return `<path d="M68 140 Q60 156 58 176 L56 222 L144 222 L142 176 Q140 156 132 140Z"fill="${c}"/><rect x="62"y="140"width="76"height="8"rx="4"fill="${c2}"/><rect x="36"y="144"width="22"height="54"rx="10"fill="${c}"/><rect x="142"y="144"width="22"height="54"rx="10"fill="${c}"/><path d="M18 148 Q4 118 28 138"stroke="${c2}"stroke-width="8"fill="none"stroke-linecap="round"opacity="0.8"/><path d="M182 148 Q196 118 172 138"stroke="${c2}"stroke-width="8"fill="none"stroke-linecap="round"opacity="0.8"/>`;
    if (t === "adv") return `<rect x="62"y="140"width="76"height="82"rx="10"fill="${c}"/><rect x="76"y="140"width="48"height="70"rx="6"fill="${c2}"/><rect x="58"y="194"width="84"height="10"rx="5"fill="#5A3A1A"/><rect x="94"y="191"width="12"height="16"rx="3"fill="#D4AF37"/><rect x="40"y="144"width="22"height="58"rx="10"fill="${c}"/><rect x="138"y="144"width="22"height="58"rx="10"fill="${c}"/>`;
  } else {
    if (t === "knight") return `<rect x="58"y="138"width="84"height="84"rx="8"fill="${c}"/><rect x="58"y="138"width="84"height="8"rx="4"fill="${c2}"/><rect x="58"y="214"width="84"height="8"rx="4"fill="${c2}"/><ellipse cx="50"cy="148"rx="20"ry="12"fill="${c}"/><ellipse cx="150"cy="148"rx="20"ry="12"fill="${c}"/><rect x="30"y="146"width="24"height="58"rx="10"fill="${c}"/><rect x="146"y="146"width="24"height="58"rx="10"fill="${c}"/><rect x="32"y="196"width="20"height="9"rx="4"fill="${c2}"/><rect x="148"y="196"width="20"height="9"rx="4"fill="${c2}"/>`;
    if (t === "mwitch") return `<rect x="58"y="138"width="84"height="84"rx="8"fill="${c}"/><rect x="58"y="138"width="84"height="8"rx="4"fill="${c2}"/><rect x="30"y="142"width="28"height="66"rx="10"fill="${c}"/><rect x="142"y="142"width="28"height="66"rx="10"fill="${c}"/><ellipse cx="34"cy="210"rx="15"ry="9"fill="${c2}"/><ellipse cx="166"cy="210"rx="15"ry="9"fill="${c2}"/>`;
    if (t === "ninja") return `<rect x="60"y="140"width="80"height="82"rx="8"fill="${c}"/><path d="M60 140 L140 140 L140 158 Q120 170 100 168 Q80 170 60 158Z"fill="${c2}"opacity="0.7"/><rect x="32"y="144"width="26"height="58"rx="10"fill="${c}"/><rect x="142"y="144"width="26"height="58"rx="10"fill="${c}"/>`;
    if (t === "ranger") return `<rect x="60"y="140"width="80"height="82"rx="8"fill="${c}"/><rect x="76"y="140"width="48"height="74"rx="6"fill="${c2}"/><rect x="58"y="194"width="84"height="10"rx="5"fill="#5A3A1A"/><rect x="94"y="191"width="12"height="16"rx="3"fill="#D4AF37"/><rect x="34"y="144"width="24"height="58"rx="10"fill="${c}"/><rect x="142"y="144"width="24"height="58"rx="10"fill="${c}"/>`;
    if (t === "pirate") return `<rect x="60"y="140"width="80"height="82"rx="8"fill="${c}"/><rect x="60"y="140"width="80"height="8"rx="4"fill="${c2}"/><polygon points="100,148 88,162 100,167 112,162"fill="white"/><polygon points="98,162 102,162 101,188 99,188"fill="${c2}"/><rect x="32"y="144"width="26"height="58"rx="10"fill="${c}"/><rect x="142"y="144"width="26"height="58"rx="10"fill="${c}"/>`;
    if (t === "adv") return `<rect x="60"y="140"width="80"height="82"rx="8"fill="${c}"/><rect x="76"y="140"width="48"height="70"rx="6"fill="${c2}"/><rect x="58"y="194"width="84"height="10"rx="5"fill="#5A3A1A"/><rect x="94"y="191"width="12"height="16"rx="3"fill="#D4AF37"/><rect x="34"y="144"width="24"height="58"rx="10"fill="${c}"/><rect x="142"y="144"width="24"height="58"rx="10"fill="${c}"/>`;
  }
  return "";
}

/* ── WEAPONS ───────────────────────────────────────── */
function weaponFront(w: CharItem): string {
  const { c, c2, t } = w;
  if (t === "none") return "";
  if (t === "wand") return `<g transform="translate(180,162) rotate(-22)"><rect x="-4"y="-80"width="8"height="80"rx="4"fill="#D4A0C0"/><polygon points="0,-95 4,-84 14,-84 6,-78 10,-68 0,-74 -10,-68 -6,-78 -14,-84 -4,-84"fill="${c}"/><circle cx="14"cy="-90"r="3"fill="${c}"opacity="0.7"/></g>`;
  if (t === "sword") return `<g transform="translate(182,172) rotate(-28)"><polygon points="0,-90 6,-22 -6,-22"fill="${c}"/><rect x="-16"y="-22"width="32"height="8"rx="3"fill="${c2}"/><rect x="-5"y="-14"width="10"height="22"rx="5"fill="#3A3040"/><line x1="1"y1="-87"x2="1"y2="-28"stroke="white"stroke-width="1.5"opacity="0.4"/></g>`;
  if (t === "bow") return `<g transform="translate(184,154)"><path d="M0,-78 Q34,-40 0,6"stroke="${c}"stroke-width="7"fill="none"stroke-linecap="round"/><line x1="0"y1="-78"x2="0"y2="6"stroke="#CCCCCC"stroke-width="2"/><line x1="-5"y1="-36"x2="20"y2="-36"stroke="${c2}"stroke-width="2.5"/><polygon points="20,-36 13,-31 13,-41"fill="${c2}"/></g>`;
  if (t === "staff") return `<g transform="translate(182,164) rotate(-12)"><rect x="-4"y="-98"width="8"height="100"rx="4"fill="#8B6914"/><circle cx="0"cy="-104"r="16"fill="${c}"opacity="0.9"/><circle cx="0"cy="-104"r="16"fill="none"stroke="white"stroke-width="2"opacity="0.35"/></g>`;
  if (t === "dagger") return `<g transform="translate(172,172) rotate(-18)"><polygon points="0,-66 5.5,-16 -5.5,-16"fill="${c}"/><rect x="-9"y="-16"width="18"height="6"rx="2"fill="${c2}"/><rect x="-4"y="-10"width="8"height="16"rx="4"fill="#3A3A3A"/></g><g transform="translate(190,168) rotate(14)"><polygon points="0,-58 5,-14 -5,-14"fill="${c}"/><rect x="-9"y="-14"width="18"height="6"rx="2"fill="${c2}"/><rect x="-4"y="-8"width="8"height="14"rx="4"fill="#3A3A3A"/></g>`;
  if (t === "axe") return `<g transform="translate(182,170) rotate(-15)"><rect x="-3.5"y="-90"width="7"height="90"rx="3.5"fill="#8B6914"/><path d="M0,-90 Q30,-80 28,-60 Q26,-42 0,-46 Q10,-54 12,-68 Q14,-82 0,-90Z"fill="${c}"/><path d="M0,-90 Q-20,-82 -18,-64 Q-16,-46 0,-50 Q-8,-58 -10,-72 Q-12,-84 0,-90Z"fill="${c2}"/></g>`;
  if (t === "spear") return `<g transform="translate(184,165) rotate(-18)"><rect x="-3"y="-100"width="6"height="100"rx="3"fill="#8B6914"/><polygon points="0,-112 8,-90 -8,-90"fill="${c}"/><rect x="-9"y="-92"width="18"height="5"rx="2"fill="${c2}"/></g>`;
  return "";
}

function weaponSide(w: CharItem): string {
  const { c, c2, t } = w;
  if (t === "none") return "";
  if (t === "sword") return `<g transform="translate(56,178) rotate(82)"><polygon points="0,-72 5,-18 -5,-18"fill="${c}"/><rect x="-14"y="-18"width="28"height="7"rx="3"fill="${c2}"/><rect x="-4"y="-11"width="8"height="18"rx="4"fill="#3A3040"/></g>`;
  if (t === "wand") return `<g transform="translate(54,180) rotate(85)"><rect x="-3.5"y="-68"width="7"height="68"rx="3.5"fill="#D4A0C0"/><polygon points="0,-80 3,-72 10,-72 4,-66 7,-58 0,-63 -7,-58 -4,-66 -10,-72 -3,-72"fill="${c}"/></g>`;
  return `<g transform="translate(54,180) rotate(84)"><rect x="-3"y="-70"width="6"height="70"rx="3"fill="${c}"/></g>`;
}

function weaponBack(w: CharItem): string {
  const { c, t } = w;
  if (t === "none") return "";
  return `<g transform="translate(118,168) rotate(8)"><rect x="-3"y="-58"width="6"height="58"rx="3"fill="${c}"opacity="0.75"/></g>`;
}

/* ── ACCESSORIES ───────────────────────────────────── */
function accSVG(a: CharItem, g: Gender): string {
  const { c, c2, t } = a;
  if (g === "f") {
    if (t === "cat") return `<polygon points="70,46 62,16 88,38"fill="${c}"/><polygon points="130,46 138,16 112,38"fill="${c}"/><polygon points="72,44 66,20 86,38"fill="${c2}"opacity="0.7"/><polygon points="128,44 134,20 114,38"fill="${c2}"opacity="0.7"/>`;
    if (t === "flower") return `<rect x="66"y="38"width="68"height="8"rx="4"fill="#8B6914"/><circle cx="78"cy="37"r="8"fill="#FFD700"/><circle cx="78"cy="37"r="4"fill="white"/><circle cx="94"cy="32"r="8"fill="${c2}"/><circle cx="94"cy="32"r="4"fill="#FFD700"/><circle cx="110"cy="31"r="8"fill="#FF87AB"/><circle cx="110"cy="31"r="4"fill="#FFD700"/><circle cx="126"cy="36"r="8"fill="#87D4C8"/><circle cx="126"cy="36"r="4"fill="white"/>`;
    if (t === "whood") return `<polygon points="100,6 66,46 134,46"fill="${c}"/><rect x="58"y="44"width="84"height="10"rx="5"fill="${c2}"opacity="0.7"/>`;
    if (t === "bunny") return `<ellipse cx="82"cy="24"rx="11"ry="30"fill="${c}"stroke="#E0E0E0"stroke-width="0.5"/><ellipse cx="118"cy="24"rx="11"ry="30"fill="${c}"stroke="#E0E0E0"stroke-width="0.5"/><ellipse cx="82"cy="24"rx="7"ry="24"fill="${c2}"/><ellipse cx="118"cy="24"rx="7"ry="24"fill="${c2}"/>`;
    if (t === "halo") return `<ellipse cx="100"cy="18"rx="30"ry="8"fill="none"stroke="${c}"stroke-width="6"/><ellipse cx="100"cy="18"rx="30"ry="8"fill="none"stroke="white"stroke-width="2.5"opacity="0.5"/>`;
  } else {
    if (t === "ninja_b") return `<rect x="62"y="50"width="76"height="12"rx="6"fill="${c}"/><circle cx="100"cy="54"r="6"fill="${c2}"/>`;
    if (t === "pirate_h") return `<ellipse cx="100"cy="44"rx="42"ry="10"fill="${c}"/><rect x="70"y="18"width="60"height="28"rx="8"fill="${c}"/><rect x="82"y="26"width="36"height="4"rx="2"fill="${c2}"/><polygon points="88,26 100,10 112,26"fill="${c2}"/>`;
    if (t === "crown") return `<polygon points="66,46 66,22 80,34 100,16 120,34 134,22 134,46"fill="${c}"/><circle cx="100"cy="18"r="5"fill="${c2}"/><circle cx="80"cy="35"r="4"fill="${c2}"/><circle cx="120"cy="35"r="4"fill="${c2}"/>`;
    if (t === "mask") return `<path d="M76 72 Q68 84 70 96 Q80 104 100 104 Q120 104 130 96 Q132 84 124 72Z"fill="${c}"opacity="0.92"/><circle cx="83"cy="83"r="6"fill="none"stroke="${c2}"stroke-width="1.5"/><circle cx="117"cy="83"r="6"fill="none"stroke="${c2}"stroke-width="1.5"/>`;
    if (t === "ranger_h") return `<ellipse cx="100"cy="44"rx="42"ry="10"fill="${c}"/><path d="M72 40 Q100 24 128 40"fill="${c}"stroke="${c2}"stroke-width="2"/>`;
  }
  return "";
}

/* ── FACE BUILDERS ─────────────────────────────────── */
function faceFront(g: Gender, skin: string, eyeC: string): string {
  const bl = g === "f" ? 0.45 : 0.18;
  const brows = g === "f"
    ? `<path d="M72 74 Q82 68 90 72"stroke="#5A3A2A"stroke-width="2"fill="none"stroke-linecap="round"/><path d="M110 72 Q118 68 128 74"stroke="#5A3A2A"stroke-width="2"fill="none"stroke-linecap="round"/>`
    : `<path d="M72 72 Q82 66 90 70"stroke="#3A2A1A"stroke-width="2.5"fill="none"stroke-linecap="round"/><path d="M110 70 Q118 66 128 72"stroke="#3A2A1A"stroke-width="2.5"fill="none"stroke-linecap="round"/>`;
  const mouth = g === "f"
    ? `<path d="M90 108 Q100 116 110 108"stroke="#FF6B8A"stroke-width="2.5"fill="none"stroke-linecap="round"/>`
    : `<path d="M90 106 Q100 112 110 106"stroke="#CC6655"stroke-width="2"fill="none"stroke-linecap="round"/>`;
  return `<ellipse cx="100"cy="80"rx="46"ry="48"fill="${skin}"/>${brows}<g class="el"><ellipse cx="82"cy="84"rx="11"ry="13"fill="white"/><ellipse cx="82"cy="86"rx="8"ry="10"fill="${eyeC}"/><ellipse cx="82"cy="87"rx="5"ry="7"fill="#1A1A2E"/><ellipse cx="85"cy="81"rx="3"ry="3.5"fill="white"/><circle cx="87"cy="86"r="1.2"fill="white"opacity="0.8"/></g><g class="er"><ellipse cx="118"cy="84"rx="11"ry="13"fill="white"/><ellipse cx="118"cy="86"rx="8"ry="10"fill="${eyeC}"/><ellipse cx="118"cy="87"rx="5"ry="7"fill="#1A1A2E"/><ellipse cx="121"cy="81"rx="3"ry="3.5"fill="white"/><circle cx="123"cy="86"r="1.2"fill="white"opacity="0.8"/></g><ellipse cx="100"cy="95"rx="4"ry="2.5"fill="#FFBBA0"opacity="0.7"/>${mouth}<ellipse cx="70"cy="99"rx="13"ry="8"fill="#FFB7C5"opacity="${bl}"/><ellipse cx="130"cy="99"rx="13"ry="8"fill="#FFB7C5"opacity="${bl}"/>`;
}

function faceQuarter(g: Gender, skin: string, eyeC: string): string {
  const bl = g === "f" ? 0.45 : 0.18;
  const brows = g === "f"
    ? `<path d="M76 74 Q86 68 94 72"stroke="#5A3A2A"stroke-width="2"fill="none"stroke-linecap="round"/><path d="M112 72 Q120 68 130 74"stroke="#5A3A2A"stroke-width="2"fill="none"stroke-linecap="round"/>`
    : `<path d="M76 72 Q86 66 94 70"stroke="#3A2A1A"stroke-width="2.5"fill="none"stroke-linecap="round"/><path d="M112 70 Q120 66 130 72"stroke="#3A2A1A"stroke-width="2.5"fill="none"stroke-linecap="round"/>`;
  const mouth = g === "f"
    ? `<path d="M94 108 Q104 116 114 108"stroke="#FF6B8A"stroke-width="2.5"fill="none"stroke-linecap="round"/>`
    : `<path d="M94 106 Q104 112 114 106"stroke="#CC6655"stroke-width="2"fill="none"stroke-linecap="round"/>`;
  return `<path d="M60 80 Q62 36 108 32 Q148 36 148 80 Q148 124 108 128 Q68 124 60 80Z"fill="${skin}"/>${brows}<g class="eq"><ellipse cx="86"cy="84"rx="9"ry="11"fill="white"/><ellipse cx="86"cy="86"rx="6.5"ry="8.5"fill="${eyeC}"/><ellipse cx="86"cy="87"rx="4"ry="5.5"fill="#1A1A2E"/><ellipse cx="88"cy="81"rx="2.5"ry="3"fill="white"/></g><g class="eqr"><ellipse cx="118"cy="84"rx="11"ry="13"fill="white"/><ellipse cx="118"cy="86"rx="8"ry="10"fill="${eyeC}"/><ellipse cx="118"cy="87"rx="5"ry="7"fill="#1A1A2E"/><ellipse cx="121"cy="81"rx="3"ry="3.5"fill="white"/><circle cx="123"cy="86"r="1.2"fill="white"opacity="0.8"/></g><ellipse cx="104"cy="95"rx="4"ry="2.5"fill="#FFBBA0"opacity="0.7"/>${mouth}<ellipse cx="76"cy="99"rx="10"ry="7"fill="#FFB7C5"opacity="${bl * 0.55}"/><ellipse cx="132"cy="99"rx="13"ry="8"fill="#FFB7C5"opacity="${bl}"/>`;
}

function faceSide(g: Gender, skin: string, eyeC: string): string {
  const skin2 = g === "f" ? "#F0B898" : "#D4A880";
  const brow = g === "f"
    ? `<path d="M110 72 Q118 67 126 70"stroke="#5A3A2A"stroke-width="1.8"fill="none"stroke-linecap="round"/>`
    : `<path d="M108 70 Q116 65 126 68"stroke="#3A2A1A"stroke-width="2.2"fill="none"stroke-linecap="round"/>`;
  const mouth = g === "f"
    ? `<line x1="114"y1="108"x2="126"y2="106"stroke="#FF9999"stroke-width="2.5"stroke-linecap="round"/>`
    : `<line x1="114"y1="106"x2="126"y2="104"stroke="#CC6655"stroke-width="2"stroke-linecap="round"/>`;
  return `<ellipse cx="80"cy="82"rx="11"ry="15"fill="${skin}"/><ellipse cx="81"cy="82"rx="7.5"ry="10.5"fill="${skin2}"/><ellipse cx="106"cy="80"rx="30"ry="46"fill="${skin}"/><rect x="90"y="120"width="18"height="22"rx="6"fill="${skin}"/>${brow}<g class="es"><ellipse cx="119"cy="80"rx="9"ry="11"fill="white"/><ellipse cx="119"cy="82"rx="6.5"ry="8.5"fill="${eyeC}"/><ellipse cx="119"cy="83"rx="4"ry="6"fill="#1A1A2E"/><ellipse cx="121"cy="77"rx="2.5"ry="3"fill="white"/><circle cx="122"cy="82"r="1"fill="white"opacity="0.8"/></g><path d="M134 90 Q140 96 133 102"stroke="${skin2}"stroke-width="3.5"fill="none"stroke-linecap="round"/>${mouth}`;
}

function faceQBack(skin: string): string {
  return `<ellipse cx="98"cy="80"rx="46"ry="48"fill="${skin}"/><ellipse cx="144"cy="82"rx="9"ry="13"fill="${skin}"/><path d="M144 60 Q152 72 152 84 Q152 96 144 110"stroke="${skin}"stroke-width="6"fill="none"stroke-linecap="round"/>`;
}

function faceBack(skin: string): string {
  return `<ellipse cx="100"cy="80"rx="46"ry="48"fill="${skin}"/><rect x="88"y="122"width="24"height="18"rx="6"fill="${skin}"/><path d="M76 116 Q100 122 124 116"stroke="${skin}"stroke-width="3"fill="none"opacity="0.35"/>`;
}

/* ── NON-FRONT BODY ────────────────────────────────── */
function bodyOther(base: number, o: CharItem, g: Gender): string {
  const { c } = o;
  if (base === 1) return `<rect x="66"y="140"width="76"height="82"rx="10"fill="${c}"/><rect x="${g === "f" ? 42 : 40}"y="144"width="22"height="58"rx="10"fill="${c}"/><rect x="142"y="144"width="${g === "f" ? 22 : 26}"height="58"rx="10"fill="${c}"/>`;
  if (base === 2) return `<rect x="88"y="140"width="28"height="82"rx="8"fill="${c}"/><rect x="62"y="144"width="24"height="52"rx="10"fill="${c}"/><ellipse cx="74"cy="198"rx="14"ry="7"fill="${c}"/>`;
  if (base === 3) return `<rect x="62"y="140"width="76"height="82"rx="10"fill="${c}"/><rect x="38"y="144"width="20"height="50"rx="10"fill="${c}"opacity="0.7"/><rect x="138"y="144"width="22"height="56"rx="10"fill="${c}"/>`;
  if (base === 4) {
    const c2 = o.c2;
    return `<rect x="58"y="140"width="84"height="82"rx="10"fill="${c}"/><rect x="30"y="144"width="26"height="58"rx="10"fill="${c}"/><rect x="144"y="144"width="26"height="58"rx="10"fill="${c}"/><rect x="82"y="138"width="36"height="8"rx="4"fill="${c2}"opacity="0.5"/>`;
  }
  return "";
}

function legs(base: number): string {
  const lc = "#3A3060", sc = "#2A1840";
  if (base === 0) return `<rect x="66"y="222"width="28"height="44"rx="11"fill="${lc}"/><rect x="106"y="222"width="28"height="44"rx="11"fill="${lc}"/><ellipse cx="80"cy="265"rx="18"ry="8"fill="${sc}"/><ellipse cx="120"cy="265"rx="18"ry="8"fill="${sc}"/>`;
  if (base === 1) return `<rect x="70"y="222"width="28"height="44"rx="11"fill="${lc}"/><rect x="108"y="222"width="24"height="44"rx="11"fill="${lc}"/><ellipse cx="84"cy="265"rx="17"ry="8"fill="${sc}"/><ellipse cx="120"cy="265"rx="15"ry="8"fill="${sc}"/>`;
  if (base === 2) return `<rect x="84"y="222"width="20"height="38"rx="10"fill="${lc}"opacity="0.7"/><rect x="94"y="222"width="20"height="44"rx="10"fill="${lc}"/><ellipse cx="104"cy="265"rx="16"ry="7"fill="${sc}"/>`;
  if (base === 3) return `<rect x="68"y="222"width="24"height="44"rx="11"fill="${lc}"/><rect x="106"y="222"width="28"height="44"rx="11"fill="${lc}"/><ellipse cx="80"cy="265"rx="15"ry="8"fill="${sc}"/><ellipse cx="120"cy="265"rx="17"ry="8"fill="${sc}"/>`;
  if (base === 4) return `<rect x="66"y="222"width="28"height="44"rx="11"fill="${lc}"/><rect x="106"y="222"width="28"height="44"rx="11"fill="${lc}"/><ellipse cx="80"cy="265"rx="18"ry="8"fill="${sc}"/><ellipse cx="120"cy="265"rx="18"ry="8"fill="${sc}"/>`;
  return "";
}

function neck(base: number, g: Gender): string {
  const skin = g === "f" ? "#FFDCC8" : "#F5C9A0";
  if (base === 0 || base === 1) return `<rect x="90"y="122"width="20"height="22"rx="6"fill="${skin}"/>`;
  if (base === 2) return "";
  if (base === 3 || base === 4) return `<rect x="90"y="122"width="20"height="18"rx="6"fill="${skin}"/>`;
  return "";
}

/* ── MAIN CHARACTER BUILDER ────────────────────────── */
export function buildCharacterSVG(
  gender: Gender,
  hairIdx: number,
  outfitIdx: number,
  accIdx: number,
  weaponIdx: number,
  angle: number,
  data: Record<Gender, Record<string, CharItem[]>>
): string {
  const base = BASE_ANGLES[angle];
  const mir = MIRROR_ANGLES[angle];

  const h = data[gender].hair[hairIdx];
  const o = data[gender].outfit[outfitIdx];
  const a = data[gender].acc[accIdx];
  const w = data[gender].weapon[weaponIdx];

  const skin = gender === "f" ? "#FFDCC8" : "#F5C9A0";
  const eyeC = gender === "f" ? "#D45388" : "#4A7ABF";

  let hairB = "", wp = "", bd = "", leg = "", nk = "", face = "", hairF = "", acc = "";

  if (base === 2) { hairB = hairSide(h, gender); } else { hairB = hairBack(h, gender); }
  if (base <= 1) { wp = weaponFront(w); } else if (base === 2) { wp = weaponSide(w); } else { wp = weaponBack(w); }
  if (base === 0) { bd = bodyFront(o, gender); } else { bd = bodyOther(base, o, gender); }
  leg = legs(base);
  nk = neck(base, gender);
  if (base === 0) { face = faceFront(gender, skin, eyeC); }
  else if (base === 1) { face = faceQuarter(gender, skin, eyeC); }
  else if (base === 2) { face = faceSide(gender, skin, eyeC); }
  else if (base === 3) { face = faceQBack(skin); }
  else { face = faceBack(skin); }
  if (base <= 1) { hairF = hairFront(h, gender); }
  if (base <= 1) { acc = accSVG(a, gender); }

  const inner = hairB + wp + bd + leg + nk + face + hairF + acc;
  return mir ? `<g transform="translate(200,0) scale(-1,1)">${inner}</g>` : inner;
}
