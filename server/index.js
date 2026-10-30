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
// GROK DAILY LIMIT
// ==========================================

const GROK_DAILY_LIMIT = Number(process.env.GROK_DAILY_LIMIT) || 500;
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
  attempts: 0
};

function getDailyUsage() {
  const today = getPhilippineDateKey();

  if (grokDailyUsage.date !== today) {
    grokDailyUsage = {
      date: today,
      attempts: 0
    };

    console.log("Grok daily usage counter reset:", today);
  }

  return grokDailyUsage;
}

function getRemainingGrokAttempts() {
  return Math.max(
    0,
    GROK_DAILY_LIMIT - getDailyUsage().attempts
  );
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
  interviews, or direct contact requests). Never share them in playful or
  casual chat.
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
- Jay's TESDA Data Analytics III classmates (share NAMES ONLY, never invent
  any other detail about them; if asked who his classmates are, list them):
${tesdaForPrompt()}
- If asked whether Jay has a crush among his TESDA classmates, answer playfully
  and without naming anyone, for example that maybe there is, and "basta ikaw na"
  if the visitor is the one asking. Never confirm or name a specific person.
- About Lerry Fortuno: ONLY talk about Lerry if the visitor asks about Lerry.
  Never bring up Lerry on your own, never list Lerry as the crush, and never
  hint at Lerry when the visitor asks about the crush in general. If asked about
  Lerry, say Lerry is a TESDA classmate and answer playfully and playsafe, like
  "malay mo crush, ewan natin", without confirming or denying anything.
- Do not share or guess private details (relationships, personal life) about
  anyone else, including other friends, teachers, or real people not listed
  above. If asked, politely say that those are theirs to share.

LOVE LIFE:
- Jay describes himself as shy (mahiyain).
- Jay is single.
- Jay has a crush, and he says they have a picture together.
- Keep the crush's name and identity secret.
- Never claim to know the crush's feelings.
- If asked who the crush is, tease the visitor and keep it a secret.
- If asked about chances, you may make a playful joke, but clearly acknowledge
  that nobody knows the crush's real feelings.
- If the visitor says something like "Crush lang sinabi ko" or "Pag-asa agad?",
  acknowledge that you jumped to conclusions and respond playfully.
  Example: "AY SORRY NA HAHAHA! Nauna pa akong gumawa ng love story kaysa sa tanong mo! 😭🤣"

RESPONSE STYLE:
- Be conversational, responsive, and context-aware.
- Do not give a canned introduction on every message.
- Do not repeat the same hugot line in consecutive replies.
- Keep professional answers accurate and clear.
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

const PLAYFUL_RE =
  /(haha|hehe|hihi|\blol\b|lmao|charot|\bjoke\b|\bbiro\b|banat|hugot|\bjk\b|\bbes\b|\bpre\b|\bbro\b|\btol\b|\blods\b|\bhoy\b|\buy+\b|\bwtf\b)/;

const PLAYFUL_EMOJI_RE = /[😂🤣😭💀😆😅😜😝😏🤪😹]/u;

const TAGALOG_WORDS = new Set([
  "po", "opo", "ba", "ang", "ng", "mga", "si", "ni", "kay", "nya", "niya",
  "mo", "ko", "ako", "ikaw", "siya", "sya", "kami", "tayo", "pwede", "puwede",
  "meron", "wala", "ano", "saan", "sino", "paano", "bakit", "kailan",
  "naghahanap", "gusto", "namin", "natin", "salamat", "kumusta", "kamusta",
  "magandang", "taga", "nga", "naman", "lang", "yung", "yun", "ito", "dito",
  "hindi", "oo", "sige", "mag", "nag", "pa", "na", "kayo", "kita", "tayo",
  "trabaho", "sweldo", "sahod", "alok", "kumpanya", "ilang", "gaano",
  "kilala", "kaibigan", "kasama", "kaklase"
]);

function isTagalog(q) {
  return q.split(" ").some(word => TAGALOG_WORDS.has(word));
}

function isPlayful(message, q) {
  return PLAYFUL_RE.test(q) || PLAYFUL_EMOJI_RE.test(message);
}

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
      .slice(-3);

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
    "(English, Filipino, or Taglish). " +
    (tagalog
      ? "The visitor is writing in Filipino/Taglish, so use respectful Filipino/Taglish."
      : "The visitor is writing in English, so reply in English.");

  if (mode === "professional") {
    return `
CURRENT CONVERSATION MODE: PROFESSIONAL (this overrides the humor rules above)
- The visitor may be an employer, recruiter, or someone with a work inquiry.
- Be polite, clear, concise, and professional.
- Do NOT use jokes, hugot, banat, HAHAHA, charot, teasing, or playful emojis.
- Do not bring up Jay's love life, crush, or relationship status.
  If asked, politely say you would rather keep the conversation professional.
- Use "po" naturally if the visitor writes in Filipino.
- For job offers or interviews: thank them, briefly summarize Jay's verified
  background, and invite them to contact Jay directly through the Facebook,
  Instagram, email, or phone listed above. Ask for the position, company,
  location, and schedule.
- Never invent salary, availability, start dates, or other contact details.
  Say Jay will discuss those details directly.
- ${languageRule}
`;
  }

  if (mode === "playful") {
    return `
CURRENT CONVERSATION MODE: PLAYFUL
- The visitor is joking or being casual. Match their energy with friendly humor.
- Keep jokes kind and never repeat the previous joke.
- Still stay accurate about Jay's profile.
- Do not share Jay's email or phone number in this mode.
- ${languageRule}
`;
  }

  return `
CURRENT CONVERSATION MODE: NEUTRAL
- Be warm and friendly, but do not force jokes, hugot, or heavy slang.
- Match the visitor's tone: if they write formally, answer formally;
  if they write casually, you may be a little more casual.
- Use humor only lightly, and only if the visitor invites it.
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
// LOCAL RECOMMENDATIONS - NO GROK TOKENS
// ==========================================

function getLocalRecommendation(q, tl) {
  // IT learning recommendations
  if (
    /\b(what should i learn|what to learn|recommend.*learn|suggest.*learn|ano dapat aralin|ano ang dapat kong aralin|anong dapat aralin|ano pa ang pwede aralin|ano pa dapat kong matutunan|suggestion.*learning|recommendation.*learning)\b/.test(q)
  ) {
    return tl
      ? "Kung nagsisimula ka pa lang sa IT, ito ang magandang learning path:\n\n1. HTML, CSS, at JavaScript – para sa web development.\n2. Computer Hardware – para sa troubleshooting.\n3. Networking Fundamentals – LAN, Wi-Fi, IP address, at basic networking.\n4. Windows Installation – installation at configuration.\n5. Database Fundamentals – basic SQL at database concepts.\n6. Data Analytics – Excel, Python, at data visualization.\n\nTip: Isa-isahin mo lang. Mas magandang may actual projects ka habang nag-aaral. 😊"
      : "If you're just starting in IT, here's a practical learning path:\n\n1. HTML, CSS, and JavaScript – for web development.\n2. Computer Hardware – for troubleshooting.\n3. Networking Fundamentals – LAN, Wi-Fi, IP addresses, and basic networking.\n4. Windows Installation – installation and configuration.\n5. Database Fundamentals – basic SQL and database concepts.\n6. Data Analytics – Excel, Python, and data visualization.\n\nTip: Learn one topic at a time and build small projects as you go.";
  }

  // IT career recommendations
  if (
    /\b(recommend.*it job|suggest.*it job|what it job|which it career|best it career|ano magandang it job|anong trabaho.*it|anong position.*it|career recommendation|job recommendation|recommend.*career|suggest.*career)\b/.test(q)
  ) {
    return tl
      ? "Para sa beginner sa IT, magandang pagpilian ang mga ito:\n\n- IT Support – computer, Windows, at printer troubleshooting.\n- Data Encoder – data entry, verification, at record management.\n- Junior Web Developer – HTML, CSS, at JavaScript.\n- Technical Support – basic troubleshooting at user assistance.\n- Data Analyst Trainee – Excel, Python, at data analytics.\n\nPiliin ang role na tugma sa skills at experience mo. Hindi kailangang expert agad; mahalaga ang willingness to learn."
      : "For someone starting in IT, these are good entry-level options:\n\n- IT Support – computer, Windows, and printer troubleshooting.\n- Data Encoder – data entry, verification, and record management.\n- Junior Web Developer – HTML, CSS, and JavaScript.\n- Technical Support – basic troubleshooting and user assistance.\n- Data Analyst Trainee – Excel, Python, and data analytics.\n\nChoose a role that matches your current skills. You don't need to be an expert to start; willingness to learn matters.";
  }

  // Website and system project recommendations
  if (
    /\b(project ideas|project suggestion|suggest.*project|recommend.*project|what project|anong project|ano magandang project|website idea|system idea|system recommendation)\b/.test(q)
  ) {
    return tl
      ? "Narito ang ilang beginner-friendly IT project ideas:\n\n1. Personal Portfolio Website\n2. Student Information Management System\n3. Inventory Management System\n4. Attendance Monitoring System\n5. Job Listing Website\n6. Simple Analytics Dashboard\n7. Computer Troubleshooting Guide Website\n\nTip: Gumamit ng HTML, CSS, JavaScript, at PHP/MySQL kung gusto mong gumawa ng full web-based system."
      : "Here are some beginner-friendly IT project ideas:\n\n1. Personal Portfolio Website\n2. Student Information Management System\n3. Inventory Management System\n4. Attendance Monitoring System\n5. Job Listing Website\n6. Simple Analytics Dashboard\n7. Computer Troubleshooting Guide Website\n\nTip: You can use HTML, CSS, JavaScript, and PHP/MySQL to build a complete web-based system.";
  }

  // General recommendation request
  if (
    /\b(recommend|recommendation|recommendations|suggest|suggestion|suggestions|any advice|give me advice|what do you recommend|what do you suggest|may ma recommend|may maire recommend|ano ma suggest|ano ma recommend|suggestion mo)\b/.test(q)
  ) {
    return tl
      ? "Sure! 😊 Anong klaseng recommendation ang kailangan mo—IT learning, career/job, website project, programming, o personal advice? Sabihin mo lang para mas maitugma ko ang suggestion."
      : "Sure! 😊 What kind of recommendation are you looking for—IT learning, career/job, website projects, programming, or general advice? Tell me the topic so I can give you a more relevant suggestion.";
  }

  return null;
}

// ==========================================
// LOCAL ANSWERS
// ==========================================

function getLocalAnswer(message, history = []) {
  const q = normalizeMessage(message);
  const mode = detectMode(message, q, history);
  const pro = mode === "professional";
  const tl = isTagalog(q);

  // Recommendations are handled locally. No Grok API request.
  if (!pro) {
    const recommendation = getLocalRecommendation(q, tl);

    if (recommendation) return recommendation;
  }

  // Common suggested questions and chat starters
  if (
    /^(lets chat|lets talk|let us chat|hi can we chat|hi lets chat|hello can we chat)$/.test(q)
  ) {
    return randomReply([
      "Hello! 👋 Welcome sa portfolio ni Jay! I'm happy to chat with you. You can ask me about his IT skills, internship experience, education, projects, or career goals. 😊",
      "Hi there! 😎 Welcome! Ako ang AI assistant ni Jay. Ano ang gusto mong malaman tungkol sa kanya? Pwede tayong mag-usap tungkol sa kanyang skills, OJT, projects, at career.",
      "Hey! 👋 Nice to meet you! Feel free to explore Jay's portfolio. Ask me anything about his education, technical skills, internship, and projects!"
    ]);
  }

  if (/^(career goals?|what are your career goals|what are jays career goals)$/.test(q)) {
    return "Jay is looking for entry-level opportunities such as IT Support, Data Encoder, and other computer-based roles. He is also interested in UI/UX design and continues to develop his technical skills.";
  }

  if (/^(contact jay|how can i contact jay|how to contact jay)$/.test(q)) {
    return `You can reach Jay through the details below:\n\n${contactBlock()}`;
  }

  if (pro && PRO_RE.test(q)) {
    return getProfessionalAnswer(q, tl);
  }

  // Follow-up reactions
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

  // Lerry
  if (/\b(lerry|fortuno)\b/.test(q)) {
    if (pro) return proDeflect(tl);

    if (tl) {
      return randomReply([
        "Si Lerry Fortuno? Kaklase ni Jay sa TESDA Data Analytics III. 👀 Crush ba? Malay mo... ewan natin! HAHAHA! 🤫 Playsafe lang tayo, walang confirmation.",
        "Ay, si Lerry! 😂 Kaklase yan ni Jay sa TESDA. Crush? Hmmmm, malay mo, malay mo hindi. Ewan natin! 🕵️ Basta wala akong sinasabi. CHAROT!",
        "HAHAHA! 😭 Si Lerry Fortuno, kaklase ni Jay sa Data Analytics III. Kung crush man o hindi... ewan natin! Playsafe tayo dito. 🤐👀"
      ]);
    }

    return randomReply([
      "Lerry Fortuno is one of Jay's classmates in TESDA Data Analytics III. 👀 Is that the crush? Who knows! 🤫 No confirmation, we're playing it safe.",
      "Lerry is a TESDA Data Analytics III classmate of Jay. 😄 Crush or not? We'll never tell! 🕵️ Playing it safe here."
    ]);
  }

  // TESDA: crush among classmates
  if (
    /\b(crush|gusto|type|nagustuhan)\b/.test(q) &&
    /\b(tesda|data analytics|classmate|classmates|kaklase|batchmate|batchmates)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "HAHAHAHA! 👀 May crush ba si Jay sa TESDA? Hmmmm... malay mo meron! 🤫 Basta kung ikaw ang nagtatanong, edi ikaw na! CHAROT! 😂",
      "UYYYY, chismosa/chismoso ka rin pala! 😭 Posible namang meron, posible ring wala. Pero kung ikaw ang hinahanap mo... ikaw na! HAHAHA! 🤣",
      "Ay, classified yan! 🕵️ Malay mo meron, malay mo wala. Pero sa dami ng classmates niya sa Data Analytics III, hindi na ako magtataka. HAHAHA! 😂",
      "HAHAHA! 😭 Walang confirmation, walang denial. Basta sabihin na lang nating... malay mo, ikaw na! CHAROT! 👀"
    ]);
  }

  // TESDA: list of classmates
  if (
    /\b(tesda|data analytics)\b/.test(q) &&
    /\b(classmate|classmates|kaklase|batchmate|batchmates|kabatch|kasama|kasamahan|sino sino|sinong)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    const lines = TESDA_CLASSMATES.map(name => `- ${name}`).join("\n");

    return tl
      ? `Eto ang mga kaklase ni Jay sa TESDA Data Analytics III:\n\n${lines}`
      : `Here are Jay's classmates in TESDA Data Analytics III:\n\n${lines}`;
  }

  // TESDA: specific classmate
  const tesdaMatches = findTesdaClassmates(q);

  if (tesdaMatches.length > 0 && tesdaMatches.length <= 3) {
    if (pro) return proDeflect(tl);

    return tesdaMatches
      .map(name =>
        tl
          ? `${name} – kaklase ni Jay sa TESDA Data Analytics III.`
          : `${name} is one of Jay's classmates in TESDA Data Analytics III.`
      )
      .join("\n\n");
  }

  // Hugot
  if (
    /\b(hugot|hugot lines|banat|patama lines|hugot naman|may hugot ka|hugot nga)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);
    return randomReply(HUGOT_LINES);
  }

  // Crush identity
  if (
    /\b(sino crush|sino ang crush|sino crush nya|sino crush niya|sino yung crush|sino ung crush|pangalan ng crush|name ng crush|who is the crush|who is his crush|may alam ka ba|may alam kaba|kilala mo ba yung crush|kilala mo ba crush)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "UYYYY, curious ka rin pala! 👀 HAHAHA! May alam ako, pero classified information muna. Baka ma-leak ang tea! 🤫🤣",
      "Ay, secret! 🤐 Hindi basta-basta nilalabas ang pangalan sa investigation na 'to. May warrant ka ba? HAHAHA! 🕵️😂",
      "Hmmmm, bakit? May balak ka bang maging detective? 👀 HAHAHA! Secret muna tayo. 🤫"
    ]);
  }

  // Friends
  let matchedFriends = FRIENDS.filter(friend => friend.match.test(q));

  if (matchedFriends.length === 0 && /\barjay\b/.test(q)) {
    matchedFriends = [FRIENDS[0], FRIENDS[1]];
  }

  if (matchedFriends.length > 0 && matchedFriends.length <= 2) {
    if (pro) return proDeflect(tl);

    return matchedFriends.map(friend => friendInfo(friend, tl)).join("\n\n");
  }

  // Friends list
  if (/\b(kaibigan|friend|friends|barkada|tropa|kabarkada)\b/.test(q)) {
    if (pro) return proDeflect(tl);

    const lines = FRIENDS.map(friend => friendListLine(friend, tl)).join("\n");

    return tl
      ? `Eto ang mga kaibigan ni Jay:\n\n${lines}\n\nMay gusto ka bang malaman tungkol sa isa sa kanila? Itanong mo lang ang pangalan. 😊`
      : `Here are Jay's friends:\n\n${lines}\n\nWant to know more about any of them? Just ask for their name. 😊`;
  }

  // Greetings
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
      "Hello! 👋 Welcome sa portfolio ni Jay! Tanong ka lang. Pwede rin tayong mag-chikahan, basta huwag mo akong gawing love advice expert. HAHAHA! 😂",
      "Uy, hello! 😂 Anong ganap? May itatanong ka ba tungkol kay Jay o napadaan ka lang para mang-chismis? CHAROT! 👀",
      "Helloooo! 😎 Welcome! Ako ang chatbot ni Jay—available 24/7, unlike ibang tao na seen-zoned ka lang. CHAROT! 😭🤣"
    ]);
  }

  // Social media
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
      `Ayan oh! 👀\n\nFacebook: ${FACEBOOK_URL}\nInstagram: ${INSTAGRAM_URL}\n\nFollow responsibly ha. Bawal mag-online detective nang walang tulog! HAHAHA! 😂`
    ]);
  }

  // Location
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

  // Introduction
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

  // Relationship status
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

  // Picture-related questions
  if (
    /\b(picture|photo|pic|selfie|larawan)\b/.test(q) &&
    /\b(crush|sila|magkasama|jay|niya|nya|kayo|dalawa|together)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "HAHAHAHA! 📸 May picture na raw silang together! Pero reminder: picture lang ang confirmed, hindi relationship status. Huwag tayong gumawa ng season 2 agad! 😭🤣",
      "May picture daw sila together! 👀📸 Pero hindi porket magkasama sa picture, may forever na. Baka photographer lang ang may magandang angle. CHAROT! 😂",
      "May souvenir na raw! HAHAHA! 📸 Pero ang tanong: picture lang ba o may plot twist? Hindi natin alam—huwag muna tayong gumawa ng teleserye! 🤣"
    ]);
  }

  // Chances
  if (
    /\b(may pag asa|pag asa ba|pag asa pa|may chance|chance ba|gusto ba siya|gusto ba sya|gusto siya ng crush|gusto sya ng crush|mutual ba|type ba siya|type ba sya|mahal ba siya|mahal ba sya|walang pag asa|wala syang pag asa|wala siyang pag asa|no chance|umaasa ba ako|asa pa ba ako|may chance pa|may pag asa pa)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply([
      "HAHAHAHA! 😭📸 May picture na nga raw sila, pero hindi natin alam ang tunay na feelings ng crush niya. Malay natin, may plot twist! CHAROT! 🤣👀",
      "May chance ba? Hindi tayo fortune teller, bes! HAHAHA! 🔮 Ang alam lang natin, may picture. Yung future, hindi pa naka-upload. 😂",
      "Ang sagot ay... hindi ko alam! HAHAHA! 😭 Hindi kasi kasama sa OJT ni Jay ang pagbabasa ng isip. Hintayin natin ang next episode! 🤣"
    ]);
  }

  // Personality
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

  // Web development
  if (
    /\b(html|css|javascript|web development|web developer|build a system|building systems|gumawa ng system|gumawa ng website|website development|coding|programming skills)\b/.test(q)
  ) {
    return tl
      ? "Marunong si Jay gumamit ng HTML, CSS, at JavaScript para gumawa ng websites at web-based systems. May experience din siya sa basic IT support, data entry/verification, at Figma/Canva. Hindi ko siya tatawaging expert sa ibang technologies kung hindi confirmed."
      : "Jay can use HTML, CSS, and JavaScript to build websites and web-based systems. He also has experience in basic IT support, data entry and verification, and Figma/Canva. I won't describe him as an expert in other technologies unless that is confirmed.";
  }

  // Technical skills
  if (
    /\b(skill|skills|technical skills|technical skill|kakayahan|ano ang alam ni jay|what can jay do)\b/.test(q)
  ) {
    return tl
      ? "Technical skills ni Jay include:\n- HTML, CSS, at JavaScript for websites and web-based systems\n- Windows 10/11 installation and configuration\n- Basic computer hardware at printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, at digital record management\n- Basic technical support/help desk\n- Microsoft Word at basic Excel\n- Data Analytics training through TESDA\n- Figma at Canva for beginner-level UI/UX and visual design\n\nMay basic at developing skills siya, kaya hindi ko ie-exaggerate bilang expert ang lahat."
      : "Jay's technical skills include:\n- HTML, CSS, and JavaScript for websites and web-based systems\n- Windows 10/11 installation and configuration\n- Basic computer hardware and printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, and digital record management\n- Basic technical support / help desk\n- Microsoft Word and basic Excel\n- Data Analytics training through TESDA\n- Beginner-level Figma and Canva for UI/UX and visual design\n\nHis skills are at a basic and developing level, so I won't present them as expert-level.";
  }

  // Internship and work experience
  if (
    /\b(psa|internship|ojt|intern experience|work experience|experience ni jay|trabaho ni jay)\b/.test(q)
  ) {
    return tl
      ? "Nag-OJT si Jay bilang IT / Registration Support Intern sa Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office sa City of Ilagan, mula December 2025 hanggang April 2026, total na 486 hours. Kasama sa tasks niya ang PhilSys data entry at verification, document processing, digital records, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, at basic computer/printer support."
      : "Jay completed an internship as an IT / Registration Support Intern at the Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office in City of Ilagan, from December 2025 to April 2026, for a total of 486 hours. His tasks included PhilSys data entry and verification, document processing, digital records management, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, and basic computer and printer support. This was an internship, not permanent employment.";
  }

  // Education
  if (
    /\b(education|educational background|graduate|college|school|degree|kurso|paaralan|what course|anong course)\b/.test(q)
  ) {
    return tl
      ? "BS Information Technology graduate si Jay noong 2026 mula sa Honorato G. Baquiran College, Inc. sa Isabela."
      : "Jay is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. in Isabela.";
  }

  // Career interests
  if (
    /\b(career goal|career objective|looking for work|job|trabaho|anong trabaho|what job|career interests|job interests)\b/.test(q)
  ) {
    return tl
      ? "Naghahanap si Jay ng entry-level opportunities gaya ng IT Support, Data Encoder, at iba pang computer-based roles. Interesado rin siya sa UI/UX design at patuloy na pag-develop ng technical skills."
      : "Jay is looking for entry-level opportunities such as IT Support, Data Encoder, and other computer-based roles. He is also interested in UI/UX design and continues to develop his technical skills.";
  }

  // Design tools
  if (
    /\b(figma|canva|ui.?ux|design skills|graphic design)\b/.test(q)
  ) {
    return tl
      ? "May experience si Jay sa Figma at Canva at interesado siya sa UI/UX design. Beginner pa ang level niya sa design tools, kaya patuloy siyang nagpa-practice at nag-i-improve."
      : "Jay has experience with Figma and Canva and is interested in UI/UX design. His level with design tools is still beginner, and he continues to practice and improve.";
  }

  // Data Analytics
  if (
    /\b(data analytics|tesda|certificate|certification|training)\b/.test(q)
  ) {
    return tl
      ? "May Data Analytics training/certificate si Jay through TESDA. May experience din siya sa data entry, data verification, at digital record management mula sa PSA internship."
      : "Jay has Data Analytics training/certificate through TESDA. He also has experience in data entry, data verification, and digital records management from his PSA internship.";
  }

  // Thanks
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

  // Goodbye
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

  // Unknown questions are handled by Grok.
  return null;
}

// ==========================================
// VIBE FALLBACK
// ==========================================

function getVibeFallback(mode, tl, reason) {
  const limited = reason === "daily_limit" || reason === "ip_limit";

  if (mode === "professional") {
    return tl
      ? `Pasensya na po, hindi ko po masasagot nang detalyado ang tanong na iyan sa ngayon. Matutulungan ko po kayo sa skills, experience, education, at contact details ni Jay. Para po sa mas detalyadong usapan, maaari po ninyo siyang makontak nang direkta:\n\n${contactBlock()}`
      : `I'm sorry, I can't answer that question in detail right now. I can still help with Jay's skills, experience, education, and contact details. For a more detailed discussion, please contact him directly:\n\n${contactBlock()}`;
  }

  if (mode === "playful") {
    if (limited) {
      return randomReply([
        "HAHAHA! 😭 Napagod na ang AI brain ko for today, pero andito pa rin ako! Itanong mo sa'kin ang skills, OJT, education, o social media ni Jay at sasagot ako agad. 😎",
        "AY! 😂 Ubos na ang AI energy ko ngayong araw, parang battery na 1% na lang. 🔋 Pero kaya ko pa rin sagutin ang tungkol sa skills, internship, at education ni Jay! Subukan mo!",
        "CHAROT! 🤣 Nag-power nap muna ang utak ko for today. Pero huwag kang mag-alala, tanungin mo lang ako tungkol sa skills, OJT, o social media ni Jay at kaya ko pa yan! 👀"
      ]);
    }

    return randomReply([
      "HAHAHA! 😭 Nag-lag ang utak ko saglit, parang Wi-Fi sa tabi ng microwave. 📶 Subukan mo ulit mamaya, o itanong mo muna ang skills, OJT, o education ni Jay!",
      "AY SHET HAHAHA! 😂 Na-blanko ako bigla, parang nakalimutan ang assignment. Tanong ka ulit mamaya, o itanong mo muna ang tungkol sa skills at internship ni Jay! 😎",
      "Uy sorry! 😅 Na-seen-zone ako ng server saglit. Subukan mo ulit mamaya, o itanong mo muna kung ano ang skills o social media ni Jay!"
    ]);
  }

  return tl
    ? "Pasensya na, hindi ko masasagot nang maayos ang tanong na iyan sa ngayon. Subukan mo ulit mamaya, o itanong mo muna ang tungkol sa skills, internship, education, o social media ni Jay at masasagot ko agad. 😊"
    : "Sorry, I can't answer that properly right now. Please try again later, or ask me about Jay's skills, internship, education, or social media and I can answer right away. 😊";
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

// Answer cache
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

// Per-IP daily Grok limit
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

// Filler messages answered locally
const FILLER_RE =
  /^(ok|okay|okey|k|sige|ge|ah+|oh+|hm+|hmm+|wow|nice|cool|galing|talaga|really|weh|haha+|hehe+|hihi+|lol|wala|ayos|aww+|i see|got it)( po| na| lang)?$/;

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

// Token savers
const GROK_HISTORY_LIMIT = 4;
const GROK_HISTORY_CHARS = 600;
const GROK_MAX_TOKENS = 400;

const BREVITY_RULE =
  "\nKeep replies concise (about 100 words or less) unless the visitor asks for details.";

// ==========================================
// GROK CONFIGURATION
// ==========================================

const GROK_API_KEY =
  process.env.GROK_API_KEY || process.env.XAI_API_KEY;

const MODELS = ["grok-4.7"];
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
    grokDailyLimit: GROK_DAILY_LIMIT,
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

    // 1. Local answers: no Grok API usage.
    const localAnswer = getLocalAnswer(cleanMessage, history);

    if (localAnswer) {
      return res.json({
        answer: localAnswer,
        source: "local",
        mode
      });
    }

    // 2. Filler messages: no Grok API usage.
    const fillerAnswer = getFillerAnswer(normalizedMessage, mode, tagalog);

    if (fillerAnswer) {
      return res.json({
        answer: fillerAnswer,
        source: "local",
        mode
      });
    }

    // 3. Cache: first questions only, non-playful mode.
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

    // 4. Global daily limit.
    if (getRemainingGrokAttempts() <= 0) {
      return respondFallback(res, mode, tagalog, "daily_limit");
    }

    // 5. Per-IP daily limit.
    const ipUsage = getIpGrokUsage(req.ip);

    if (ipUsage.attempts >= GROK_PER_IP_DAILY_LIMIT) {
      return respondFallback(res, mode, tagalog, "ip_limit");
    }

    // Build conversation history for Grok.
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

    const temperature = mode === "professional" ? 0.4 : 0.7;

    let lastError = "No model returned a response.";
    let lastStatus = 0;

    for (const model of MODELS) {
      const usage = getDailyUsage();

      if (usage.attempts >= GROK_DAILY_LIMIT) {
        return respondFallback(res, mode, tagalog, "daily_limit");
      }

      // Count every Grok API request.
      usage.attempts++;
      ipUsage.attempts++;

      console.log(
        `Grok API attempt ${usage.attempts}/${GROK_DAILY_LIMIT} using ${model} (mode: ${mode})`
      );

      try {
        const response = await fetch(
          "https://api.x.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${GROK_API_KEY}`,
              "x-grok-conv-id": "jay-portfolio-chatbot"
            },
            body: JSON.stringify({
              model,
              messages,
              temperature,
              max_tokens: GROK_MAX_TOKENS
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

        const content = data.choices?.[0]?.message?.content;

        let answer = "";

        if (typeof content === "string") {
          answer = content.trim();
        } else if (Array.isArray(content)) {
          answer = content
            .map(part => {
              if (typeof part === "string") return part;
              return part?.text || "";
            })
            .join("")
            .trim();
        }

        if (answer) {
          console.log("Chat answered using model:", model);

          if (canCache) setCachedAnswer(cacheKey, answer);

          return res.json({
            answer,
            source: "grok",
            mode
          });
        }

        lastStatus = response.status;
        lastError = "Grok returned no text.";

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

    // 6. Grok failed: use local fallback.
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

    return res.status(502).json({
      error: error.message || "Unexpected chatbot server error."
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
  console.log(`Grok daily API attempt limit: ${GROK_DAILY_LIMIT}`);
  console.log(`Grok per-IP daily limit: ${GROK_PER_IP_DAILY_LIMIT}`);
  console.log(`Daily counter resets at midnight ${PHILIPPINE_TIME_ZONE}.`);
});
