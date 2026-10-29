require("dotenv").config({
  path: require("path").join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

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

// Rate limit: 20 requests per IP per minute.
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
// GLOBAL GEMINI DAILY LIMIT
// ==========================================

// Maximum of 200 Gemini API attempts per day.
// Counts every model request, including failed requests.
// Resets at midnight Philippine time (Asia/Manila).
const GEMINI_DAILY_LIMIT = 200;
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

let geminiDailyUsage = {
  date: getPhilippineDateKey(),
  attempts: 0
};

function getDailyUsage() {
  const today = getPhilippineDateKey();

  // Reset automatically when the Philippine calendar day changes.
  if (geminiDailyUsage.date !== today) {
    geminiDailyUsage = {
      date: today,
      attempts: 0
    };

    console.log("Gemini daily usage counter reset:", today);
  }

  return geminiDailyUsage;
}

function getRemainingGeminiAttempts() {
  const usage = getDailyUsage();

  return Math.max(0, GEMINI_DAILY_LIMIT - usage.attempts);
}

function geminiDailyLimitReached(res) {
  const usage = getDailyUsage();

  return res.status(429).json({
    error:
      "Naabot na ang daily Gemini limit na 200 API attempts. " +
      "Subukan ulit bukas. Gagana pa rin ang common questions, " +
      "profile answers, social media links, at hugot requests na local replies.",
    source: "daily_limit",
    dailyLimit: GEMINI_DAILY_LIMIT,
    attemptsUsed: usage.attempts,
    attemptsRemaining: 0,
    resetTimeZone: PHILIPPINE_TIME_ZONE
  });
}

// Periodically reset the counter if the date has changed.
// This timer does not keep Node.js running by itself.
setInterval(() => {
  getDailyUsage();
}, 60 * 1000).unref();

// ==========================================
// PROFILE AND LOCAL REPLIES
// ==========================================

const FACEBOOK_URL = "https://www.facebook.com/chris.tian.727095/";
const INSTAGRAM_URL = "https://www.instagram.com/christian21217/";

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

SOCIAL MEDIA:
- Facebook: ${FACEBOOK_URL}
- Instagram: ${INSTAGRAM_URL}
- If asked for Jay's Facebook, FB, Instagram, IG, or social media accounts,
  provide the exact links above.
- These are Jay's accounts, not the crush's accounts.
- Harmless jokes about following his profile are okay.

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
// CONVERSATION MODE (TONE DETECTION)
// ==========================================

// "professional" = job offers, hiring, interviews, salary, contact requests.
// "playful"      = the visitor is joking / casual / using hugot or banat.
// "neutral"      = everything else (friendly, light).

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

// Common Filipino words used to detect the visitor's language.
const TAGALOG_WORDS = new Set([
  "po", "opo", "ba", "ang", "ng", "mga", "si", "ni", "kay", "nya", "niya",
  "mo", "ko", "ako", "ikaw", "siya", "sya", "kami", "tayo", "pwede", "puwede",
  "meron", "wala", "ano", "saan", "sino", "paano", "bakit", "kailan",
  "naghahanap", "gusto", "namin", "natin", "salamat", "kumusta", "kamusta",
  "magandang", "taga", "nga", "naman", "lang", "yung", "yun", "ito", "dito",
  "hindi", "oo", "sige", "mag", "nag", "pa", "na", "kayo", "kita", "tayo",
  "trabaho", "sweldo", "sahod", "alok", "kumpanya", "ilang", "gaano"
]);

function isTagalog(q) {
  return q.split(" ").some(word => TAGALOG_WORDS.has(word));
}

function isPlayful(message, q) {
  return PLAYFUL_RE.test(q) || PLAYFUL_EMOJI_RE.test(message);
}

function detectMode(message, q, history = []) {
  // 1. The latest message itself is a professional inquiry.
  if (PRO_RE.test(q)) return "professional";

  // 2. The visitor is clearly joking around right now.
  if (isPlayful(message, q)) return "playful";

  // 3. A professional conversation stays professional for a few turns.
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
  background, and invite them to contact Jay directly through the Facebook and
  Instagram links above. Ask for the position, company, location, and schedule.
- Never invent salary, availability, start dates, email addresses, phone numbers,
  or commitments. Say Jay will discuss those details directly.
- ${languageRule}
`;
  }

  if (mode === "playful") {
    return `
CURRENT CONVERSATION MODE: PLAYFUL
- The visitor is joking or being casual. Match their energy with friendly humor.
- Keep jokes kind and never repeat the previous joke.
- Still stay accurate about Jay's profile.
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
  return `Facebook: ${FACEBOOK_URL}\nInstagram: ${INSTAGRAM_URL}`;
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
      ? `Maaari po ninyong makontak si Jay sa mga account na ito:\n\n${contactBlock()}\n\nWala po akong ibang contact details na maibibigay mula rito.`
      : `You can reach Jay through the accounts below:\n\n${contactBlock()}\n\nI don't have other contact details to share here.`;
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

function getLocalAnswer(message, history = []) {
  const q = normalizeMessage(message);
  const mode = detectMode(message, q, history);
  const pro = mode === "professional";
  const tl = isTagalog(q);

  // Professional inquiries (job offers, hiring, interviews, contact, salary)
  // are handled first so they never fall into jokes or generic job replies.
  if (pro && PRO_RE.test(q)) {
    return getProfessionalAnswer(q, tl);
  }

  // Follow-up reactions must be checked BEFORE generic crush keywords.
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

  // Explicit hugot / banat requests.
  if (
    /\b(hugot|hugot lines|banat|patama lines|hugot naman|may hugot ka|hugot nga)\b/.test(q)
  ) {
    if (pro) return proDeflect(tl);

    return randomReply(HUGOT_LINES);
  }

  // Specific questions about who the crush is.
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

  // Greetings.
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

  // Social media requests.
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

  // Location.
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

  // Introduction.
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

  // Relationship status.
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

  // Picture-related questions.
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

  // Only answer chance questions when the visitor asks about chances.
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

  // Personality.
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

  // Web development.
  if (
    /\b(html|css|javascript|web development|web developer|build a system|building systems|gumawa ng system|gumawa ng website|website development|coding|programming skills)\b/.test(q)
  ) {
    return tl
      ? "Marunong si Jay gumamit ng HTML, CSS, at JavaScript para gumawa ng websites at web-based systems. May experience din siya sa basic IT support, data entry/verification, at Figma/Canva. Hindi ko siya tatawaging expert sa ibang technologies kung hindi confirmed."
      : "Jay can use HTML, CSS, and JavaScript to build websites and web-based systems. He also has experience in basic IT support, data entry and verification, and Figma/Canva. I won't describe him as an expert in other technologies unless that is confirmed.";
  }

  // Technical skills.
  if (
    /\b(skill|skills|technical skills|technical skill|kakayahan|ano ang alam ni jay|what can jay do)\b/.test(q)
  ) {
    return tl
      ? "Technical skills ni Jay include:\n- HTML, CSS, at JavaScript for websites and web-based systems\n- Windows 10/11 installation and configuration\n- Basic computer hardware at printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, at digital record management\n- Basic technical support/help desk\n- Microsoft Word at basic Excel\n- Data Analytics training through TESDA\n- Figma at Canva for beginner-level UI/UX and visual design\n\nMay basic at developing skills siya, kaya hindi ko ie-exaggerate bilang expert ang lahat."
      : "Jay's technical skills include:\n- HTML, CSS, and JavaScript for websites and web-based systems\n- Windows 10/11 installation and configuration\n- Basic computer hardware and printer troubleshooting\n- Basic LAN/Wi-Fi troubleshooting\n- Data entry, verification, and digital record management\n- Basic technical support / help desk\n- Microsoft Word and basic Excel\n- Data Analytics training through TESDA\n- Beginner-level Figma and Canva for UI/UX and visual design\n\nHis skills are at a basic and developing level, so I won't present them as expert-level.";
  }

  // Internship and work experience.
  if (
    /\b(psa|internship|ojt|intern experience|work experience|experience ni jay|trabaho ni jay)\b/.test(q)
  ) {
    return tl
      ? "Nag-OJT si Jay bilang IT / Registration Support Intern sa Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office sa City of Ilagan, mula December 2025 hanggang April 2026, total na 486 hours. Kasama sa tasks niya ang PhilSys data entry at verification, document processing, digital records, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, at basic computer/printer support."
      : "Jay completed an internship as an IT / Registration Support Intern at the Philippine Statistics Authority (PSA), Isabela Provincial Statistical Office in City of Ilagan, from December 2025 to April 2026, for a total of 486 hours. His tasks included PhilSys data entry and verification, document processing, digital records management, NAS uploads, temporary PhilSys ID processing, FindMyTRN checks, and basic computer and printer support. This was an internship, not permanent employment.";
  }

  // Education.
  if (
    /\b(education|educational background|graduate|college|school|degree|kurso|paaralan|what course|anong course)\b/.test(q)
  ) {
    return tl
      ? "BS Information Technology graduate si Jay noong 2026 mula sa Honorato G. Baquiran College, Inc. sa Isabela."
      : "Jay is a BS Information Technology graduate (2026) from Honorato G. Baquiran College, Inc. in Isabela.";
  }

  // Career interests.
  if (
    /\b(career goal|career objective|looking for work|job|trabaho|anong trabaho|what job|career interests|job interests)\b/.test(q)
  ) {
    return tl
      ? "Naghahanap si Jay ng entry-level opportunities gaya ng IT Support, Data Encoder, at iba pang computer-based roles. Interesado rin siya sa UI/UX design at patuloy na pag-develop ng technical skills."
      : "Jay is looking for entry-level opportunities such as IT Support, Data Encoder, and other computer-based roles. He is also interested in UI/UX design and continues to develop his technical skills.";
  }

  // Design tools.
  if (
    /\b(figma|canva|ui.?ux|design skills|graphic design)\b/.test(q)
  ) {
    return tl
      ? "May experience si Jay sa Figma at Canva at interesado siya sa UI/UX design. Beginner pa ang level niya sa design tools, kaya patuloy siyang nagpa-practice at nag-i-improve."
      : "Jay has experience with Figma and Canva and is interested in UI/UX design. His level with design tools is still beginner, and he continues to practice and improve.";
  }

  // Data Analytics.
  if (
    /\b(data analytics|tesda|certificate|certification|training)\b/.test(q)
  ) {
    return tl
      ? "May Data Analytics training/certificate si Jay through TESDA. May experience din siya sa data entry, data verification, at digital record management mula sa PSA internship."
      : "Jay has Data Analytics training/certificate through TESDA. He also has experience in data entry, data verification, and digital records management from his PSA internship.";
  }

  // Thanks.
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

  // Goodbye.
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

  // Other casual questions go to Gemini.
  return null;
}

// ==========================================
// GEMINI CONFIGURATION
// ==========================================

// Keep existing configured model IDs.
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash"
];

const GEMINI_TIMEOUT_MS = 60000;

// ==========================================
// API ENDPOINTS
// ==========================================

// Root endpoint.
app.get("/", (req, res) => {
  res.json({
    message: "Jay's portfolio chatbot API is running."
  });
});

// Health check.
app.get("/health", (req, res) => {
  const usage = getDailyUsage();

  res.json({
    status: "ok",
    message: "Chatbot server is running.",
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    geminiDailyLimit: GEMINI_DAILY_LIMIT,
    geminiAttemptsUsed: usage.attempts,
    geminiAttemptsRemaining: getRemainingGeminiAttempts(),
    resetTimeZone: PHILIPPINE_TIME_ZONE
  });
});

// Show configured models.
app.get("/models", (req, res) => {
  res.json({ models: MODELS });
});

// Chat endpoint.
app.post("/chat", rateLimit, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const cleanMessage = message.trim().slice(0, 1500);

    // Detect tone/language from the visitor's latest message and recent history.
    const normalizedMessage = normalizeMessage(cleanMessage);
    const mode = detectMode(cleanMessage, normalizedMessage, history);
    const tagalog = isTagalog(normalizedMessage);

    // Local replies do not consume Gemini quota or daily attempts.
    const localAnswer = getLocalAnswer(cleanMessage, history);

    if (localAnswer) {
      return res.json({
        answer: localAnswer,
        source: "local",
        mode
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Missing Gemini API key. Check the .env file or the host's environment variables."
      });
    }

    // Check the daily limit before starting any Gemini API request.
    if (getRemainingGeminiAttempts() <= 0) {
      return geminiDailyLimitReached(res);
    }

    const contents = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        if (
          item &&
          ["user", "model"].includes(item.role) &&
          typeof item.text === "string" &&
          item.text.trim()
        ) {
          contents.push({
            role: item.role,
            parts: [{
              text: item.text.trim().slice(0, 1200)
            }]
          });
        }
      }
    }

    // Gemini conversations must start with a user turn.
    while (contents.length && contents[0].role !== "user") {
      contents.shift();
    }

    contents.push({
      role: "user",
      parts: [{ text: cleanMessage }]
    });

    // Base prompt + tone/language rules for this specific conversation.
    const systemInstructionText =
      SYSTEM_PROMPT + "\n" + buildModeInstruction(mode, tagalog);

    // Professional replies should be steadier and less random.
    const temperature = mode === "professional" ? 0.4 : 0.9;

    let lastError = "No model returned a response.";
    let lastStatus = 0;

    for (const model of MODELS) {
      // Count each individual API attempt, including failed attempts.
      const usage = getDailyUsage();

      if (usage.attempts >= GEMINI_DAILY_LIMIT) {
        return geminiDailyLimitReached(res);
      }

      usage.attempts++;

      console.log(
        `Gemini API attempt ${usage.attempts}/${GEMINI_DAILY_LIMIT} using ${model} (mode: ${mode})`
      );

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemInstructionText }]
              },
              contents,
              generationConfig: {
                temperature,
                maxOutputTokens: 400
              }
            }),
            signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS)
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          lastStatus = response.status;
          lastError = data.error?.message || `HTTP ${response.status}`;

          console.error(
            `Gemini ${model} error (${response.status}):`,
            lastError
          );

          continue;
        }

        const answer = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

        if (answer) {
          console.log("Chat answered using model:", model);

          return res.json({
            answer,
            source: "gemini",
            mode
          });
        }

        lastStatus = response.status;
        lastError = data.promptFeedback?.blockReason
          ? `Request blocked: ${data.promptFeedback.blockReason}`
          : "Gemini returned no text.";

        console.error(`Gemini ${model}:`, lastError);
      } catch (error) {
        lastError = error.message || "Unknown connection error";
        lastStatus = 0;

        console.error(
          `Gemini connection error (${model}):`,
          lastError
        );
      }
    }

    // If the last attempt used up the daily allowance, report the cap.
    if (getRemainingGeminiAttempts() <= 0) {
      return geminiDailyLimitReached(res);
    }

    if (
      lastStatus === 429 ||
      /quota|rate limit|resource exhausted/i.test(lastError)
    ) {
      return res.status(429).json({
        error: "Naabot na yata ang Gemini free-tier limit ngayon. Subukan ulit mamaya. Ang common questions at hugot requests ay masasagot pa rin ng chatbot kahit walang Gemini call.",
        source: "gemini_limit"
      });
    }

    return res.status(502).json({
      error: `No available model returned a response. ${lastError}`
    });
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
  console.log(
    "Gemini API key configured:",
    Boolean(process.env.GEMINI_API_KEY)
  );
  console.log(`Gemini daily API attempt limit: ${GEMINI_DAILY_LIMIT}`);
  console.log(`Daily counter resets at midnight ${PHILIPPINE_TIME_ZONE}.`);
});