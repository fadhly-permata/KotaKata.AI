// PLAN-048: scan clue (c1/c2/c3) yang memuat kata bahasa Inggris mentah.
// Tujuan: kosakata & clue 100% bahasa Indonesia. Kata Inggris yang sudah
// diserap & lazim (video, audio, menu, jus, alarm, dll) TIDAK di-flag —
// daftar di bawah hanya kata Inggris yang TIDAK lazim dipakai di Indonesia.
// Usage: node scripts/check/scan-english-clues.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

const ENGLISH = [
  // kata Inggris umum yang tidak lazim sebagai kata Indonesia
  "wine", "cheese", "pizza", "burger", "pasta", "coffee", "bread", "juice",
  "sidewalk", "maroon", "olive", "corn", "butter", "rhinoceros", "dolphin",
  "egg", "meat", "fruit", "water", "fire", "rain", "sun", "moon", "star",
  "sky", "sea", "ocean", "river", "mountain", "forest", "tree", "flower",
  "bird", "fish", "dog", "cat", "cow", "horse", "tiger", "lion", "bear",
  "monkey", "elephant", "giraffe", "zebra", "snake", "frog", "turtle",
  "shark", "whale", "octopus", "crab", "shrimp", "school", "office",
  "hospital", "hotel", "restaurant", "market", "shop", "store", "bank",
  "train", "plane", "boat", "ship", "car", "bus", "bike", "road", "street",
  "bridge", "wall", "floor", "door", "window", "roof", "kitchen", "table",
  "chair", "sofa", "bed", "desk", "fridge", "oven", "cup", "plate", "bowl",
  "spoon", "fork", "knife", "glass", "bottle", "jar", "bag", "box",
  "basket", "bucket", "clean", "dirty", "wet", "dry", "hot", "cold",
  "warm", "fast", "slow", "early", "late", "now", "then", "here", "there",
  "yes", "no", "good", "bad", "great", "nice", "happy", "sad", "angry",
  "scared", "tired", "sleepy", "hungry", "thirsty", "sick", "healthy",
  "strong", "weak", "rich", "poor", "young", "old", "new", "big", "small",
  "large", "tiny", "short", "tall", "long", "high", "low", "deep", "wide",
  "narrow", "thick", "thin", "fat", "round", "square", "circle", "oval",
  "heart", "line", "curve", "straight", "flat", "soft", "hard", "liquid",
  "gas", "light", "heavy", "dark", "bright", "clear", "cloudy", "windy",
  "rainy", "sunny", "empty", "full", "half", "piece", "part", "whole",
  "single", "double", "pair", "set", "group", "team", "family", "friend",
  "enemy", "guest", "host", "boss", "worker", "doctor", "nurse", "teacher",
  "student", "pilot", "driver", "farmer", "sailor", "soldier", "police",
  "artist", "singer", "dancer", "actor", "writer", "author", "poet",
  "lawyer", "judge", "court", "crime", "thief", "murder", "kill", "die",
  "dead", "death", "life", "live", "alive", "birth", "baby", "child",
  "adult", "man", "woman", "boy", "girl", "guy", "lady", "angel", "devil",
  "god", "heaven", "hell", "soul", "spirit", "ghost", "witch", "wizard",
  "magic", "pray", "faith", "church", "temple", "bible", "prophet", "monk",
  "nun", "priest", "wisdom", "truth", "lie", "false", "true", "real",
  "fake", "joke", "fun", "comedy", "drama", "play", "show", "film",
  "movie", "cinema", "stage", "role", "story", "legend", "myth", "dragon",
  "unicorn", "vampire", "zombie", "mummy", "weird", "strange", "normal",
  "common", "rare", "special", "unique", "average", "standard", "regular",
  "amazing", "awesome", "wonderful", "excellent", "incredible", "actual",
  "genuine", "valid", "legal", "illegal", "allow", "forbid", "forgive",
  "sorry", "please", "thank", "hello", "peace", "love", "hate", "like",
  "enjoy", "choose", "select", "pick", "decide", "choice", "option",
  "chance", "luck", "fortune", "fate", "destiny", "miracle", "dream",
  "nightmare", "sleep", "wake", "rest", "relax", "calm", "quiet",
  "silent", "noise", "loud", "sound", "voice", "speak", "talk", "say",
  "tell", "ask", "answer", "reply", "request", "demand", "order",
  "advice", "suggestion", "tip", "hint", "clue", "idea", "thought",
  "mind", "memory", "remember", "forget", "understand", "notice",
  "observe", "watch", "see", "look", "view", "stare", "glance", "scan",
  "check", "verify", "confirm", "prove", "test", "try", "attempt",
  "fight", "battle", "war", "conflict", "debate", "discussion",
  "conversation", "chat", "speech", "language", "word", "phrase",
  "sentence", "paragraph", "chapter", "page", "book", "novel", "article",
  "report", "review", "praise", "blame", "respect", "admire", "value",
  "worth", "price", "cost", "expense", "payment", "charge", "fee", "fine",
  "penalty", "reward", "prize", "bonus", "gift", "donation", "charity",
  "fund", "budget", "finance", "money", "cash", "coin", "note", "bill",
  "check", "card", "credit", "debit", "account", "balance", "interest",
  "loan", "debt", "tax", "trade", "business", "company", "firm",
  "industry", "factory", "plant", "warehouse", "inventory", "stock",
  "supply", "demand", "market", "economy", "growth", "development",
  "progress", "modern", "ancient", "history", "past", "present", "future",
  "century", "decade", "year", "month", "week", "day", "hour", "minute",
  "second", "moment", "period", "era", "age", "time", "clock", "watch",
  "calendar", "date", "schedule", "meeting", "event", "celebration",
  "party", "festival", "holiday", "vacation", "trip", "journey", "travel",
  "tour", "visit", "explore", "discover", "adventure", "experience",
  "photo", "picture", "image", "painting", "drawing", "portrait",
  "landscape", "scenery", "sight", "scene", "camera", "record", "disk",
  "data", "information", "knowledge", "fact", "reality", "fiction",
  "fantasy", "imagination", "original", "different", "similar", "same",
  "alike", "equal", "identical", "opposite", "reverse", "website",
  "internet", "email", "phone", "number", "symbol", "sign", "mark",
  "icon", "logo", "brand", "label", "name", "title", "heading", "header",
  "content", "body", "font", "style", "format", "layout", "design",
  "color", "shade", "tone", "hue", "tint", "pastel", "neon", "bright",
  "vivid", "pale", "faded", "paint", "ink", "pigment", "stain", "spot",
  "scratch", "dent", "chip", "crack", "break", "bend", "twist", "turn",
  "rotate", "spin", "orbit", "circle", "loop", "cycle", "repeat", "again",
  "once", "twice", "multiple", "several", "various", "numerous",
  "infinite", "finite", "limited", "endless", "perfect", "ideal",
  "paradise", "bliss", "joy", "delight", "pleasure", "happiness",
  "satisfaction", "achievement", "success", "victory", "triumph", "win",
  "defeat", "conquer", "overcome", "exceed", "dominate", "control",
  "command", "rule", "govern", "lead", "guide", "direct", "manage",
  "supervise", "organize", "arrange", "plan", "prepare", "fix", "repair",
  "mend", "restore", "recover", "heal", "cure", "treat", "medicine",
  "drug", "pill", "tablet", "capsule", "syrup", "injection", "vaccine",
  "antibiotic", "poison", "toxin", "venom", "blood", "cell", "tissue",
  "organ", "bone", "muscle", "nerve", "brain", "heart", "lungs", "liver",
  "kidney", "stomach", "intestine", "bladder", "spleen", "pancreas",
  "gland", "hormone", "enzyme", "protein", "vitamin", "mineral",
  "calcium", "iron", "zinc", "magnesium", "potassium", "sodium", "iodine",
  "selenium", "copper", "nickel", "titanium", "aluminum", "silicon",
  "phosphorus", "carbon", "nitrogen", "oxygen", "hydrogen", "helium",
  "neon", "argon", "cobalt", "gallium", "germanium", "arsenic", "bromine",
  "krypton", "rubidium", "silver", "cadmium", "indium", "tin", "antimony",
  "tellurium", "xenon", "cesium", "barium", "lanthanum", "tungsten",
  "rhenium", "osmium", "iridium", "platinum", "gold", "mercury",
  "thallium", "lead", "bismuth", "radon", "radium", "thorium", "uranium",
  // proper noun / merek umum
  "start", "stop", "lose", "yard", "cheetah", "fuchsia", "qurban", "trottoar",
].filter(Boolean);

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const hits = [];

for (const f of readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f))) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) {
    const word = m[1];
    const clues = [m[2], m[3], m[4]];
    for (const c of clues) {
      const lower = c.toLowerCase();
      for (const en of ENGLISH) {
        // word-boundary: hindari false-positive (mis. "cheese" di "cheese cake")
        const re = new RegExp(`\\b${en}\\b`, "i");
        if (re.test(lower) && !lower.includes(`sinonim: ${en}`) && lower !== en) {
          hits.push({ file: f, word, clue: c.slice(0, 70), en });
        }
      }
    }
  }
}

console.log(`Total hit: ${hits.length}`);
const seen = new Set();
for (const h of hits) {
  const key = `${h.word}|${h.clue}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  [${h.file}] "${h.word}" c1/c2/c3 mengandung "${h.en}": ${h.clue}`);
}
