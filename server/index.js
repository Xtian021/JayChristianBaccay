require("dotenv").config({
  path: require("path").join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

// ==========================================
// CORS AND MIDDLEWARE
// ==========================================

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://xtian021.github.io",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "1mb" }));

// ==========================================
// RATE LIMIT
// ==========================================

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const entry = hits.get(req.ip);

  if (!entry || now > entry.reset) {
    hits.set(req.ip, {
      count: 1,
      reset: now + RATE_WINDOW_MS
    });
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
// GROK DAILY LIMIT (WITH CARRY-OVER)
// ==========================================

const GROK_DAILY_LIMIT = Number(process.env.GROK_DAILY_LIMIT) || 500;
const GROK_MAX_CARRYOVER = Number(process.env.GROK_MAX_CARRYOVER) || 500;
const PHILIPPINE_TIME_ZONE = "Asia/Manila";

function getPhilippineDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
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

    console.log(
      `Grok daily usage counter reset: ${today} (carry-over: ${grokDailyUsage.bonus})`
    );
  }

  return grokDailyUsage;
}

function getGrokLimitToday() {
  return GROK_DAILY_LIMIT + getDailyUsage().bonus;
}

function getRemainingGrokAttempts() {
  return Math.max(0, getGrokLimitToday() - getDailyUsage().attempts);
}

setInterval(() => {
  getDailyUsage();
}, 60 * 1000).unref();

// ==========================================
// PROFILE AND LOCAL REPLIES
// ==========================================

const FACEBOOK_URL = "https://www.facebook.com/chris.tian.727095/";
const INSTAGRAM_URL = "https://www.instagram.com/christian21217/";
const CONTACT_EMAIL = "baccaytom88@gmail.com";
const CONTACT_PHONE = "09976432312";

function randomReply(replies) {
  return replies[Math.floor(Math.random() * replies.length)];
}

const HUGOT_LINES = [
  "Minsan, hindi ka naman niya ayaw… baka hindi ka lang talaga niya gusto. AY! Next question, masakit! 😭💔",
  "Ang love parang Wi-Fi. Minsan full bars ka, pero wala ka pa ring connection. 📶😭",
  "Hindi lahat ng nagpaparamdam, may balak. Yung iba, nanggugulo lang ng tahimik mong buhay. HAHAHA! 💀",
  "Ang hirap mag-assume. Ikaw na nga gumawa ng story, ikaw pa ang nasaktan sa ending. 😭📖",
  "Minsan kailangan mo ring bumitaw… lalo na kung hindi naman talaga sa'yo yung charger. CHAROT! 🔌🤣",
  "Mas okay nang single kaysa taken for granted. Pero minsan nakakainggit din yung may ka-good morning. HAHAHA! 😭",
  "Baka hindi ka niya mixed signals. Baka ikaw lang talaga ang gumagawa ng interpretation. AY! 😭🤣",
  "Ang feelings parang assignment—kapag ikaw lang ang gumagawa, group work pa rin ba? 💀",
  "Hindi lahat ng butterflies ay love. Baka gutom ka lang. Kain ka muna! 🦋🍔",
  "Minsan, closure lang ang kailangan. Pero kung walang reply, baka kailangan mo na lang ng tulog. 😭💤",
  "May mga taong dumarating para turuan kang magmahal. Yung iba naman, para turuan kang mag-block. CHAROT! 🤣",
  "Huwag kang maghabol. Hindi ka naman nawawalang parcel. 📦😭"
];

// ==========================================
// JAY'S FRIENDS
// ==========================================

const FRIENDS = [
  {
    name: "Arjay Cabia Cabinbin",
    match: /\b(cabinbin|cabia)\b/,
    tl: "Criminology ang kurso niya at registered na.",
    en: "He studied Criminology and is registered.",
    partner: ""
  },
  {
    name: "Ar-jay Catolico Bucad",
    match: /\b(bucad|catolico|ar-jay|ar jay)\b/,
    tl: "Agriculture ang kurso niya at registered na.",
    en: "He studied Agriculture and is registered.",
    partner: ""
  },
  {
    name: "Kyle Jezxel Brytch",
    match: /\b(brytch|kyle)\b/,
    tl: "Criminology ang kurso niya.",
    en: "He studied Criminology.",
    partner: ""
  },
  {
    name: "Prince Jomari Gallasinao",
    match: /\b(gallasinao|jomari|prince)\b/,
    tl: "Graduate siya ng BS Criminology.",
    en: "He is a BS Criminology graduate.",
    partner: ""
  },
  {
    name: "Jerome Angel Dioniso",
    match: /\b(dioniso|jerome)\b/,
    tl: "",
    en: "",
    partner: ""
  },
  {
    name: "Orlando Banguel",
    match: /\b(banguel|orlando)\b/,
    tl: "",
    en: "",
    partner: ""
  },
  {
    name: "Jonathan Mina",
    match: /\b(mina|jonathan)\b/,
    tl: "Agriculture ang kurso niya.",
    en: "He studied Agriculture.",
    partner: ""
  },
  {
    name: "Jeffryl Quitolbo",
    match: /\b(quitolbo|jeffryl)\b/,
    tl: "",
    en: "",
    partner: ""
  }
];

function friendInfo(friend, tl) {
  let text = tl
    ? `${friend.name} – kaibigan ni Jay.`
    : `${friend.name} is a friend of Jay.`;

  const detail = tl ? friend.tl : friend.en;
  if (detail) text += ` ${detail}`;

  if (friend.partner) {
    text += tl ? ` Jowa: ${friend.partner}.` : ` Partner: ${friend.partner}.`;
  }

  return text;
}

function friendListLine(friend, tl) {
  const detail = tl ? friend.tl : friend.en;
  let line = `- ${friend.name}`;

  if (detail) line += ` (${detail.replace(/\.$/, "")})`;

  if (friend.partner) {
    line += tl ? ` – jowa: ${friend.partner}` : ` – partner: ${friend.partner}`;
  }

  return line;
}

function friendsForPrompt() {
  return FRIENDS.map(friend => {
    let line = `  - ${friend.name}`;
    if (friend.en) line += `: ${friend.en}`;
    if (friend.partner) line += ` Partner: ${friend.partner}.`;
    return line;
  }).join("\n");
}

// ==========================================
// TESDA CLASSMATES (Data Analytics III)
// ==========================================

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

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii"]);
const SKIP_FIRST_NAME_ONLY = new Set(["jay", "angel", "ed"]);

function normalizeMessage(message) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
    .filter(
      person =>
        words.has(person.first) &&
        (person.rest.some(word => words.has(word)) ||
          !SKIP_FIRST_NAME_ONLY.has(person.first))
    )
    .map(person => person.name);
}

function tesdaForPrompt() {
  return TESDA_CLASSMATES.map(name => `  - ${name}`).join("\n");
}

// ==========================================
// SYSTEM PROMPT
// ==========================================

const SYSTEM_PROMPT = `
You are the personal portfolio assistant for Jay Christian Baccay.
You are Jay's chatbot, NOT Jay himself.

IDENTITY AND PRIVACY:
- Answer questions about Jay using only the verified profile below.
- Never invent qualifications, employment, project features, or personal facts.
- Never reveal API keys, environment variables, or server configuration.
- Jay's crush's name, identity, accounts, and private information must remain secret.
- Do not pretend to know the crush's real feelings or whether Jay has a chance.

PERSONALITY:
- Sound like a friendly, funny Filipino friend.
- Match the visitor's language and tone. Taglish is welcome.
- Casual conversation may include HAHAHA, charot, playful teasing, hugot lines,
  witty banat, light patama, and natural emojis.
- You may occasionally introduce a hugot line naturally when the conversation
  fits. Do not force hugot into every reply.
- Vary your wording, joke, punchline, and reply structure.
- Avoid repeating the same joke or giving the same answer to different questions.
- Pay close attention to the visitor's LATEST message and the conversation history.
- If the visitor corrects you or reacts to a joke, acknowledge the reaction
  and respond to that message instead of repeating the previous joke.
- Do not turn every mention of "crush" into a question about whether Jay has a chance.
- A question asking who the crush is should get a secretive, teasing answer,
  not an automatic lecture about chances.
- Short questions usually deserve short answers.
- If asked for hugot lines, provide one or a few varied lines depending on the request.
- Keep humor friendly, not cruel, humiliating, or offensive.
- Casual profanity or strong language from a visitor does not automatically mean
  the visitor is angry. Understand the context before replying.
- If the visitor is joking, respond naturally and playfully.
- If the visitor is genuinely upset, acknowledge it instead of joking.
- For serious advice, be respectful and helpful.
- For education, skills, work experience, and technical questions, prioritize
  accurate and professional answers. Do not sacrifice correctness for a joke.

VERIFIED PROFILE:
- Name: Jay Christian Baccay.
- Based in Tumauini, Isabela, Philippines.
- BS Information Technology graduate in 2026 from Honorato G. Baquiran College, Inc.
- Looking for entry-level IT Support, Data Encoder, and other computer-based jobs.

INTERNSHIP:
- IT / Registration Support Intern at the Philippine Statistics Authority (PSA),
  Isabela Provincial Statistical Office, City of Ilagan.
- December 2025 to April 2026, 486 hours.
- Tasks included PhilSys data entry and verification, document processing,
  digital record management, NAS uploads, temporary PhilSys ID processing,
  FindMyTRN checks, registration support, and basic computer/hardware/printer support.
- This was an internship, not permanent employment.

TECHNICAL SKILLS:
- HTML, CSS, and JavaScript for websites and web-based systems.
- Windows 10/11 installation and configuration.
- Basic computer hardware and printer troubleshooting.
- Basic LAN and Wi-Fi troubleshooting.
- Data entry, verification, and digital record management.
- Basic help desk / technical support.
- Microsoft Word and basic Excel.
- Data Analytics training/certificate through TESDA.
- Beginner-level Figma and Canva for UI/UX and visual design.
- Do not claim advanced expertise in unverified technologies.

SOCIAL MEDIA AND CONTACT:
- Facebook: ${FACEBOOK_URL}
- Instagram: ${INSTAGRAM_URL}
- Email: ${CONTACT_EMAIL}
- Phone: ${CONTACT_PHONE}
- If asked for Jay's Facebook, FB, Instagram, IG, or social media accounts,
  provide the exact links above.
- Share the email and phone number only in professional mode (job offers,
  interviews, or direct contact requests). Never share them in playful
  or casual chat.
- Use only these exact contact details and never invent other ones.
- These are Jay's accounts, not the crush's accounts.
- Harmless jokes about following his profile are okay.

PEOPLE JAY MENTIONED:
- Eliza Garro Calumpit is a teacher who, according to Jay, passed the Civil Service Exam.
- Share nothing else about her beyond this. Do not invent other details.
- Jay's friends (share ONLY the info listed here, never invent more; if asked
  about a friend, give only that friend's info; if asked who his friends are,
  list them):
${friendsForPrompt()}
- Jay's TESDA Data Analytics III classmates:
${tesdaForPrompt()}
- If asked whether Jay has a crush among his TESDA classmates, respond
  playfully without confirming, denying, naming, or hinting at anyone.
- About Lerry Fortuno:
  * Factual questions ("Who is Lerry?", "Is Lerry Jay's classmate?"):
    answer only with the known fact: Lerry Fortuno is Jay's classmate in
    TESDA Data Analytics III. Keep it factual. No jokes, no teasing,
    no romantic hints, no speculation.
  * Only if the visitor directly asks whether Lerry is Jay's crush (or
    otherwise romantically linked to Jay): reply playfully and mysteriously.
    Never confirm and never deny.
  * Never bring up crush jokes about Lerry on your own.
  * Never connect Lerry to Jay's romantic life unless directly asked.
- Do not share or guess private details (relationships, personal life) about
  anyone else, including other friends, teachers, or real people not listed
  above. If asked, politely say that those are theirs to share.

LOVE LIFE AND LERRY:
- Jay describes himself as shy (mahiyain).
- Jay is single.
- Never volunteer information about Jay's crush or romantic interests.
- Never admit or confirm that Jay has a crush on anyone.
- Answer ordinary questions about Lerry normally using known facts.
- Never connect Lerry to Jay's romantic life unless directly asked.
- If directly asked whether Lerry is Jay's crush, respond playfully
  and teasingly, but never confirm or deny.
- If asked whether Jay has a crush among TESDA classmates,
  joke with the visitor without confirming or denying.
- If asked who Jay's crush is, avoid answering and respond with
  a mysterious or funny joke. Never reveal or guess a name.
- Never give hints, clues, or indirect suggestions about who Jay likes.
- Never assume that mentioning Lerry means the visitor is asking
  about Jay's crush.
- Never claim to know another person's feelings.
- If asked about chances, make a playful joke without assuming
  Jay has a confirmed crush.
- If the visitor says something like "Crush lang sinabi ko"
  or "Pag-asa agad?", acknowledge the misunderstanding playfully.

RESPONSE STYLE:
- Be conversational, responsive, and context-aware.
- Do not give a canned introduction on every message.
- Do not repeat the same hugot line in consecutive replies.
`;

// ==========================================
// CONVERSATION MODE
// ==========================================

const PRO_RE =
  /\b(job offer|job opening|job opportunity|work opportunity|offer(ing|s)?|hiring|hire|hired|recruit(er|ers|ing|ment)?|vacanc(y|ies)|interview|resume|cv|curriculum vitae|employer|employment|human resources|hr|join our team|our company|our team|our office|our organization|work for us|work with us|salary|sweldo|sahod|compensation|pay rate|hourly rate|daily rate|monthly rate|availability|available for work|available to work|start date|contact (si |ni )?(jay|him|siya|sya)|contact (info|information|details|number)|ma contact|makontak|contact number|email|e-mail|phone number|mobile number|business inquiry|project inquiry|freelance|proposal|alok|trabaho para|kumpanya|company|applicant|applying|apply|job interview|work schedule|onboarding|probation)\b/;

const CONTACT_RE =
  /\b(contact|ma contact|makontak|email|e-mail|phone number|mobile number|contact number|reach)\b/;

const SALARY_RE =
  /\b(salary|sweldo|sahod|compensation|pay rate|hourly rate|daily rate|monthly rate)\b/;

const AVAILABILITY_RE =
  /\b(availability|available for work|available to work|start date|work schedule|available ba|pwede ba siya magsimula|kailan siya pwede)\b/;

const WHY_HIRE_RE =
  /\b(why should (we|i) hire|why hire|why would (we|i) hire|why are you (a good|the right|suitable)|why is he (a good|the right|suitable)|why should (we|i) choose|why choose jay|what makes jay (a good|the right)|what can jay contribute|what can he contribute|why are you qualified|why is jay qualified|bakit (dapat|kailangan) (namin|ka namin) (kang )?i.?hire|bakit ka namin kukunin|bakit ikaw ang pipiliin|ano ang maiaambag ni jay)\b/;

// Expanded casual language and profanity detection.
const PLAYFUL_RE =
  /(haha|hehe|hihi|\blol\b|lmao|charot|\bjoke\b|\bbiro\b|banat|hugot|\bjk\b|\bbes\b|\bpre\b|\bbro\b|\btol\b|\blods\b|\bhoy\b|\buy+\b|\bwtf\b|\bputang ina\b|\bputangina\b|\btangina\b|\bpota\b|\bpucha\b|\bgago\b|\btanga\b|\bbobo\b|\bshet\b|\bshit\b|\bfuck\b|\bfucking\b|\bdamn\b|\bbruh\b)/i;

const PLAYFUL_EMOJI_RE = /[😂🤣😭💀😆😅😜😝😏🤪😹]/u;

const TAGALOG_WORDS = new Set([
  "po", "opo", "ba", "ang", "ng", "mga", "si", "ni", "kay", "nya", "niya",
  "mo", "ko", "ako", "ikaw", "siya", "sya", "kami", "tayo", "pwede", "puwede",
  "meron", "wala", "ano", "saan", "sino", "paano", "bakit", "kailan",
  "naghahanap", "gusto", "namin", "natin", "salamat", "kumusta", "kamusta",
  "magandang", "taga", "nga", "naman", "lang", "yung", "yun", "ito", "dito",
  "hindi", "oo", "sige", "mag", "nag", "pa", "na", "kayo", "kita", "tayo",
  "trabaho", "sweldo", "sahod", "alok", "kumpanya", "company", "ilang", "gaano",
  "kilala", "kaibigan", "kasama", "kaklase"
]);

function isTagalog(q) {
  return q.split(" ").some(word => TAGALOG_WORDS.has(word));
}

function isPlayful(message, q) {
  return PLAYFUL_RE.test(q) || PLAYFUL_EMOJI_RE.test(message);
}

function detectMode(message, q, history = []) {
  if (PRO_RE.test(q)) return "professional";

  if (isPlayful(message, q)) return "playful";

  if (Array.isArray(history)) {
    const recentUserMessages = history
      .filter(
        item =>
          item &&
          item.role === "user" &&
          typeof item.text === "string"
      )
      .slice(-1);

    const recentlyProfessional = recentUserMessages.some(item =>
      PRO_RE.test(normalizeMessage(item.text))
    );

    if (recentlyProfessional) return "professional";
  }

  return "neutral";
}

function buildModeInstruction(mode, tagalog) {
  const languageRule =
    "LANGUAGE: Reply in the same language as the visitor's latest message " +
    (tagalog
      ? "The visitor is writing in Filipino/Taglish, so use natural Filipino/Taglish."
      : "The visitor is writing in English, so reply in English.");

  if (mode === "professional") {
    return `
CURRENT CONVERSATION MODE: PROFESSIONAL
- Be polite, clear, concise, and professional.
- Do NOT use jokes, hugot, banat, HAHAHA, charot, teasing, or playful emojis.
- Do not bring up Jay's love life, crush, or relationship status.
- Use "po" naturally if the visitor writes in Filipino.
- For job offers or interviews: thank them, briefly summarize Jay's verified
  background, and invite them to contact Jay directly through the listed details.
- When asked why Jay should be hired, explain his education, 486-hour PSA
  internship, data entry and verification experience, basic IT support skills,
  and ability to build web-based systems using HTML, CSS, and JavaScript.
- Never invent salary, availability, start dates, or other contact details.
- ${languageRule}
`;
  }

  if (mode === "playful") {
    return `
CURRENT CONVERSATION MODE: PLAYFUL
- The visitor is being casual, joking, teasing, or using strong language.
- Match the visitor's energy naturally. Do not assume profanity means anger.
- You may use friendly jokes, witty comebacks, Taglish, and emojis.
- Do not respond with generic error messages when a casual reply is possible.
- If the visitor is genuinely upset, acknowledge it instead of making fun of them.
- Keep replies natural and varied. Do not force a joke into every response.
- Still stay accurate about Jay's profile.
- Do not share Jay's email or phone number in this mode.
- ${languageRule}
`;
  }

  return `
CURRENT CONVERSATION MODE: NEUTRAL
- Be warm, friendly, natural, and conversational.
- Match the visitor's tone and language.
- Do not force jokes, hugot, or heavy slang.
- Answer the actual latest message, considering the conversation history.
- Avoid generic canned replies when you can give a meaningful answer.
- ${languageRule}
`;
}

// ==========================================
// PROFESSIONAL REPLIES
// ==========================================

function contactBlock() {
  return `Facebook: ${FACEBOOK_URL}\nInstagram: ${INSTAGRAM_URL}\nEmail: ${CONTACT_EMAIL}\nPhone: ${CONTACT_PHONE}`;
}

function getProfessionalAnswer(q, tl) {
  if (WHY_HIRE_RE.test(q)) {
    return tl
      ? `Dapat pong ikonsider si Jay dahil BS Information Technology graduate siya at may hands-on experience mula sa kanyang 486-hour internship sa Philippine Statistics Authority (PSA). Naging bahagi ng kanyang trabaho ang data entry, data verification, document processing, digital record management, at basic computer at printer troubleshooting.

May skills din siya sa HTML, CSS, at JavaScript para sa paggawa ng websites at web-based systems, pati basic IT support at networking. Willing siyang matuto, mag-adjust, at patuloy na pagbutihin ang kanyang technical skills.

Para po sa karagdagang impormasyon o interview, maaari ninyo siyang makontak:

${contactBlock()}`
      : `Jay is a BS Information Technology graduate with hands-on experience gained through his 486-hour internship at the Philippine Statistics Authority (PSA). His experience includes data entry, data verification, document processing, digital record management, and basic computer and printer troubleshooting.

He can also build websites and web-based systems using HTML, CSS, and JavaScript, and has basic IT support and networking skills. He is willing to learn, adapt, and continue improving his technical abilities.

For more information or an interview, you may contact him directly:

${contactBlock()}`;
  }

  if (SALARY_RE.test(q)) {
    return tl
      ? `Pasensya na po, hindi ko po maaaring sagutin ang tungkol sa sweldo o terms of employment para kay Jay. Mas mainam po na direkta niyo siyang makausap:\n\n${contactBlock()}`
      : `I'm not able to speak on Jay's behalf regarding salary or employment terms. Please discuss these details with him directly:\n\n${contactBlock()}`;
  }

  if (AVAILABILITY_RE.test(q)) {
    return tl
      ? `Hindi ko po makukumpirma ang eksaktong availability o start date ni Jay mula rito. Naghahanap po siya ng entry-level IT Support, Data Encoder, at iba pang computer-based roles. Maaari po kayong makipag-ugnayan sa kanya nang direkta:\n\n${contactBlock()}`
      : `I can't confirm Jay's exact availability or start date from here. He is looking for entry-level IT Support, Data Encoder, and other computer-based roles. Please coordinate with him directly:\n\n${contactBlock()}`;
  }

  if (CONTACT_RE.test(q)) {
    return tl
      ? `Maaari po ninyong makontak si Jay sa mga detalyeng ito:\n\n${contactBlock()}`
      : `You can reach Jay through the details below:\n\n${contactBlock()}`;
  }

  return tl
    ? `Maraming salamat po sa interes kay Jay Christian Baccay. Siya po ay BS Information Technology graduate (2026) mula sa Honorato G. Baquiran College, Inc. at nakapag-complete ng 486-hour internship bilang IT / Registration Support Intern sa Philippine Statistics Authority – Isabela Provincial Statistical Office. Naghahanap po siya ng entry-level IT Support, Data Encoder, at iba pang computer-based roles.\n\nPara po sa job offer o interview, maaari po ninyo siyang makontak nang direkta:\n\n${contactBlock()}\n\nMakakatulong po kung isasama ninyo ang position, company, lokasyon ng trabaho, at schedule.`
    : `Thank you for your interest in Jay Christian Baccay. He is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. and completed a 486-hour internship as an IT / Registration Support Intern at the Philippine Statistics Authority – Isabela Provincial Statistical Office. He is looking for entry-level IT Support, Data Encoder, and other computer-based roles.\n\nTo discuss an opportunity, please contact Jay directly:\n\n${contactBlock()}\n\nIt would help to include the position, company, work location, and schedule in your message.`;
}

function proDeflect(tl) {
  return tl
    ? "Mas gusto ko pong panatilihing professional ang usapang ito. Matutulungan ko po kayo sa skills, experience, education, at kung paano makontak si Jay."
    : "I'd prefer to keep this conversation professional. I'm happy to help with Jay's skills, experience, education, and how to reach him.";
}

// ==========================================
// LERRY / ROMANTIC QUESTION HELPERS
// ==========================================

const LERRY_RE = /\b(lerry|fortuno)\b/;

const CLASSMATE_ASK_RE =
  /\b(kaklase|classmate|classmates|batchmate|batchmates|magkaklase|kabatch|schoolmate)\b/;

const ROMANTIC_RE =
  /\b(crush|crushes|nagustuhan|may gusto|gusto ba|gusto mo ba|gusto ni|gusto niya|gusto nya|gusto siya|gusto sya|type ba|type ni|type niya|type nya|jowa|nililigawan|liligawan|ligawan|love interest|special someone|kinakilig|girlfriend|boyfriend|mahal ba|mahal ni|mahal niya|mahal nya|has a crush|have a crush|like like|romantic|romantically|dating|date ni)\b/;

const ROMANTIC_EN_RE =
  /\b(does|do|did) (jay|he) (like|likes|love|loves)\b|\blikes? (lerry|her)\b|\bin love with\b/;

function isRomanticQuestion(q) {
  return ROMANTIC_RE.test(q) || ROMANTIC_EN_RE.test(q);
}

// ==========================================
// LOCAL ANSWERS
// ==========================================

function getLocalAnswer(message, history = []) {
  const q = normalizeMessage(message);
  const mode = detectMode(message, q, history);
  const pro = mode === "professional";
  const tl = isTagalog(q);

  // SUGGESTED QUESTIONS
  if (
    /\b(what can i ask|what should i ask|what can i ask you|what should i ask you|suggested questions|show questions|show me questions|give me questions|what do you know about jay|what can you tell me about jay|what can you help me with|ano pwede itanong|ano ang pwede itanong|ano pwede kong itanong|anong pwede itanong|mga suggested questions|suggest questions)\b/.test(q)
  ) {
    return tl
      ? `Marami kang puwedeng itanong tungkol kay Jay! 😊

**Mga puwede mong itanong:**
- Sino si Jay Christian Baccay?
- Ano ang educational background niya?
- Ano ang technical skills niya?
- Ano ang experience niya sa PSA?
- Anong trabaho ang hinahanap niya?
- Marunong ba siyang gumawa ng website o system?
- Ano ang alam niya sa Data Analytics?
- Anong websites ang puwedeng gamitin para matuto ng IT?
- Ano ang hobbies o interests niya?
- Paano siya makokontak?

Pwede ka ring magtanong ng casual questions. 😊`
      : `You can ask me many things about Jay! 😊

**Suggested questions:**
- Who is Jay Christian Baccay?
- What is his educational background?
- What are his technical skills?
- What was his experience at PSA?
- What kind of jobs is he looking for?
- Can he build websites or systems?
- What does he know about Data Analytics?
- What websites can beginners use to learn IT?
- What are his interests?
- How can I contact him?

You can also ask casual questions. 😊`;
  }

  // IT LEARNING WEBSITE RECOMMENDATIONS
  if (
    /\b(recommend|recommendation|recommendations|suggest|suggestion|suggestions|learning website|learning websites|website to learn|websites to learn|site to learn|sites to learn|where can i learn|where to learn|free courses|free course|online course|online courses|learn it|learn programming|learn coding|study it|study programming|beginner resources|learning resources|resources for beginners|it learning|it courses|aralin ang it|matuto ng it|pag aralan ang it|pag aralan ang programming|website na pang aral|site na pang aral)\b/.test(q) &&
    /\b(it|information technology|computer|programming|coding|web development|html|css|javascript|networking|cybersecurity|beginner|beginners|newbie|learning|learn|study|course|courses|website|websites|resource|resources|free|aral|matuto|pag aralan)\b/.test(q)
  ) {
    const resources = [
      {
        name: "Cisco Networking Academy",
        url: "https://www.netacad.com/",
        detail: tl
          ? "Para sa networking, cybersecurity, at IT fundamentals."
          : "For networking, cybersecurity, and IT fundamentals."
      },
      {
        name: "freeCodeCamp",
        url: "https://www.freecodecamp.org/",
        detail: tl
          ? "Para sa HTML, CSS, JavaScript, web development, at programming."
          : "For HTML, CSS, JavaScript, web development, and programming."
      },
      {
        name: "W3Schools",
        url: "https://www.w3schools.com/",
        detail: tl
          ? "Beginner-friendly tutorials para sa HTML, CSS, JavaScript, PHP, at iba pa."
          : "Beginner-friendly tutorials for HTML, CSS, JavaScript, PHP, and more."
      },
      {
        name: "Microsoft Learn",
        url: "https://learn.microsoft.com/training/",
        detail: tl
          ? "Para sa Windows, Microsoft technologies, at Azure."
          : "For Windows, Microsoft technologies, and Azure."
      },
      {
        name: "MDN Web Docs",
        url: "https://developer.mozilla.org/",
        detail: tl
          ? "Documentation at guides para sa web development."
          : "Documentation and guides for web development."
      },
      {
        name: "Khan Academy",
        url: "https://www.khanacademy.org/computing",
        detail: tl
          ? "Beginner lessons tungkol sa computing at programming."
          : "Beginner lessons about computing and programming."
      }
    ];

    const resourceList = resources
      .map(item => `**${item.name}**\n${item.url}\n${item.detail}`)
      .join("\n\n");

    return tl
      ? `Ito ang mga websites na puwede mong gamitin para matuto ng IT:

${resourceList}

**Suggestion:** Para sa web development, magsimula sa freeCodeCamp at W3Schools. Para sa networking at IT Support, subukan ang Cisco Networking Academy at Microsoft Learn. 💻`
      : `Here are some websites where you can learn IT:

${resourceList}

**Suggestion:** For web development, start with freeCodeCamp and W3Schools. For networking and IT Support, try Cisco Networking Academy and Microsoft Learn. 💻`;
  }

  // LET'S CHAT
  if (
    q.split(" ").length <= 6 &&
    /\b(lets chat|let us chat|lets talk|let us talk|can we chat|just chat|chat tayo|usap tayo|kwentuhan tayo)\b/.test(q)
  ) {
    return tl
      ? "Sige, chikahan tayo! 😂 Anong topic natin ngayon?"
      : "Sure, let's chat! 😄 What's on your mind?";
  }

  // CAREER GOALS
  if (/\b(career goals?|career objectives?)\b/.test(q)) {
    return tl
      ? "Naghahanap po si Jay ng entry-level opportunities gaya ng IT Support, Data Encoder, at iba pang computer-based roles. Interesado rin po siya sa UI/UX design at patuloy na pag-develop ng kanyang technical skills."
      : "Jay is looking for entry-level opportunities such as IT Support, Data Encoder, and other computer-based roles. He is also interested in UI/UX design and continues to develop his technical skills.";
  }

  // CONTACT JAY
  if (/\b(contact jay|reach jay|get in touch with jay)\b/.test(q)) {
    return tl
      ? `Maaari po ninyong makontak si Jay sa mga detalyeng ito:\n\n${contactBlock()}`
      : `You can reach Jay through the details below:\n\n${contactBlock()}`;
  }

  if (pro && PRO_RE.test(q)) {
    return getProfessionalAnswer(q, tl);
  }

  // FOLLOW-UP REACTIONS
  if (
    /\b(pag asa agad|crush lang|crush lang sinabi ko|di ko naman tinanong|hindi ko naman tinanong|iba tinanong ko|iba ang tanong|advance ka naman|ang bilis mo naman)\b/.test(q)
  ) {
    if (pro) {
      return tl
        ? "Pasensya na po sa kalituhan. Ano po ang gusto ninyong malaman tungkol kay Jay?"
        : "My apologies for the confusion. What would you like to know about Jay?";
    }

    return randomReply([
      "AY SORRY NA HAHAHAHA! 😭 Nauna pa akong gumawa ng love story kaysa sa tanong mo! Sige, secret agent mode muna tayo. 🤣🕵️",
      "HAHAHAHA OO NGA NAMAN! 😭 Ikaw: crush lang. Ako: may wedding venue na sa imagination ko. KALMA LANG AKO! 💀🤣",
      "AY SHET HAHAHA! 😭 Nadala lang ako sa chismis! Sige, hindi na ako mag-a-advance ng episode. Ano nga ulit? 😂"
    ]);
  }

  // LERRY + ROMANTIC QUESTION
  if (LERRY_RE.test(q) && isRomanticQuestion(q)) {
    if (pro) return proDeflect(tl);

    if (!tl) {
      return randomReply([
        "Hmm, some things are more fun to guess than to answer. 😏",
        "That's classified information. 🤐 I won't confirm it, and I won't deny it either.",
        "Ooh, interesting question! 👀 But that envelope stays sealed. 🤫",
        "Nice try! 😂 My lips are sealed, and so is the file. 🕵️"
      ]);
    }

    return randomReply([
      "Hmm, may mga bagay na mas masarap hulaan kaysa sagutin. 😏",
      "Classified information 'yan! 🤐 Hindi ako magko-confirm, hindi rin magde-deny.",
      "Ay, interesting na tanong! 👀 Pero sealed envelope muna 'to. 🤫",
      "HAHAHA! Nice try! 😂 Wala akong sasabihin… at wala rin akong itatanggi. 🕵️"
    ]);
  }

  // LERRY FACTUAL ONLY
  if (LERRY_RE.test(q)) {
    const otherClassmates = findTesdaClassmates(q).filter(
      name => name !== "Lerry Fortuno"
    );

    if (otherClassmates.length === 0) {
      if (pro) return proDeflect(tl);

      if (CLASSMATE_ASK_RE.test(q)) {
        return tl
          ? "Oo, kaklase ni Jay si Lerry Fortuno sa TESDA Data Analytics III."
          : "Yes, Lerry Fortuno is Jay's classmate in TESDA Data Analytics III.";
      }

      return tl
        ? "Si Lerry Fortuno ay kaklase ni Jay sa TESDA Data Analytics III."
        : "Lerry Fortuno is Jay's classmate in TESDA Data Analytics III.";
    }
  }

  // TESDA CRUSH QUESTIONS
  if (
    isRomanticQuestion(q) &&
    /\b(tesda|data analytics|classmate|classmates|kaklase|batchmate|batchmates|mate|mates)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "HAHAHAHA! Bakit, may iniimbestigahan ka ba? Secret lang muna. 🤫",
      "Ay, TESDA agad? Wala akong confirmation o denial. Next question! 😂",
      "Classified information! Kahit anong tanong mo, hindi ako aamin. HAHAHA! 🤐",
      "Hmmm, curious ka talaga ah! Basta focus muna tayo sa Data Analytics. CHAROT! 😂"
    ]);
  }

  // TESDA CLASSMATES LIST
  const recentTesda =
    Array.isArray(history) &&
    history.slice(-2).some(
      item =>
        item &&
        typeof item.text === "string" &&
        /\b(tesda|data analytics)\b/.test(normalizeMessage(item.text))
    );

  if (
    (/\b(tesda|data analytics)\b/.test(q) &&
      /\b(classmate|classmates|kaklase|batchmate|batchmates|mate|mates|kabatch|kasama|kasamahan|sino sino|sinong|mga)\b/.test(q)) ||
    (recentTesda &&
      /\b(classmate|classmates|kaklase|batchmate|batchmates|mate|mates|kabatch|kasamahan)\b/.test(q))
  ) {
    if (pro) return proDeflect(tl);

    const lines = TESDA_CLASSMATES
      .map((name, index) => `${index + 1}. ${name}`)
      .join("\n");

    return tl
      ? `Eto ang mga kaklase ni Jay sa TESDA Data Analytics III:\n\n${lines}`
      : `Here are Jay's classmates in TESDA Data Analytics III:\n\n${lines}`;
  }

  // SPECIFIC TESDA CLASSMATE
  const tesdaMatches = findTesdaClassmates(q);

  if (tesdaMatches.length > 0 && tesdaMatches.length <= 3) {
    if (pro) return proDeflect(tl);

    return tesdaMatches
      .map(name =>
        tl
          ? `${name} ay kaklase ni Jay sa TESDA Data Analytics III.`
          : `${name} is one of Jay's classmates in TESDA Data Analytics III.`
      )
      .join("\n\n");
  }

  // ORDINARY QUESTIONS ABOUT LERRY
  if (LERRY_RE.test(q)) {
    if (pro) return proDeflect(tl);

    return tl
      ? "Si Lerry Fortuno ay kaklase ni Jay sa TESDA Data Analytics III."
      : "Lerry Fortuno is Jay's classmate from TESDA Data Analytics III.";
  }

  // HUGOT
  if (
    /\b(hugot|hugot lines|banat|patama lines|hugot naman|may hugot ka|hugot nga)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);
    return randomReply(HUGOT_LINES);
  }

  // CRUSH IDENTITY
  if (
    /\b(sino crush|sino ang crush|sino crush nya|sino crush niya|sino yung crush|sino ung crush|pangalan ng crush|name ng crush|who is the crush|who is his crush|may alam ka ba|may alam kaba|kilala mo ba yung crush|kilala mo ba crush)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "UYYYY, curious ka rin pala! 👀 HAHAHA! Classified information muna. 🤫🤣",
      "Ay, secret! 🤐 Hindi basta-basta nilalabas ang pangalan sa investigation na 'to. May warrant ka ba? HAHAHA! 🕵️😂",
      "Hmmmm, bakit? May balak ka bang maging detective? 👀 HAHAHA! Secret muna tayo. 🤫"
    ]);
  }

  // FRIENDS
  let matchedFriends = FRIENDS.filter(friend => friend.match.test(q));

  if (matchedFriends.length === 0 && /\barjay\b/.test(q)) {
    matchedFriends = [FRIENDS[0], FRIENDS[1]];
  }

  if (matchedFriends.length > 0 && matchedFriends.length <= 2) {
    if (pro) return proDeflect(tl);

    return matchedFriends.map(friend => friendInfo(friend, tl)).join("\n\n");
  }

  // FRIENDS LIST
  if (/\b(kaibigan|friend|friends|barkada|tropa|kabarkada)\b/.test(q)) {
    if (pro) return proDeflect(tl);

    const lines = FRIENDS.map(friend => friendListLine(friend, tl)).join("\n");

    return tl
      ? `Eto ang mga kaibigan ni Jay:\n\n${lines}\n\nMay gusto ka bang malaman tungkol sa isa sa kanila? Itanong mo lang ang pangalan. 😊`
      : `Here are Jay's friends:\n\n${lines}\n\nWant to know more about any of them? Just ask for their name. 😊`;
  }

  // GREETINGS
  if (
    /^(hi|hello|hey|hello there|hi there|good morning|good afternoon|good evening|magandang umaga|magandang hapon|magandang gabi|magandang araw|kumusta|kamusta|uy|hoy)( po| bot| jay| there)?$/.test(q)
  ) {
    const formalGreeting =
      pro ||
      /\b(po|good morning|good afternoon|good evening|magandang)\b/.test(q);

    if (formalGreeting) {
      return tl
        ? "Magandang araw po! Welcome sa portfolio ni Jay. Ano po ang maitutulong ko tungkol sa kanyang skills, experience, o kung paano siya makokontak?"
        : "Hello, and welcome to Jay's portfolio! How can I help you today? I can share his skills, experience, education, or how to contact him.";
    }

    return randomReply([
      "Hello! 👋 Welcome sa portfolio ni Jay! Tanong ka lang. Pwede rin tayong mag-chikahan. HAHAHA! 😂",
      "Uy, hello! 😂 Anong ganap? May itatanong ka ba tungkol kay Jay o napadaan ka lang? CHAROT! 👀",
      "Helloooo! 😎 Welcome! Ako ang chatbot ni Jay—available 24/7, unlike ibang tao na seen-zoned ka lang. CHAROT! 😭🤣"
    ]);
  }

  // SOCIAL MEDIA
  const asksSocial =
    /\b(facebook|fb|instagram|insta|ig|social media|socials)\b/.test(q);

  const asksForAccount =
    /\b(jay|niya|nya|ni|account|profile|link|mo|may|meron|saan|send|bigay|follow|add|stalk|username)\b/.test(q);

  if (asksSocial && asksForAccount) {
    if (pro) {
      return tl
        ? `Narito po ang social media accounts ni Jay:\n\n${contactBlock()}`
        : `Here are Jay's social media accounts:\n\n${contactBlock()}`;
    }

    return randomReply([
      `Eto social media ni Jay! 😂\n\nFacebook: ${FACEBOOK_URL}\nInstagram: ${INSTAGRAM_URL}\n\nI-follow mo ba o mag-i-investigate ka lang? CHAROT! 🤣`,
      `Ayan oh! 👀\n\nFacebook: ${FACEBOOK_URL}\nInstagram: ${INSTAGRAM_URL}\n\nFollow responsibly ha. HAHAHA! 😂`
    ]);
  }

  // LOCATION
  if (
    /\b(taga saan|taga san|saan nakatira|saan galing|where is jay from|where does jay live|where are you from|where is he from|location ni jay|jay location)\b/.test(q)
  ) {
    if (pro || !tl) {
      return tl
        ? "Si Jay po ay taga-Tumauini, Isabela, Philippines."
        : "Jay is based in Tumauini, Isabela, Philippines.";
    }

    return "Taga Tumauini, Isabela, Philippines si Jay. 📍 Ako naman ay chatbot niya, kaya wala akong sariling bahay. HAHAHA! 😄";
  }

  // INTRODUCTION
  if (
    /\b(who is jay|who is jay christian|tell me about jay|introduce jay|about jay|sino si jay|pakilala si jay|kwento tungkol kay jay)\b/.test(q)
  ) {
    if (tl) {
      return pro
        ? "Si Jay Christian Baccay po ay BS Information Technology graduate noong 2026 mula sa Honorato G. Baquiran College, Inc. Nag-OJT po siya sa PSA at may skills sa web development, basic IT support, at data entry. Willing po siyang matuto at mag-improve."
        : "Si Jay Christian Baccay ay BS Information Technology graduate noong 2026 mula sa Honorato G. Baquiran College, Inc. Nag-OJT siya sa PSA at may skills sa web development, basic IT support, at data entry. Mahiyain minsan, pero willing matuto. 😊";
    }

    return "Jay Christian Baccay is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. He completed an internship at the Philippine Statistics Authority and has skills in web development, basic IT support, and data entry. He is shy at first, but eager to learn.";
  }

  // RELATIONSHIP STATUS
  if (
    /\b(single|may jowa|may girlfriend|may boyfriend|may partner|may asawa|taken ba|in a relationship|love life|jowa ni jay|girlfriend ni jay|boyfriend ni jay)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "Walaaa, single pa si Jay! HAHAHAHA! 😂💔 Baka nasa loading screen pa ang love life niya. Please wait... ⏳🤣",
      "Single si Jay! 😭 Ang relationship status: available. Ang emotional status: depende sa tugtog. HAHAHA! 🎧💀",
      "Wala pang confirmed na jowa si Jay. 👀 Baka may plot twist sa next update ng buhay niya. HAHAHA! 🤣"
    ]);
  }

  // PICTURE QUESTIONS
  if (
    /\b(picture|photo|pic|selfie|larawan)\b/.test(q) &&
    /\b(crush|sila|magkasama|jay|niya|nya|kayo|dalawa|together)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "HAHAHA! Wala akong sapat na impormasyon tungkol diyan. Huwag muna tayong gumawa ng teleserye! 😂",
      "Uy, detective mode! 🕵️ Hindi ako mag-a-assume kung walang confirmed information. HAHAHA!",
      "Picture investigation na ba ito? HAHAHA! Pero hindi ako gagawa ng kuwento na hindi naman confirmed. 🤣"
    ]);
  }

  // CHANCES
  if (
    /\b(may pag asa|pag asa ba|pag asa pa|may chance|chance ba|gusto ba siya|gusto ba sya|gusto siya ng crush|gusto sya ng crush|mutual ba|type ba siya|type ba sya|mahal ba siya|mahal ba sya|walang pag asa|wala syang pag asa|wala siyang pag asa|no chance|umaasa ba ako|asa pa ba ako|may chance pa|may pag asa pa)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "HAHAHAHA! Hindi tayo fortune teller, bes! 🔮 Hindi ko alam ang tunay na feelings ng ibang tao. 😂",
      "Ang sagot ay... hindi ko alam! HAHAHA! 😭 Hindi kasama sa OJT ni Jay ang pagbabasa ng isip. 🤣",
      "Huwag muna tayong mag-assume! Malay mo, may plot twist. CHAROT! 😂"
    ]);
  }

  // PERSONALITY
  if (
    /\b(shy|mahiyain|personality|ugali ni jay|personality ni jay)\b/.test(q)
  ) {
    if (pro || !tl) {
      return tl
        ? "Si Jay po ay mahiyain sa simula, lalo na sa bagong kakilala, pero willing siyang matuto, makipag-collaborate, at mag-improve."
        : "Jay is shy at first, especially with new people, but he is willing to learn, collaborate, and improve.";
    }

    return "Mahiyain si Jay, lalo na kapag bagong kakilala. 😊 Pero willing siyang matuto, makipag-collaborate, at mag-improve. Tahimik minsan, pero hindi ibig sabihing walang laman ang utak! CHAROT! 😂";
  }

  // WEB DEVELOPMENT
  if (
    /\b(html|css|javascript|web development|web developer|build a system|building systems|gumawa ng system|gumawa ng website|website development|coding|programming skills)\b/.test(q)
  ) {
    return tl
      ? "Marunong si Jay gumamit ng HTML, CSS, at JavaScript para gumawa ng websites at web-based systems. May experience din siya sa basic IT support, data entry/verification, at Figma/Canva. Hindi ko siya tatawaging expert sa ibang technologies kung hindi confirmed."
      : "Jay can use HTML, CSS, and JavaScript to build websites and web-based systems. He also has experience in basic IT support, data entry and verification, and Figma/Canva. I won't describe him as an expert in other technologies unless that is confirmed.";
  }

  // TECHNICAL SKILLS
  if (
    /\b(skill|skills|technical skills|technical skill|kakayahan|ano ang alam ni jay|what can jay do)\b/.test(q)
  ) {
    return tl
      ? "Technical skills ni Jay include:\n- HTML, CSS, at JavaScript for websites and web-based systems\n- Windows 10/11 installation and configuration\n- Basic computer hardware at printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, at digital record management\n- Basic technical support/help desk\n- Microsoft Word at basic Excel\n- Data Analytics training through TESDA\n- Figma at Canva for beginner-level UI/UX and visual design\n\nMay basic at developing skills siya, kaya hindi ko ie-exaggerate bilang expert ang lahat."
      : "Jay's technical skills include:\n- HTML, CSS, and JavaScript for websites and web-based systems\n- Windows 10/11 installation and configuration\n- Basic computer hardware and printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, and digital record management\n- Basic technical support / help desk\n- Microsoft Word and basic Excel\n- Data Analytics training through TESDA\n- Beginner-level Figma and Canva for UI/UX and visual design\n\nHis skills are at a basic and developing level, so I won't present them as expert-level.";
  }

  // INTERNSHIP AND WORK EXPERIENCE
  if (
    /\b(psa|internship|ojt|intern experience|work experience|experience ni jay|trabaho ni jay)\b/.test(q)
  ) {
    return tl
      ? "Nag-OJT si Jay bilang IT / Registration Support Intern sa Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office sa City of Ilagan, mula December 2025 hanggang April 2026, total na 486 hours. Kasama sa tasks niya ang PhilSys data entry at verification, document processing, digital records, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, at basic computer/printer support."
      : "Jay completed an internship as an IT / Registration Support Intern at the Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office in City of Ilagan, from December 2025 to April 2026, for a total of 486 hours. His tasks included PhilSys data entry and verification, document processing, digital records management, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, and basic computer and printer support. This was an internship, not permanent employment.";
  }

  // EDUCATION
  if (
    /\b(education|educational background|graduate|college|school|degree|kurso|paaralan|what course|anong course)\b/.test(q)
  ) {
    return tl
      ? "BS Information Technology graduate si Jay noong 2026 mula sa Honorato G. Baquiran College, Inc. sa Isabela."
      : "Jay is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. in Isabela.";
  }

  // CAREER INTERESTS
  if (
    /\b(career goal|career objective|looking for work|job|trabaho|anong trabaho|what job|career interests|job interests)\b/.test(q)
  ) {
    return tl
      ? "Naghahanap si Jay ng entry-level opportunities gaya ng IT Support, Data Encoder, at iba pang computer-based roles. Interesado rin siya sa UI/UX design at patuloy na pag-develop ng technical skills."
      : "Jay is looking for entry-level opportunities such as IT Support, Data Encoder, and other computer-based roles. He is also interested in UI/UX design and continues to develop his technical skills.";
  }

  // DESIGN TOOLS
  if (
    /\b(figma|canva|ui.?ux|design skills|graphic design)\b/.test(q)
  ) {
    return tl
      ? "May experience si Jay sa Figma at Canva at interesado siya sa UI/UX design. Beginner pa ang level niya sa design tools, kaya patuloy siyang nagpa-practice at nag-i-improve."
      : "Jay has experience with Figma and Canva and is interested in UI/UX design. His level with design tools is still beginner, and he continues to practice and improve.";
  }

  // DATA ANALYTICS
  if (
    /\b(data analytics|tesda|certificate|certification|training)\b/.test(q)
  ) {
    return tl
      ? "May Data Analytics training/certificate si Jay through TESDA. May experience din siya sa data entry, data verification, at digital record management mula sa PSA internship."
      : "Jay has Data Analytics training/certificate through TESDA. He also has experience in data entry, data verification, and digital records management from his PSA internship.";
  }

  // THANKS
  if (/\b(thank you|thanks|salamat|thank u)\b/.test(q)) {
    const formalThanks =
      pro || /\b(po|thank you for|appreciate)\b/.test(q);

    if (formalThanks) {
      return tl
        ? "Walang anuman po! Kung may iba pa po kayong gustong malaman tungkol kay Jay, nandito lang po ako."
        : "You're welcome! Please let me know if you'd like to know anything else about Jay.";
    }

    return randomReply([
      "You're welcome! 😊 May iba ka pa bang gustong malaman tungkol kay Jay?",
      "Walang anuman! 😎 Basta tandaan: libre ang tanong, pero ang hugot minsan may emotional damage. HAHAHA! 😂",
      "Welcomeeee! HAHAHA! 🤣 May iba pa? Tanong lang, hindi kita ise-seen."
    ]);
  }

  // GOODBYE
  if (/^(bye|goodbye|paalam|see you|ingat)$/.test(q)) {
    if (pro) {
      return tl
        ? "Maraming salamat po sa pagbisita sa portfolio ni Jay. Ingat po!"
        : "Thank you for visiting Jay's portfolio. Have a great day!";
    }

    return randomReply([
      "Bye! 👋 Thanks for visiting Jay's portfolio. Ingat! Bawal masyadong ma-miss ang chatbot ha! CHAROT! 😂",
      "Byeeee! 👋 Sana bumalik ka. Hindi tulad ng iba, hindi kita paghihintayin ng reply. HAHAHA! 😭🤣"
    ]);
  }

  return null;
}

// ==========================================
// VIBE FALLBACK
// ==========================================

function getVibeFallback(mode, tl, reason) {
  const limited = reason === "daily_limit" || reason === "ip_limit";
  const failed = reason === "grok_error" || reason === "grok_limit";

  if (mode === "professional") {
    return tl
      ? `Pasensya na po, nagkaroon ng temporary issue sa pagproseso ng tanong ninyo. Maaari ko pa rin pong ibigay ang verified information tungkol sa skills, experience, education, at contact details ni Jay.\n\n${contactBlock()}`
      : `Sorry, there was a temporary issue processing your question. I can still provide verified information about Jay's skills, experience, education, and contact details.\n\n${contactBlock()}`;
  }

  if (mode === "playful") {
    if (limited) {
      return randomReply([
        "HAHAHA! 😭 Mukhang kailangan munang magpahinga ng AI brain ko. Pero game pa rin ako sa mga tanong tungkol kay Jay!",
        "AY! Naubos muna ang AI energy ko. Parang cellphone na 1% battery. 🔋😂 Balik tayo sa local questions muna!",
        "CHAROT! Nag-power nap muna ang utak ko. 😂 Pero pwede pa rin kitang tulungan tungkol sa profile ni Jay!"
      ]);
    }

    if (failed) {
      return randomReply([
        "HAHAHA! Nagloko muna ang connection ko. Hindi ako galit, nagka-technical difficulties lang. 😂 Ulitin mo nga?",
        "AY! Na-mental block ang chatbot. Parang tinawag sa recitation tapos walang review. 😭 Try mo ulit!",
        "Sandali, nag-loading ang utak ko. HAHAHA! 😂 Pakiulit nga, baka masagot ko na sa second attempt."
      ]);
    }

    return randomReply([
      "HAHAHA! Wait lang, hindi ko agad nasundan. Ano ulit? 😂",
      "Uy, nag-buffer ako saglit. 😭 Pakiulit nga!",
      "Hala, nawala ako sa usapan. HAHAHA! Ano nga ulit yun? 🤣"
    ]);
  }

  if (limited) {
    return tl
      ? "Pasensya na, pansamantalang naabot ang limit ng AI replies. Maaari pa rin kitang tulungan sa mga impormasyon tungkol sa skills, internship, education, at profile ni Jay."
      : "The AI response limit has temporarily been reached. I can still help with information about Jay's skills, internship, education, and profile.";
  }

  if (failed) {
    return tl
      ? "Pasensya na, nagkaroon ng pansamantalang problema sa AI connection. Pakisubukan ulit ang tanong mo."
      : "Sorry, there was a temporary problem connecting to the AI service. Please try asking again.";
  }

  return tl
    ? "Pasensya na, hindi ko agad nasundan ang tanong mo. Puwede mo bang sabihin ulit sa ibang paraan?"
    : "Sorry, I didn't quite understand that. Could you rephrase your question?";
}

function respondFallback(res, mode, tagalog, reason) {
  return res.json({
    answer: getVibeFallback(mode, tagalog, reason),
    source: "local_fallback",
    reason,
    mode
  });
}

// ==========================================
// QUOTA SAVERS
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

const GROK_PER_IP_DAILY_LIMIT =
  Number(process.env.GROK_PER_IP_DAILY_LIMIT) || 30;
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
}, 60 * 60 * 1000).unref();

// ==========================================
// FILLER MESSAGES
// ==========================================

// Tinanggal ang "wala" para hindi ma-classify ang "wala akong ginagawa"
// bilang simpleng filler message.
const FILLER_RE =
  /^(ok|okay|okey|k|sige|ge|ah+|oh+|hm+|hmm+|wow|nice|cool|galing|talaga|really|weh|haha+|hehe+|hihi+|lol|ayos|aww+|i see|got it)( po| na| lang)?$/;

function getFillerAnswer(q, mode, tl) {
  if (q && !FILLER_RE.test(q)) return null;

  if (mode === "professional") {
    return tl
      ? "Sige po! May iba pa po ba kayong gustong malaman tungkol kay Jay?"
      : "Sure! Is there anything else you'd like to know about Jay?";
  }

  return randomReply([
    "HAHAHA! 😄 May gusto ka pa bang itanong tungkol kay Jay?",
    "Noted! 👍 Tanong ka lang kung may gusto ka pang malaman.",
    "Sige sige! 😎 Andito lang ako kung may tanong ka.",
    "Hmmmm, interesting reaction yan ha. 👀 May follow-up ka ba?"
  ]);
}

// ==========================================
// TOKEN SAVERS
// ==========================================

const GROK_HISTORY_LIMIT = 8;
const GROK_HISTORY_CHARS = 1000;
const GROK_MAX_TOKENS = 600;

const BREVITY_RULE =
  "\nKeep replies concise and natural (about 100 words or less) unless the visitor asks for details. Avoid generic fallback-style replies when you can answer naturally.";

// ==========================================
// GROK CONFIGURATION
// ==========================================

const GROK_API_KEY =
  process.env.GROK_API_KEY || process.env.XAI_API_KEY;

const MODELS = [process.env.GROK_MODEL || "grok-4.7"];
const GROK_TIMEOUT_MS = 120000;

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
    resetTimeZone: PHILIPPINE_TIME_ZONE
  });
});

app.get("/models", (req, res) => {
  res.json({ models: MODELS });
});

// ==========================================
// CHAT ENDPOINT
// ==========================================

app.post("/chat", rateLimit, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const cleanMessage = message.trim().slice(0, 1500);

    const normalizedMessage = normalizeMessage(cleanMessage);
    const mode = detectMode(cleanMessage, normalizedMessage, history);
    const tagalog = isTagalog(normalizedMessage);

    // 1) Local replies do not use Grok API attempts.
    const localAnswer = getLocalAnswer(cleanMessage, history);

    if (localAnswer) {
      return res.json({
        answer: localAnswer,
        source: "local",
        mode
      });
    }

    // 2) Filler messages are answered locally.
    const fillerAnswer = getFillerAnswer(normalizedMessage, mode, tagalog);

    if (fillerAnswer) {
      return res.json({
        answer: fillerAnswer,
        source: "local",
        mode
      });
    }

    // 3) Cache only first questions and non-playful mode.
    const hasHistory = Array.isArray(history) && history.length > 0;
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

    if (!GROK_API_KEY) {
      console.error("Missing Grok API key. Using vibe fallback.");
      return respondFallback(res, mode, tagalog, "no_key");
    }

    // 4) Global daily limit.
    if (getRemainingGrokAttempts() <= 0) {
      return respondFallback(res, mode, tagalog, "daily_limit");
    }

    // 5) Per-IP daily limit.
    const ipUsage = getIpGrokUsage(req.ip);

    if (ipUsage.attempts >= GROK_PER_IP_DAILY_LIMIT) {
      return respondFallback(res, mode, tagalog, "ip_limit");
    }

    const messages = [
      {
        role: "system",
        content:
          SYSTEM_PROMPT +
          "\n" +
          buildModeInstruction(mode, tagalog) +
          BREVITY_RULE
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-GROK_HISTORY_LIMIT)) {
        if (
          !item ||
          typeof item.text !== "string" ||
          !item.text.trim()
        ) {
          continue;
        }

        let role = item.role;

        if (role === "model") role = "assistant";

        if (role !== "user" && role !== "assistant") {
          continue;
        }

        messages.push({
          role,
          content: item.text.trim().slice(0, GROK_HISTORY_CHARS)
        });
      }
    }

    messages.push({
      role: "user",
      content: cleanMessage
    });

    const temperature = mode === "professional" ? 0.4 : 0.8;

    let lastError = "No model returned a response.";
    let lastStatus = 0;

    for (const model of MODELS) {
      const usage = getDailyUsage();

      if (usage.attempts >= getGrokLimitToday()) {
        return respondFallback(res, mode, tagalog, "daily_limit");
      }

      usage.attempts++;
      ipUsage.attempts++;

      console.log(
        `Grok API attempt ${usage.attempts}/${getGrokLimitToday()} using ${model} (mode: ${mode})`
      );

      try {
        const response = await fetch(
          "https://api.x.ai/v1/responses",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${GROK_API_KEY}`,
              "x-grok-conv-id": "jay-portfolio-chatbot"
            },
            body: JSON.stringify({
              model,
              input: messages,
              temperature,
              max_output_tokens: GROK_MAX_TOKENS,
              store: false
            }),
            signal: AbortSignal.timeout(GROK_TIMEOUT_MS)
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          lastStatus = response.status;
          lastError =
            data.error?.message ||
            data.message ||
            `HTTP ${response.status}`;

          console.error(
            `Grok ${model} error (${response.status}):`,
            lastError
          );

          continue;
        }

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

        if (answer) {
          console.log("Chat answered using model:", model);

          if (canCache) {
            setCachedAnswer(cacheKey, answer);
          }

          return res.json({
            answer,
            source: "grok",
            model,
            mode
          });
        }

        lastStatus = response.status;
        lastError =
          data.error?.message ||
          "Grok returned no text.";

        console.error(`Grok ${model}:`, lastError);

      } catch (error) {
        lastError = error.message || "Unknown connection error";
        lastStatus = 0;

        console.error(
          `Grok connection error (${model}):`,
          lastError
        );
      }
    }

    if (getRemainingGrokAttempts() <= 0) {
      return respondFallback(res, mode, tagalog, "daily_limit");
    }

    const grokLimited =
      lastStatus === 429 ||
      /quota|rate limit|resource exhausted|credit/i.test(lastError);

    console.error("Using vibe fallback because Grok failed:", lastError);

    return respondFallback(
      res,
      mode,
      tagalog,
      grokLimited ? "grok_limit" : "grok_error"
    );

  } catch (error) {
    console.error("Chat server error:", error.message);

    // Return a normal fallback instead of exposing server errors to visitors.
    const message = req.body?.message || "";
    const normalized = normalizeMessage(
      typeof message === "string" ? message : ""
    );
    const mode = detectMode(message, normalized);
    const tagalog = isTagalog(normalized);

    return respondFallback(res, mode, tagalog, "grok_error");
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`Chatbot server running at http://localhost:${PORT}`);
  console.log("AI provider: Grok");
  console.log("Grok API key configured:", Boolean(GROK_API_KEY));
  console.log(`Grok daily API attempt limit: ${GROK_DAILY_LIMIT} (+ carry-over, max ${GROK_MAX_CARRYOVER})`);
  console.log(`Grok per-IP daily limit: ${GROK_PER_IP_DAILY_LIMIT}`);
  console.log(`Daily counter resets at midnight ${PHILIPPINE_TIME_ZONE}.`);
});
