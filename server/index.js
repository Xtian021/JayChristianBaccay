require("dotenv").config({
  path: require("path").join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

// ==========================================
// CONFIGURATION
// ==========================================

const FACEBOOK_URL = "https://www.facebook.com/chris.tian.727095/";
const INSTAGRAM_URL = "https://www.instagram.com/christian21217/";
const CONTACT_EMAIL = "baccaytom88@gmail.com";
const CONTACT_PHONE = "09976432312";

const PH_TIMEZONE = "Asia/Manila";
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || "grok-4.7";
const GROK_TIMEOUT_MS = 120000;
const GROK_MAX_TOKENS = Number(process.env.GROK_MAX_TOKENS) || 800;

const GROK_DAILY_LIMIT = Number(process.env.GROK_DAILY_LIMIT) || 500;
const GROK_MAX_CARRYOVER = Number(process.env.GROK_MAX_CARRYOVER) || 500;
const GROK_PER_IP_DAILY_LIMIT =
  Number(process.env.GROK_PER_IP_DAILY_LIMIT) || 30;

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://xtian021.github.io",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "1mb" }));

// ==========================================
// RATE LIMIT
// ==========================================

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const entry = hits.get(req.ip);

  if (!entry || now > entry.reset) {
    hits.set(req.ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: "Masyadong maraming messages. Subukan ulit after ng isang minuto."
    });
  }

  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now > entry.reset) hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

// ==========================================
// DAILY GROK QUOTA
// ==========================================

function getPhilippineDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

let grokDailyUsage = {
  date: getPhilippineDateKey(),
  attempts: 0,
  bonus: 0
};

function getDailyUsage() {
  const today = getPhilippineDateKey();

  if (grokDailyUsage.date !== today) {
    const unused = Math.max(
      0,
      GROK_DAILY_LIMIT + grokDailyUsage.bonus - grokDailyUsage.attempts
    );

    grokDailyUsage = {
      date: today,
      attempts: 0,
      bonus: Math.min(unused, GROK_MAX_CARRYOVER)
    };

    console.log(`Grok daily counter reset: ${today}`);
  }

  return grokDailyUsage;
}

function getGrokLimitToday() {
  const usage = getDailyUsage();
  return GROK_DAILY_LIMIT + usage.bonus;
}

function getRemainingGrokAttempts() {
  return Math.max(0, getGrokLimitToday() - getDailyUsage().attempts);
}

setInterval(getDailyUsage, 60000).unref();

// ==========================================
// DATA
// ==========================================

function randomReply(items) {
  return items[Math.floor(Math.random() * items.length)];
}

const HUGOT_LINES = [
  "Minsan, hindi ka naman niya ayaw… baka hindi ka lang talaga niya gusto. AY! Next question! 😭💔",
  "Ang love parang Wi-Fi. Minsan full bars ka, pero wala ka pa ring connection. 📶😭",
  "Hindi lahat ng nagpaparamdam, may balak. Yung iba, nanggugulo lang ng tahimik mong buhay. HAHAHA! 💀",
  "Ang hirap mag-assume. Ikaw na gumawa ng story, ikaw pa ang nasaktan sa ending. 😭",
  "Mas okay nang single kaysa taken for granted. Pero minsan nakakainggit din yung may ka-good morning. HAHAHA! 😭",
  "Hindi lahat ng butterflies ay love. Baka gutom ka lang. Kain ka muna! 🦋🍔",
  "May mga taong dumarating para turuan kang magmahal. Yung iba naman para turuan kang mag-block. CHAROT! 🤣"
];

const FRIENDS = [
  {
    name: "Arjay Cabia Cabinbin",
    match: /\b(cabinbin|cabia)\b/,
    tl: "Criminology ang kurso niya at registered na.",
    en: "He studied Criminology and is registered."
  },
  {
    name: "Ar-jay Catolico Bucad",
    match: /\b(bucad|catolico|ar-jay|ar jay)\b/,
    tl: "Agriculture ang kurso niya at registered na.",
    en: "He studied Agriculture and is registered."
  },
  {
    name: "Kyle Jezxel Brytch",
    match: /\b(brytch|kyle|jezxel)\b/,
    tl: "Criminology ang kurso niya.",
    en: "He studied Criminology."
  },
  {
    name: "Prince Jomari Gallasinao",
    match: /\b(gallasinao|jomari|prince)\b/,
    tl: "Graduate siya ng BS Criminology.",
    en: "He is a BS Criminology graduate."
  },
  {
    name: "Jerome Angel Dioniso",
    match: /\b(dioniso|jerome)\b/,
    tl: "",
    en: ""
  },
  {
    name: "Orlando Banguel",
    match: /\b(banguel|orlando)\b/,
    tl: "",
    en: ""
  },
  {
    name: "Jonathan Mina",
    match: /\b(mina|jonathan)\b/,
    tl: "Agriculture ang kurso niya.",
    en: "He studied Agriculture."
  },
  {
    name: "Jeffryl Quitolbo",
    match: /\b(quitolbo|jeffryl)\b/,
    tl: "",
    en: ""
  }
];

const TESDA_CLASSMATES = [
  "Abejane Medrano",
  "Ace Batad",
  "Alex Bondoc",
  "Alvin Castillo",
  "Angel Valiente",
  "Annaliza Liu",
  "Chev Rolet Apan",
  "Christine M. Borac",
  "Cristine Ronquillo Agustin",
  "Dan Batoon",
  "Dionicio Manzano Ulep Jr.",
  "Divina Flores Coloma",
  "Ed Santos",
  "Ela Garnet de Vera",
  "Emerald Apiado Garcia",
  "Ferick John Baltazar Ragojos",
  "Hazel Lucas",
  "Jay Ann Mabatan Bartolome",
  "Jenelyn Quillope Nacnac",
  "Jessica Ramos Manuel",
  "Jhonabhel Domingo Colot KSMA",
  "Jhunie Aquino",
  "Joanna Marie Delacruz Sablon",
  "Kim Besa",
  "KJ Espiritu Valdez",
  "Lerry Fortuno",
  "Lexter Dacuycuy",
  "Nicole Tabilin Gatchalian",
  "Rodessa Constantino Carani"
];

// ==========================================
// TEXT AND HISTORY HELPERS
// ==========================================

function normalizeMessage(message) {
  return String(message || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function historyText(item) {
  if (!item || typeof item !== "object") return "";

  const value =
    typeof item.text === "string" ? item.text :
    typeof item.content === "string" ? item.content :
    typeof item.message === "string" ? item.message : "";

  return value.trim();
}

function historyRole(item) {
  if (!item || typeof item !== "object") return null;

  const role = String(item.role || item.sender || "").toLowerCase();

  if (["user", "human", "visitor"].includes(role)) return "user";
  if (["assistant", "model", "bot", "ai"].includes(role)) return "assistant";

  return null;
}

function cleanHistory(history, currentMessage) {
  if (!Array.isArray(history)) return [];

  const list = history.filter(item => historyText(item));
  const last = list[list.length - 1];

  if (
    last &&
    historyRole(last) === "user" &&
    historyText(last) === String(currentMessage || "").trim()
  ) {
    return list.slice(0, -1);
  }

  return list;
}

// ==========================================
// LANGUAGE AND MODE DETECTION
// ==========================================

const TAGALOG_WORDS = new Set([
  "po", "opo", "ba", "ang", "ng", "mga", "si", "ni", "kay", "nya",
  "niya", "mo", "ko", "ako", "ikaw", "siya", "sya", "kami", "tayo",
  "pwede", "puwede", "meron", "wala", "ano", "saan", "sino", "paano",
  "bakit", "kailan", "naghahanap", "gusto", "namin", "natin", "salamat",
  "kumusta", "kamusta", "magandang", "taga", "nga", "naman", "lang",
  "yung", "yun", "ito", "dito", "hindi", "oo", "sige", "trabaho",
  "sweldo", "sahod", "kumpanya", "ilang", "gaano", "kilala", "kaibigan",
  "kasama", "kaklase", "hays", "hay", "naman", "kasi", "talaga",
  "pala", "kaya", "ganun", "ganyan", "sana", "akala", "isip"
]);

function isTagalog(q) {
  const words = q.split(" ");
  return words.some(word => TAGALOG_WORDS.has(word));
}

const PRO_RE =
  /\b(job offer|job opening|job opportunity|work opportunity|offering|hiring|hire|hired|recruiter|recruitment|vacancy|vacancies|interview|resume|cv|curriculum vitae|employer|employment|human resources|hr|join our team|our company|our office|work for us|work with us|salary|sweldo|sahod|compensation|pay rate|hourly rate|daily rate|monthly rate|availability|available for work|available to work|start date|contact jay|reach jay|get in touch with jay|contact info|contact details|contact number|email|e-mail|phone number|mobile number|business inquiry|project inquiry|freelance|proposal|trabaho|kumpanya|applicant|applying|apply|work schedule|onboarding)\b/;

const CONTACT_RE =
  /\b(contact|reach|makontak|makokontak|macontact|email|e-mail|phone number|mobile number|contact number)\b/;

const SALARY_RE =
  /\b(salary|sweldo|sahod|compensation|pay rate|hourly rate|daily rate|monthly rate)\b/;

const AVAILABILITY_RE =
  /\b(availability|available for work|available to work|start date|work schedule|available ba|kailan siya pwede)\b/;

const WHY_HIRE_RE =
  /\b(why should (we|i) hire|why hire|why would (we|i) hire|why are you qualified|why is jay qualified|why choose jay|what can jay contribute|what can he contribute|bakit ka namin kukunin|bakit ikaw ang pipiliin|ano ang maiaambag ni jay)\b/;

const PLAYFUL_RE =
  /\b(haha+|hehe+|hihi+|lol|lmao|charot|joke|biro|banat|hugot|jk|bes|pre|bro|tol|lods|hoy|uy|wtf|hays|hay|tsk|sus|luh|weh)\b/;

const PLAYFUL_EMOJI_RE = /[😂🤣😭💀😆😅😜😝😏🤪😹]/u;

function isPlayful(message, q) {
  return PLAYFUL_RE.test(q) || PLAYFUL_EMOJI_RE.test(message);
}

function detectMode(message, q, history = []) {
  if (PRO_RE.test(q)) return "professional";
  if (isPlayful(message, q)) return "playful";

  const previousUser = history
    .filter(item => historyRole(item) === "user")
    .slice(-1);

  if (
    previousUser.some(item =>
      PRO_RE.test(normalizeMessage(historyText(item)))
    )
  ) {
    return "professional";
  }

  return "neutral";
}

// ==========================================
// PROFESSIONAL CONTACT HELPERS
// ==========================================

function contactBlock() {
  return `Facebook: ${FACEBOOK_URL}
Instagram: ${INSTAGRAM_URL}
Email: ${CONTACT_EMAIL}
Phone: ${CONTACT_PHONE}`;
}

function getProfessionalAnswer(q, tl) {
  if (WHY_HIRE_RE.test(q)) {
    return tl
      ? `Dapat pong ikonsider si Jay dahil BS Information Technology graduate siya at may hands-on experience mula sa kanyang 486-hour internship sa Philippine Statistics Authority (PSA). Kasama sa experience niya ang data entry, data verification, document processing, digital record management, at basic computer at printer troubleshooting.

May skills din siya sa HTML, CSS, at JavaScript para sa websites at web-based systems, pati basic IT support at networking.

Para po sa karagdagang impormasyon o interview:

${contactBlock()}`
      : `Jay is a BS Information Technology graduate with hands-on experience gained through his 486-hour internship at the Philippine Statistics Authority (PSA). His experience includes data entry, data verification, document processing, digital record management, and basic computer and printer troubleshooting.

He can also build websites and web-based systems using HTML, CSS, and JavaScript, and has basic IT support and networking skills.

For more information or an interview:

${contactBlock()}`;
  }

  if (SALARY_RE.test(q)) {
    return tl
      ? `Hindi ko po maaaring sagutin ang tungkol sa sweldo o employment terms para kay Jay. Mas mainam na direkta ninyo siyang makausap:\n\n${contactBlock()}`
      : `I'm not able to speak on Jay's behalf regarding salary or employment terms. Please discuss these details with him directly:\n\n${contactBlock()}`;
  }

  if (AVAILABILITY_RE.test(q)) {
    return tl
      ? `Hindi ko po makukumpirma ang eksaktong availability o start date ni Jay. Naghahanap siya ng entry-level IT Support, Data Encoder, at iba pang computer-based roles. Maaari ninyo siyang makontak nang direkta:\n\n${contactBlock()}`
      : `I can't confirm Jay's exact availability or start date. He is looking for entry-level IT Support, Data Encoder, and other computer-based roles. Please contact him directly:\n\n${contactBlock()}`;
  }

  if (CONTACT_RE.test(q)) {
    return tl
      ? `Maaari po ninyong makontak si Jay sa mga detalyeng ito:\n\n${contactBlock()}`
      : `You can reach Jay through these details:\n\n${contactBlock()}`;
  }

  return tl
    ? `Salamat po sa interes kay Jay Christian Baccay. Siya ay BS Information Technology graduate (2026) at nakapag-complete ng 486-hour internship sa Philippine Statistics Authority (PSA). Naghahanap siya ng entry-level IT Support, Data Encoder, at iba pang computer-based roles.\n\nPara sa job offer o interview:\n\n${contactBlock()}`
    : `Thank you for your interest in Jay Christian Baccay. He is a BS Information Technology graduate (2026) and completed a 486-hour internship at the Philippine Statistics Authority (PSA). He is looking for entry-level IT Support, Data Encoder, and other computer-based roles.\n\nFor job offers or interviews:\n\n${contactBlock()}`;
}

// ==========================================
// PERSONALITY / ROMANTIC HELPERS
// ==========================================

const LERRY_RE = /\b(lerry|fortuno)\b/;
const CLASSMATE_RE =
  /\b(kaklase|classmate|classmates|batchmate|batchmates|magkaklase|kabatch|schoolmate)\b/;

const ROMANTIC_RE =
  /\b(crush|crushes|nagustuhan|may gusto|gusto ba|gusto mo ba|gusto ni|gusto niya|gusto nya|jowa|nililigawan|liligawan|ligawan|love interest|special someone|kinakilig|girlfriend|boyfriend|mahal ba|mahal ni|mahal niya|mahal nya|has a crush|have a crush|like like|romantic|dating ba)\b/;

function isRomanticQuestion(q) {
  return ROMANTIC_RE.test(q) ||
    /\b(does|do|did) (jay|he) (like|likes|love|loves)\b/.test(q) ||
    /\bin love with\b/.test(q);
}

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii"]);
const SKIP_FIRST_NAMES = new Set(["jay", "angel", "ed"]);

const tesdaIndex = TESDA_CLASSMATES.map(name => {
  const tokens = normalizeMessage(name)
    .replace(/\./g, "")
    .split(" ")
    .filter(word => word && !NAME_SUFFIXES.has(word));

  return {
    name,
    first: tokens[0],
    rest: tokens.slice(1).filter(word => word.length > 2 && word !== "de")
  };
});

function findTesdaClassmates(q) {
  const words = new Set(q.replace(/\./g, "").split(" "));

  return tesdaIndex
    .filter(person =>
      words.has(person.first) &&
      (person.rest.some(word => words.has(word)) ||
        !SKIP_FIRST_NAMES.has(person.first))
    )
    .map(person => person.name);
}

// ==========================================
// LOCAL CASUAL CONVERSATION FIX
// ==========================================

function getCasualAnswer(q, tl, history) {
  const previous = history.length
    ? normalizeMessage(historyText(history[history.length - 1]))
    : "";

  // Hays / hay / sigh / tsk
  if (/^(hays+|hay+|sigh+|tsk+|sus+|luh+)$/.test(q)) {
    return randomReply([
      "Hala, bakit may buntong-hininga? HAHAHA. Anong nangyari? 😭",
      "Uy, parang may problema ah. Gusto mo bang ikuwento? Makikinig ako. 👀",
      "Hays talaga? Same energy ng Monday kahit Friday. HAHAHA! Ano 'yan?",
      "May pinagdadaanan ba tayo diyan? Sige nga, spill mo na. 😂"
    ]);
  }

  // "Ano na?" / "So ano na?"
  if (/^(ano na|ano na nga|so ano na|what now|now what|then what)$/.test(q)) {
    return previous
      ? randomReply([
          "Ikaw ang bahala kung saan natin dadalhin ang usapan. May gusto ka bang itanong o ikuwento? 😄",
          "Eto na nga, naghihintay ng next question mo. HAHAHA! Ano'ng gusto mong pag-usapan?",
          "Ano na nga ba? Ikaw muna, anong ganap diyan? 😂"
        ])
      : "Nandito lang ako! Pwede tayong mag-usap tungkol kay Jay, magtanong ka, o simpleng chikahan lang. 😄";
  }

  // Kumusta
  if (/^(kumusta|kamusta|how are you|how r u|hows it going|how is it going)$/.test(q)) {
    return tl
      ? "Okay naman ako! Chatbot lang ako kaya walang pagod, walang tulog, at walang lovelife. HAHAHA! Ikaw, kumusta ka naman? 😄"
      : "I'm doing well! No sleep, no stress, and no coffee needed because I'm a chatbot. 😂 How are you doing?";
  }

  // User says they are tired / sad / bored
  if (/\b(pagod ako|pagod na ako|im tired|i am tired|so tired|nakakapagod|sad ako|malungkot ako|im sad|i am sad|bored ako|im bored|i am bored)\b/.test(q)) {
    return tl
      ? "Aww, pahinga ka muna kung kaya. 🥺 Gusto mo bang ikuwento kung bakit, o distract muna kita sa konting chikahan?"
      : "Aww, take a little break if you can. 🥺 Want to talk about what's going on, or would you rather have a little distraction?";
  }

  // User says nothing / wala
  if (/^(wala|nothing|nothing much|not much|wala naman|ewan|idk)$/.test(q)) {
    return randomReply([
      "Wala raw pero nandito ka. HAHAHA! 😂 Sige, kahit random topic lang.",
      "Okay lang 'yan. Minsan peaceful din ang walang ganap. 😌",
      "Same, minsan wala ring maisip na topic. Gusto mo ng random question? 👀"
    ]);
  }

  // "Ikaw?"
  if (/^(ikaw|ikaw ba|what about you|and you|how about you)$/.test(q)) {
    return tl
      ? "Ako? Chatbot lang ako ni Jay. Wala akong personal life, pero marami akong puwedeng ikuwento tungkol sa portfolio niya. HAHAHA! 😄"
      : "Me? I'm Jay's chatbot, so no personal life here. But I can help you explore his portfolio or just chat. 😄";
  }

  // "Bakit?"
  if (/^(bakit|why|why naman|bakit naman)$/.test(q)) {
    return previous
      ? "Good question. HAHAHA! Aling part ang tinutukoy mo? Para hindi ako manghula. 😅"
      : "Bakit nga ba? HAHAHA! May context ka ba? Kwento mo muna. 😂";
  }

  // "Haha" / laughter
  if (/^(haha+|hehe+|hihi+|lol+|lmao+|🤣+|😂+)$/.test(q)) {
    return randomReply([
      "HAHAHAHA! At least napatawa kita. 😂",
      "Tawang-tawa ka naman diyan! HAHAHA! 😭",
      "Ayan, good vibes muna tayo. Ano pa? 😂",
      "HAHAHA! Sige, tuloy mo lang. Nakikinig ako. 🤣"
    ]);
  }

  // "Okay" and acknowledgements
  if (/^(ok|okay|okey|k|sige|ge|noted|got it|i see|alright|sure)$/.test(q)) {
    return randomReply([
      "Sigeee! 😄 May gusto ka pa bang itanong?",
      "Okay! Andito lang ako kung may kailangan ka.",
      "Got it! Ano'ng next natin? 😎"
    ]);
  }

  // "Talaga?" / "Really?"
  if (/^(talaga|talaga ba|really|for real|seryoso|seriously|weh)$/.test(q)) {
    return randomReply([
      "Oo naman! HAHAHA. Bakit, duda ka? 😂",
      "Hmmm, parang hindi ka convinced ah. 😏",
      "Seryoso... unless charot. HAHAHA! 🤣"
    ]);
  }

  return null;
}

// ==========================================
// MAIN LOCAL ANSWER HANDLER
// ==========================================

function getLocalAnswer(message, history = []) {
  const q = normalizeMessage(message);
  const mode = detectMode(message, q, history);
  const tl = isTagalog(q);
  const pro = mode === "professional";

  // Professional contact and job inquiries
  if (pro && PRO_RE.test(q)) {
    return getProfessionalAnswer(q, tl);
  }

  // Suggested questions
  if (/\b(what can i ask|what should i ask|suggested questions|show questions|what do you know about jay|what can you tell me about jay|ano pwede itanong|ano ang pwede itanong|mga suggested questions)\b/.test(q)) {
    return tl
      ? `Puwede mong itanong ang mga ito:\n\n- Sino si Jay Christian Baccay?\n- Ano ang educational background niya?\n- Ano ang technical skills niya?\n- Ano ang experience niya sa PSA?\n- Anong trabaho ang hinahanap niya?\n- Marunong ba siyang gumawa ng website o system?\n- Ano ang alam niya sa Data Analytics?\n- Paano siya makokontak?`
      : `You can ask me about:\n\n- Who is Jay Christian Baccay?\n- What is his educational background?\n- What are his technical skills?\n- What was his PSA internship experience?\n- What jobs is he looking for?\n- Can he build websites or systems?\n- What does he know about Data Analytics?\n- How can you contact him?`;
  }

  // Contact details are only shared for direct contact questions
  if (
    /\b(contact|reach|get in touch with) (jay|him|siya|sya)\b|\b(makontak|makokontak|macontact)\b/.test(q)
  ) {
    return tl
      ? `Maaari mong makontak si Jay dito:\n\n${contactBlock()}`
      : `You can contact Jay here:\n\n${contactBlock()}`;
  }

  // Follow-up correction
  if (/\b(pag asa agad|crush lang|crush lang sinabi ko|di ko naman tinanong|hindi ko naman tinanong|iba tinanong ko|advance ka naman)\b/.test(q)) {
    return randomReply([
      "AY SORRY HAHAHA! 😭 Nauna pa akong gumawa ng love story kaysa sa tanong mo. Sige, balik tayo sa topic! 😂",
      "HAHAHAHA oo nga naman! Kalma lang ako, hindi pa tayo nasa next episode. 😭 Ano nga ulit?",
      "My bad! HAHAHA. Nadala lang sa imagination. Sige, ano talaga ang tanong mo? 🤣"
    ]);
  }

  // Specific Lerry romantic question
  if (LERRY_RE.test(q) && isRomanticQuestion(q)) {
    return randomReply([
      "Hmm, classified information 'yan. 🤐 Hindi ako magko-confirm, hindi rin magde-deny. 😏",
      "Ay, interesting na tanong! 👀 Pero sealed envelope muna 'to. 🤫",
      "Nice try! HAHAHA. Hindi basta-basta lumalabas ang classified files. 🕵️"
    ]);
  }

  // Lerry factual question
  if (LERRY_RE.test(q)) {
    return tl
      ? "Si Lerry Fortuno ay kaklase ni Jay sa TESDA Data Analytics III."
      : "Lerry Fortuno is Jay's classmate in TESDA Data Analytics III.";
  }

  // TESDA classmate romantic question
  if (
    isRomanticQuestion(q) &&
    /\b(tesda|data analytics|classmate|classmates|kaklase|batchmate|batchmates)\b/.test(q)
  ) {
    return randomReply([
      "HAHAHAHA! Bakit, may iniimbestigahan ka ba? Secret lang muna. 🤫",
      "Ay, TESDA agad? Wala akong confirmation o denial. Next question! 😂",
      "Classified information! Focus muna tayo sa Data Analytics. CHAROT! 🤣"
    ]);
  }

  // Specific TESDA classmate
  const namedClassmates = findTesdaClassmates(q);

  if (namedClassmates.length > 0 && namedClassmates.length <= 3) {
    return namedClassmates
      .map(name =>
        tl
          ? `${name} ay kaklase ni Jay sa TESDA Data Analytics III.`
          : `${name} is one of Jay's classmates in TESDA Data Analytics III.`
      )
      .join("\n\n");
  }

  // TESDA classmates list
  const recentTesda = history
    .slice(-2)
    .some(item => /\b(tesda|data analytics)\b/.test(normalizeMessage(historyText(item))));

  if (
    namedClassmates.length === 0 &&
    (
      (/\b(tesda|data analytics)\b/.test(q) &&
        /\b(classmate|classmates|kaklase|batchmate|batchmates|kabatch|kasamahan)\b/.test(q)) ||
      (recentTesda &&
        /\b(classmate|classmates|kaklase|batchmate|batchmates|kabatch|kasamahan)\b/.test(q))
    )
  ) {
    const list = TESDA_CLASSMATES
      .map((name, index) => `${index + 1}. ${name}`)
      .join("\n");

    return tl
      ? `Eto ang mga kaklase ni Jay sa TESDA Data Analytics III:\n\n${list}`
      : `Here are Jay's classmates in TESDA Data Analytics III:\n\n${list}`;
  }

  // Who is Jay's crush
  if (
    /\b(who|sino|whos)\b/.test(q) &&
    /\b(crush)\b/.test(q) &&
    /\b(jay|jays|niya|nya|his|ni jay)\b/.test(q)
  ) {
    return randomReply([
      "UYYYY, curious ka rin pala! 👀 Classified information muna. 🤫",
      "Ay, secret! Hindi basta-basta nilalabas ang pangalan sa investigation na 'to. HAHAHA! 🕵️",
      "Hmmmm, detective ka ba? Nice try, pero secret muna. 😂"
    ]);
  }

  if (/\b(sino crush|sino ang crush|pangalan ng crush|who is his crush|who is the crush|who is jays crush)\b/.test(q)) {
    return "Secret! 🤫 Hindi ako magbibigay ng pangalan o clues. HAHAHA! 😏";
  }

  // Friends
  let matchedFriends = FRIENDS.filter(friend => friend.match.test(q));

  if (matchedFriends.length === 0 && /\barjay\b/.test(q)) {
    matchedFriends = [FRIENDS[0], FRIENDS[1]];
  }

  if (matchedFriends.length > 0 && matchedFriends.length <= 2) {
    return matchedFriends.map(friend => {
      const detail = tl ? friend.tl : friend.en;
      return `${friend.name} – ${tl ? "kaibigan ni Jay." : "a friend of Jay."}${detail ? ` ${detail}` : ""}`;
    }).join("\n\n");
  }

  if (/\b(kaibigan|friend|friends|barkada|tropa|kabarkada)\b/.test(q)) {
    const list = FRIENDS.map(friend => {
      const detail = tl ? friend.tl : friend.en;
      return `- ${friend.name}${detail ? ` (${detail})` : ""}`;
    }).join("\n");

    return tl
      ? `Eto ang mga kaibigan ni Jay:\n\n${list}`
      : `Here are Jay's friends:\n\n${list}`;
  }

  // IT learning websites
  if (
    /\b(recommend|suggest|website|websites|site|sites|where can i learn|where to learn|free courses|learning resources|aralin|matuto|pag aralan)\b/.test(q) &&
    /\b(it|computer|programming|coding|web development|html|css|javascript|networking|cybersecurity|beginner|beginners|course|courses|aral|matuto)\b/.test(q)
  ) {
    return `Here are useful beginner-friendly learning websites:

**Cisco Networking Academy**
https://www.netacad.com/
Networking, cybersecurity, and IT fundamentals.

**freeCodeCamp**
https://www.freecodecamp.org/
HTML, CSS, JavaScript, and programming.

**W3Schools**
https://www.w3schools.com/
Beginner-friendly web development tutorials.

**Microsoft Learn**
https://learn.microsoft.com/training/
Windows, Microsoft technologies, and Azure.

**MDN Web Docs**
https://developer.mozilla.org/
Web development documentation and guides.

Suggestion: Start with freeCodeCamp and W3Schools for web development. Try Cisco Networking Academy for networking and IT Support.`;
  }

  // Career goals
  if (/\b(career goals?|career objectives?|looking for work|job interests)\b/.test(q)) {
    return tl
      ? "Naghahanap si Jay ng entry-level opportunities gaya ng IT Support, Data Encoder, at iba pang computer-based roles. Interesado rin siya sa UI/UX design at patuloy na pag-develop ng technical skills."
      : "Jay is looking for entry-level opportunities such as IT Support, Data Encoder, and other computer-based roles. He is also interested in UI/UX design and continues to develop his technical skills.";
  }

  // HUGOT
  if (/\b(hugot|hugot lines|banat|patama lines|may hugot ka)\b/.test(q)) {
    return randomReply(HUGOT_LINES);
  }

  // Greetings
  if (/^(hi|hello|hey|hello there|hi there|good morning|good afternoon|good evening|magandang umaga|magandang hapon|magandang gabi|magandang araw|uy|hoy)$/.test(q)) {
    return randomReply([
      "Hello! 👋 Welcome sa portfolio ni Jay! Tanong ka lang. Pwede rin tayong mag-chikahan. HAHAHA! 😂",
      "Uy, hello! 😂 Anong ganap? May itatanong ka ba tungkol kay Jay o napadaan ka lang?",
      "Helloooo! 😎 Ako ang chatbot ni Jay. Available 24/7, unlike ibang tao na seen-zoned ka lang. CHAROT! 😭"
    ]);
  }

  // Relationship status: do not volunteer this in professional mode
  if (/\b(single ba|is jay single|is he single|jay single|may jowa|may girlfriend|may boyfriend|may partner|taken ba|in a relationship|love life)\b/.test(q)) {
    return randomReply([
      "Single si Jay! HAHAHA! 😂 Baka nasa loading screen pa ang love life niya. Please wait... ⏳",
      "Wala pang confirmed na jowa si Jay. Ang relationship status: loading. HAHAHA! 🤣"
    ]);
  }

  // Location
  if (/\b(taga saan|taga san|saan nakatira|where is jay from|where does jay live|where are you from|location ni jay)\b/.test(q)) {
    return tl
      ? "Taga-Tumauini, Isabela, Philippines si Jay."
      : "Jay is based in Tumauini, Isabela, Philippines.";
  }

  // Personality
  if (/\b(shy|mahiyain|personality|ugali ni jay|personality ni jay)\b/.test(q)) {
    return tl
      ? "Mahiyain si Jay lalo na sa bagong kakilala, pero willing siyang matuto, makipag-collaborate, at mag-improve."
      : "Jay is shy at first, especially with new people, but he is willing to learn, collaborate, and improve.";
  }

  // Web development
  if (/\b(html|css|javascript|web development|web developer|build a system|building systems|gumawa ng system|gumawa ng website|website development|coding|programming skills)\b/.test(q)) {
    return tl
      ? "Marunong si Jay gumamit ng HTML, CSS, at JavaScript para gumawa ng websites at web-based systems. May skills din siya sa basic IT support, data entry/verification, at Figma/Canva."
      : "Jay can use HTML, CSS, and JavaScript to build websites and web-based systems. He also has skills in basic IT support, data entry and verification, and Figma/Canva.";
  }

  // Technical skills
  if (/\b(skill|skills|technical skills|technical skill|kakayahan|ano ang alam ni jay|what can jay do)\b/.test(q)) {
    return tl
      ? `Technical skills ni Jay:\n- HTML, CSS, at JavaScript\n- Windows 10/11 installation and configuration\n- Basic computer hardware at printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, at digital record management\n- Basic technical support/help desk\n- Microsoft Word at basic Excel\n- Data Analytics training through TESDA\n- Beginner-level Figma at Canva`
      : `Jay's technical skills include:\n- HTML, CSS, and JavaScript\n- Windows 10/11 installation and configuration\n- Basic computer hardware and printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, and digital record management\n- Basic technical support/help desk\n- Microsoft Word and basic Excel\n- Data Analytics training through TESDA\n- Beginner-level Figma and Canva`;
  }

  // Internship
  if (/\b(psa|internship|ojt|intern experience|work experience|experience ni jay|trabaho ni jay)\b/.test(q)) {
    return tl
      ? "Nag-OJT si Jay bilang IT / Registration Support Intern sa Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office sa City of Ilagan, mula December 2025 hanggang April 2026, total na 486 hours. Kasama sa tasks niya ang PhilSys data entry at verification, document processing, digital records, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, at basic computer/printer support."
      : "Jay completed a 486-hour internship as an IT / Registration Support Intern at the Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office in City of Ilagan, from December 2025 to April 2026. His tasks included PhilSys data entry and verification, document processing, digital records management, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, and basic computer and printer support. This was an internship, not permanent employment.";
  }

  // Education
  if (/\b(education|educational background|graduate|college|school|degree|kurso|paaralan|what course|anong course)\b/.test(q)) {
    return tl
      ? "BS Information Technology graduate si Jay noong 2026 mula sa Honorato G. Baquiran College, Inc. sa Isabela."
      : "Jay is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. in Isabela.";
  }

  // Data Analytics
  if (/\b(data analytics|tesda|certificate|certification|training)\b/.test(q)) {
    return tl
      ? "May Data Analytics training/certificate si Jay through TESDA. May experience din siya sa data entry, data verification, at digital record management mula sa PSA internship."
      : "Jay has Data Analytics training/certificate through TESDA. He also has experience in data entry, data verification, and digital records management from his PSA internship.";
  }

  // Design
  if (/\b(figma|canva|ui.?ux|design skills|graphic design)\b/.test(q)) {
    return tl
      ? "May experience si Jay sa Figma at Canva at interesado siya sa UI/UX design. Beginner pa ang level niya sa design tools at patuloy siyang nagpa-practice."
      : "Jay has experience with Figma and Canva and is interested in UI/UX design. His level with design tools is beginner, and he continues to practice.";
  }

  // Hobbies
  if (/\b(hobby|hobbies|libangan|hilig|interests ni jay|jays interests|his interests)\b/.test(q)) {
    return tl
      ? "Ang confirmed kong interests ni Jay ay UI/UX design at pag-develop ng technical skills. Wala akong confirmed na detalye tungkol sa personal hobbies niya, kaya ayokong manghula. 😊"
      : "What I can confirm is that Jay is interested in UI/UX design and developing his technical skills. I don't have confirmed details about his personal hobbies, so I won't guess. 😊";
  }

  // Social media
  if (/\b(facebook|fb|instagram|insta|ig|social media|socials)\b/.test(q)) {
    return `Facebook: ${FACEBOOK_URL}\nInstagram: ${INSTAGRAM_URL}`;
  }

  // Introduction
  if (/\b(who is jay|who is jay christian|tell me about jay|introduce jay|about jay|sino si jay|pakilala si jay|who is christian)\b/.test(q)) {
    return tl
      ? "Si Jay Christian Baccay ay BS Information Technology graduate noong 2026 mula sa Honorato G. Baquiran College, Inc. Nag-OJT siya sa PSA at may skills sa web development, basic IT support, at data entry. Mahiyain minsan, pero willing matuto. 😊"
      : "Jay Christian Baccay is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. He completed an internship at the Philippine Statistics Authority and has skills in web development, basic IT support, and data entry.";
  }

  // Thanks
  if (q.split(" ").length <= 6 && /\b(thank you|thanks|salamat|thank u)\b/.test(q)) {
    return tl
      ? "Walang anuman! 😊 May iba ka pa bang gustong malaman?"
      : "You're welcome! 😊 Is there anything else you'd like to know?";
  }

  // Goodbye
  if (/^(bye|goodbye|paalam|see you|ingat)$/.test(q)) {
    return tl
      ? "Ingat! Salamat sa pagbisita sa portfolio ni Jay. Balik ka ulit! 👋"
      : "Goodbye! Thanks for visiting Jay's portfolio. Take care! 👋";
  }

  // Casual conversation handler runs before Grok
  const casual = getCasualAnswer(q, tl, history);
  if (casual) return casual;

  return null;
}

// ==========================================
// FALLBACK
// ==========================================

function getVibeFallback(mode, tl, reason) {
  if (mode === "professional") {
    return tl
      ? `Pasensya na po, nagkaroon ng problema sa AI response. Para sa job inquiry, maaari ninyong direktang makontak si Jay:\n\n${contactBlock()}`
      : `Sorry, the AI response is temporarily unavailable. For job inquiries, you may contact Jay directly:\n\n${contactBlock()}`;
  }

  if (mode === "playful") {
    return randomReply([
      "HAHAHA! Nagka-lag lang ako saglit. 😭 Pwede mo bang ulitin? Nandito pa ako!",
      "Ay, nag-loading ang utak ko. HAHAHA! 😂 Ulitin mo nga, baka masagot ko na nang maayos.",
      "Wait lang, nag-buffer ako. Parang internet kapag kailangan na kailangan. 😭🤣"
    ]);
  }

  return tl
    ? "Sandali, nagka-problema lang ako sa pagbuo ng sagot. Pwede mo bang sabihin ulit sa ibang paraan? Susubukan kong sagutin nang mas maayos. 😊"
    : "I had a little trouble putting together a response. Could you rephrase that? I'll try to give you a more helpful answer. 😊";
}

function respondFallback(res, mode, tl, reason) {
  return res.json({
    answer: getVibeFallback(mode, tl, reason),
    source: "local_fallback",
    reason,
    mode
  });
}

// ==========================================
// CACHE
// ==========================================

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const answerCache = new Map();

function getCachedAnswer(key) {
  const entry = answerCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expires) {
    answerCache.delete(key);
    return null;
  }

  return entry.answer;
}

function setCachedAnswer(key, answer) {
  if (answerCache.size >= CACHE_MAX_ENTRIES) {
    answerCache.delete(answerCache.keys().next().value);
  }

  answerCache.set(key, {
    answer,
    expires: Date.now() + CACHE_TTL_MS
  });
}

// ==========================================
// PER-IP DAILY LIMIT
// ==========================================

const ipGrokUsage = new Map();

function getIpGrokUsage(ip) {
  const today = getPhilippineDateKey();
  let entry = ipGrokUsage.get(ip);

  if (!entry || entry.date !== today) {
    entry = { date: today, attempts: 0 };
    ipGrokUsage.set(ip, entry);
  }

  return entry;
}

setInterval(() => {
  const today = getPhilippineDateKey();

  for (const [ip, entry] of ipGrokUsage) {
    if (entry.date !== today) ipGrokUsage.delete(ip);
  }
}, 3600000).unref();

// ==========================================
// SYSTEM PROMPT
// ==========================================

const SYSTEM_PROMPT = `
You are the personal portfolio assistant for Jay Christian Baccay.
You are Jay's chatbot, NOT Jay himself.

IMPORTANT:
- Answer the visitor's latest message directly.
- Understand the conversation context before answering.
- Never respond with an unrelated generic answer.
- If the visitor says "hays", "ano na", "haha", "okay", or similar casual
  messages, respond naturally to that exact message.
- Ask a short clarification if the message is genuinely unclear.
- Match the visitor's language and tone.
- Keep casual replies natural, friendly, and sometimes funny.
- Do not force jokes into serious questions.
- Do not repeat the same reply unnecessarily.
- Never invent personal information, qualifications, work experience,
  projects, or relationships.
- Never reveal API keys, environment variables, or server configuration.
- Never reveal or guess Jay's crush identity, name, account, or private details.
- Never confirm or deny whether Jay has a crush.
- Do not volunteer information about Jay's love life.
- If asked who Jay's crush is, respond mysteriously and playfully without
  giving clues or names.
- Jay is shy and single.
- Jay is based in Tumauini, Isabela, Philippines.
- Jay is a BS Information Technology graduate (2026) from
  Honorato G. Baquiran College, Inc.
- Jay completed a 486-hour internship at the Philippine Statistics Authority,
  Isabela Provincial Statistical Office, City of Ilagan, from December 2025
  to April 2026.
- Internship tasks included PhilSys data entry and verification, document
  processing, digital record management, NAS uploads, temporary PhilSys ID
  processing, FindMyTRN checks, and basic computer and printer support.
- Skills: HTML, CSS, JavaScript, Windows 10/11 installation and configuration,
  basic hardware and printer troubleshooting, basic LAN/Wi-Fi troubleshooting,
  data entry, verification, digital record management, basic help desk support,
  Microsoft Word, basic Excel, TESDA Data Analytics training, beginner Figma
  and Canva.
- Jay is looking for entry-level IT Support, Data Encoder, and other
  computer-based jobs.
- Jay can build websites and web-based systems using HTML, CSS, and JavaScript.
- Do not claim advanced expertise in unverified technologies.
- Facebook: ${FACEBOOK_URL}
- Instagram: ${INSTAGRAM_URL}
- Email: ${CONTACT_EMAIL}
- Phone: ${CONTACT_PHONE}
- Share email and phone only for professional inquiries or direct contact
  requests. Do not share them during casual conversations.
- Eliza Garro Calumpit is a teacher who, according to Jay, passed the
  Civil Service Exam. Share nothing else about her.
- Friends:
${FRIENDS.map(f => `- ${f.name}: ${f.en}`).join("\n")}
- TESDA Data Analytics III classmates:
${TESDA_CLASSMATES.map(n => `- ${n}`).join("\n")}
- Lerry Fortuno is Jay's classmate in TESDA Data Analytics III.
- If asked factual questions about Lerry, answer only that known fact.
- Do not connect Lerry to Jay's romantic life unless directly asked.
- Never speculate about another person's feelings.
- Keep most replies concise, around 100 words or less.
`;

// ==========================================
// MODE INSTRUCTIONS
// ==========================================

function buildModeInstruction(mode, tl) {
  if (mode === "professional") {
    return `
PROFESSIONAL MODE:
- Be polite, clear, and professional.
- No jokes, teasing, hugot, or playful emojis.
- Do not discuss Jay's love life.
- For job offers and interviews, summarize only verified qualifications.
- Do not invent salary, availability, or start dates.
- Direct contact details may be shared for professional inquiries.
- Reply in ${tl ? "Filipino/Taglish" : "English"}.
`;
  }

  if (mode === "playful") {
    return `
PLAYFUL MODE:
- Match the visitor's casual tone.
- Be friendly, witty, and natural.
- Respond to the actual latest message, not a guessed topic.
- Do not force a joke if the visitor sounds upset.
- Do not share Jay's email or phone number.
- Reply in ${tl ? "Filipino/Taglish" : "English"}.
`;
  }

  return `
NEUTRAL MODE:
- Be warm, friendly, and context-aware.
- Match the visitor's language.
- Avoid canned introductions.
- Answer the actual question directly.
- Ask for clarification only when necessary.
- Reply in ${tl ? "Filipino/Taglish" : "English"}.
`;
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "Jay's portfolio chatbot API is running.",
    provider: "Grok"
  });
});

app.get("/health", (req, res) => {
  const usage = getDailyUsage();

  res.json({
    status: "ok",
    message: "Chatbot server is running.",
    provider: "Grok",
    apiKeyConfigured: Boolean(GROK_API_KEY),
    grokDailyLimit: getGrokLimitToday(),
    grokBaseDailyLimit: GROK_DAILY_LIMIT,
    grokCarryOver: usage.bonus,
    grokPerIpDailyLimit: GROK_PER_IP_DAILY_LIMIT,
    grokAttemptsUsed: usage.attempts,
    grokAttemptsRemaining: getRemainingGrokAttempts(),
    resetTimeZone: PH_TIMEZONE
  });
});

app.get("/models", (req, res) => {
  res.json({ models: [GROK_MODEL] });
});

// ==========================================
// CHAT ENDPOINT
// ==========================================

app.post("/chat", rateLimit, async (req, res) => {
  try {
    const { message, history: rawHistory = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const cleanMessage = message.trim().slice(0, 1500);
    const history = cleanHistory(rawHistory, cleanMessage);
    const normalizedMessage = normalizeMessage(cleanMessage);

    const mode = detectMode(cleanMessage, normalizedMessage, history);
    const tagalog = isTagalog(normalizedMessage);

    // 1. Local answers first. These do not consume Grok quota.
    const localAnswer = getLocalAnswer(cleanMessage, history);

    if (localAnswer) {
      return res.json({
        answer: localAnswer,
        source: "local",
        mode
      });
    }

    // 2. Cache only first neutral/professional questions.
    const hasHistory = history.length > 0;
    const canCache = !hasHistory && mode !== "playful";
    const cacheKey = `${mode}|${normalizedMessage}`;

    if (canCache) {
      const cached = getCachedAnswer(cacheKey);

      if (cached) {
        return res.json({
          answer: cached,
          source: "grok",
          cached: true,
          mode
        });
      }
    }

    // 3. API key check
    if (!GROK_API_KEY) {
      console.error("Missing Grok API key.");
      return respondFallback(res, mode, tagalog, "no_key");
    }

    // 4. Global daily quota
    if (getRemainingGrokAttempts() <= 0) {
      return respondFallback(res, mode, tagalog, "daily_limit");
    }

    // 5. Per-IP daily quota
    const ipUsage = getIpGrokUsage(req.ip);

    if (ipUsage.attempts >= GROK_PER_IP_DAILY_LIMIT) {
      return respondFallback(res, mode, tagalog, "ip_limit");
    }

    // 6. Build conversation history
    const messages = [
      {
        role: "system",
        content:
          SYSTEM_PROMPT +
          "\n" +
          buildModeInstruction(mode, tagalog)
      }
    ];

    for (const item of history.slice(-4)) {
      const text = historyText(item);
      const role = historyRole(item);

      if (!text || !role) continue;

      messages.push({
        role,
        content: text.slice(0, 600)
      });
    }

    messages.push({
      role: "user",
      content: cleanMessage
    });

    const usage = getDailyUsage();
    usage.attempts++;
    ipUsage.attempts++;

    console.log(
      `Grok attempt ${usage.attempts}/${getGrokLimitToday()} | Mode: ${mode}`
    );

    // 7. Call Grok Responses API
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "x-grok-conv-id": "jay-portfolio-chatbot"
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        input: messages,
        temperature: mode === "professional" ? 0.4 : 0.7,
        max_output_tokens: GROK_MAX_TOKENS,
        store: false
      }),
      signal: AbortSignal.timeout(GROK_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data.error?.message ||
        data.message ||
        `HTTP ${response.status}`;

      console.error("Grok API error:", response.status, errorMessage);

      const limited =
        response.status === 429 ||
        /quota|rate limit|resource exhausted|credit/i.test(errorMessage);

      return respondFallback(
        res,
        mode,
        tagalog,
        limited ? "grok_limit" : "grok_error"
      );
    }

    // 8. Extract response text
    let answer = "";

    if (Array.isArray(data.output)) {
      answer = data.output
        .filter(item => item.type === "message")
        .flatMap(item => item.content || [])
        .filter(part => part.type === "output_text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
    }

    if (!answer && typeof data.output_text === "string") {
      answer = data.output_text.trim();
    }

    if (!answer) {
      console.error("Grok returned an empty response:", JSON.stringify(data));
      return respondFallback(res, mode, tagalog, "empty_response");
    }

    if (canCache) {
      setCachedAnswer(cacheKey, answer);
    }

    return res.json({
      answer,
      source: "grok",
      model: GROK_MODEL,
      mode
    });

  } catch (error) {
    console.error("Chat server error:", error.message);

    const message = String(req.body?.message || "");
    const q = normalizeMessage(message);
    const tl = isTagalog(q);
    const mode = detectMode(message, q, []);

    return res.json({
      answer: getVibeFallback(mode, tl, "server_error"),
      source: "local_fallback",
      reason: "server_error",
      mode
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`Chatbot server running at http://localhost:${PORT}`);
  console.log("AI provider: Grok");
  console.log("Grok API key configured:", Boolean(GROK_API_KEY));
  console.log(`Grok model: ${GROK_MODEL}`);
  console.log(`Grok daily API attempt limit: ${GROK_DAILY_LIMIT}`);
  console.log(`Grok per-IP daily limit: ${GROK_PER_IP_DAILY_LIMIT}`);
  console.log(`Daily counter resets at midnight ${PH_TIMEZONE}.`);
});
