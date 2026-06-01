const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const STATE_PATH = path.join(DATA_DIR, "inventory-state.json");
const OUTPUT_PATH = path.join(DATA_DIR, "perfume-research.json");

const DEFAULT_DELAY_MS = 750;

const BRAND_ALIASES = [
  "Maison Francis Kurkdjian",
  "Parfums de Marly",
  "Jean Paul Gaultier",
  "Carolina Herrera",
  "Sol de Janeiro",
  "Swiss Arabian",
  "Paris Corner",
  "French Avenue",
  "Maison Alhambra",
  "Al Haramain",
  "Ard Al Zaafaran",
  "Ahmed Al Maghribi",
  "Fragrance World",
  "Scent Beauty",
  "Hugo Boss",
  "Dolce&Gabbana",
  "Viktor&Rolf",
  "Jo Milano",
  "Jo Malone",
  "BellaVita Luxury",
  "Lattafa Perfumes",
  "Lattafa",
  "Asdaaf",
  "Armaf",
  "Rasasi",
  "Dossier",
  "Bharara",
  "Afnan",
  "Al-Rehab",
  "Byredo",
  "Davidoff",
  "Philosophy",
  "Orientica",
  "Azzaro",
  "Dumont",
  "Paco Rabanne",
  "Khadlaj",
  "Xerjoff",
  "Kayali",
  "Billie Eilish",
  "Clinique",
  "Hersh",
  "Oushang",
  "Bond 9",
  "Creed",
  "Amouage"
];

const ACCORD_KEYWORDS = [
  ["vanilla", ["vanilla", "vanille"]],
  ["citrus", ["orange", "bergamot", "lemon", "mandarin", "tangerine", "grapefruit", "yuzu", "citrus", "lime"]],
  ["fruity", ["fruit", "fruity", "apple", "pear", "peach", "mango", "pineapple", "coconut", "lychee", "litchi", "banana", "cherry", "berry", "black currant", "passionfruit"]],
  ["sweet", ["sweet", "sugar", "candy", "caramel", "praline", "honey", "toffee", "marshmallow", "creme brulee", "chocolate", "cacao", "milk", "cream", "cookie"]],
  ["amber", ["amber", "amberwood", "benzoin", "labdanum", "resin"]],
  ["woody", ["wood", "woods", "cedar", "sandalwood", "cashmeran", "vetiver", "oakmoss", "moss", "patchouli"]],
  ["musky", ["musk", "musky"]],
  ["floral", ["flower", "floral", "jasmine", "rose", "orange blossom", "tuberose", "iris", "lavender", "violet", "peony", "orchid", "ylang"]],
  ["spicy", ["pepper", "cinnamon", "cardamom", "nutmeg", "ginger", "saffron", "spice", "spicy", "turmeric", "pimento"]],
  ["oud", ["oud", "oudh", "agarwood"]],
  ["aquatic", ["water", "marine", "aqua", "aquatic", "ozonic"]],
  ["green", ["green", "tea", "mint", "herbal", "leaf", "grass"]],
  ["smoky", ["smoke", "smoky", "incense", "tobacco"]],
  ["leather", ["leather", "suede"]],
  ["powdery", ["powder", "powdery"]]
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripHtml(value) {
  return normalizeText(htmlDecode(String(value || "").replace(/<[^>]*>/g, " ")));
}

function cleanSearchName(value) {
  return normalizeText(value)
    .replace(/\b(3\.?4\s*(fl\.?\s*)?oz|100\s*ml|3\.40\s*ounce)\b/gi, "")
    .replace(/\b(eau\s+de\s+parfum|eau\s+de\s+toilette|edp|edt|extrait\s+de\s+parfum|spray|perfume|cologne)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tidyDisplayName(value) {
  return cleanSearchName(value)
    .replace(/\bfor\s+(women|men)\s*(?:&|and)\s*(women|men)\b/gi, "")
    .replace(/\bfor\s+(women|men|unisex|her|him)\b/gi, "")
    .replace(/\b(?:women|men)\s*(?:&|and)\s*(?:women|men)\b/gi, "")
    .replace(/\b(women'?s|men'?s|fragrance)\b/gi, "")
    .replace(/\s*[-|,]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function inferBrand(productName) {
  const lower = normalizeText(productName).toLowerCase();
  const brand = BRAND_ALIASES.find((item) => lower.includes(item.toLowerCase()));
  if (brand === "Lattafa") return "Lattafa Perfumes";
  if (brand) return brand;
  return normalizeText(productName).split(/\s+/).slice(0, 2).join(" ") || "SourceFlow Supplier";
}

function normalizeGender(value) {
  const text = normalizeText(value).toLowerCase();
  if (/women\s+and\s+men|men\s+and\s+women|unisex|homme et femme|hombre y mujer/i.test(text)) return "Unisex";
  if (/\bwomen?\b|for her|feminine/i.test(text)) return "Women";
  if (/\bmen?\b|for him|masculine/i.test(text)) return "Men";
  return "Unisex";
}

function inferGenderFromName(productName) {
  const text = normalizeText(productName).toLowerCase();
  if (/\b(women|woman|her)\b.*\b(men|man|him)\b|\b(men|man|him)\b.*\b(women|woman|her)\b/.test(text)) return "Unisex";
  return normalizeGender(text);
}

function inferConcentration(productName) {
  if (/extrait\s+de\s+parfum|pure\s+perfume/i.test(productName)) return "Extrait de Parfum";
  if (/eau\s+de\s+parfum|\bedp\b/i.test(productName)) return "Eau de Parfum";
  if (/eau\s+de\s+toilette|\bedt\b/i.test(productName)) return "Eau de Toilette";
  if (/cologne/i.test(productName)) return "Cologne";
  if (/\bparfum\b/i.test(productName)) return "Parfum";
  return "Eau de Parfum";
}

function parseDuckDuckGoResults(html) {
  const anchors = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  return anchors.map((match, index) => {
    const nextIndex = anchors[index + 1]?.index ?? html.length;
    const block = html.slice(match.index, nextIndex);
    const snippet = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const rawUrl = htmlDecode(match[1]);
    const decoded = rawUrl.match(/[?&]uddg=([^&]+)/) ? decodeURIComponent(rawUrl.match(/[?&]uddg=([^&]+)/)[1]) : rawUrl;
    return {
      title: stripHtml(match[2]),
      url: decoded,
      snippet: snippet ? stripHtml(snippet[1]) : ""
    };
  });
}

function parseYahooResults(html) {
  const results = [];
  for (const match of html.matchAll(/<li class="[^"]*\balgo\b[^"]*"[\s\S]*?<\/li>/g)) {
    const block = match[0];
    const anchor = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;
    const text = stripHtml(block);
    const title = stripHtml(anchor[2]);
    const url = htmlDecode(anchor[1]);
    const titleIndex = text.indexOf(title);
    const snippet = titleIndex >= 0 ? normalizeText(text.slice(titleIndex + title.length)) : text;
    results.push({
      title,
      url,
      snippet
    });
  }
  return results;
}

function productTokens(productName) {
  const stop = new Set(["for", "men", "women", "unisex", "eau", "de", "parfum", "spray", "perfume", "the", "and", "with"]);
  return cleanSearchName(productName)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stop.has(token));
}

function scoreResult(result, productName) {
  const url = result.url.toLowerCase();
  const haystack = `${result.title} ${result.snippet}`.toLowerCase();
  let score = 0;
  if (/fragrantica\.[a-z.]+\/perfume\//.test(url)) score += 60;
  if (/fragrantica\.com\/perfume\//.test(url)) score += 15;
  if (/parfumo\.com\/perfumes\//.test(url)) score += 35;
  if (/amazon|ebay|walmart|tiktok|youtube/.test(url)) score -= 25;
  for (const token of productTokens(productName)) {
    if (haystack.includes(token)) score += 3;
  }
  if (/top notes?|middle notes?|base notes?|launched in|perfume rating/i.test(result.snippet)) score += 25;
  return score;
}

async function searchWeb(query) {
  let lastError = null;
  try {
    const yahooResults = await searchYahoo(query);
    if (yahooResults.length) return yahooResults;
  } catch (error) {
    lastError = error;
  }

  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
      }
      return parseDuckDuckGoResults(await response.text());
    } catch (error) {
      lastError = error;
      await sleep(500 * (attempt + 1));
    }
  }
  return searchBing(query, lastError);
}

async function searchYahoo(query) {
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36"
    }
  });
  if (!response.ok) {
    throw new Error(`Yahoo returned HTTP ${response.status}`);
  }
  return parseYahooResults(await response.text());
}

async function searchBing(query, lastError) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36"
      }
    });
    if (!response.ok) {
      throw new Error(`Bing returned HTTP ${response.status}`);
    }
    const html = await response.text();
    const results = [];
    for (const match of html.matchAll(/<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g)) {
      results.push({
        title: stripHtml(match[2]),
        url: htmlDecode(match[1]),
        snippet: stripHtml(match[3])
      });
    }
    return results;
  } catch (error) {
    throw new Error(`${lastError?.message || "DuckDuckGo failed"}; ${error.message}`);
  }
}

function extractFragranticaId(url) {
  return url.match(/-(\d+)\.html/i)?.[1] || null;
}

function extractFamilyAndGender(text, fallbackGender) {
  const match = text.match(/is an?\s+(.+?)\s+fragrance\s+for\s+([^.]+?)(?:\.|,|;|$)/i);
  if (!match) return { family: "Fragrance", gender: fallbackGender };
  const family = normalizeText(match[1]).replace(/\bgroup\b/i, "") || "Fragrance";
  return {
    family: family.replace(/\bmen'?s\b|\bwomen'?s\b/gi, "").trim() || "Fragrance",
    gender: normalizeGender(match[2])
  };
}

function splitNotes(value) {
  return normalizeText(value)
    .replace(/\.$/, "")
    .split(/\s*,\s*|\s+and\s+/i)
    .map((item) => normalizeText(item).replace(/^notes?\s+/i, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function extractNoteList(text, labelPattern) {
  const pattern = new RegExp(`${labelPattern} notes? (?:are|is) ([^.;]+)`, "i");
  const match = text.match(pattern);
  return match ? splitNotes(match[1]) : [];
}

function extractNotes(text) {
  return {
    top: extractNoteList(text, "top"),
    middle: extractNoteList(text, "(?:middle|heart)"),
    base: extractNoteList(text, "base")
  };
}

function extractLaunchYear(text) {
  const match = text.match(/(?:was\s+)?launched(?:\s+in)?\s+(\d{4})/i);
  return match ? Number(match[1]) : null;
}

function extractRating(text) {
  const match = text.match(/Perfume rating\s+([\d.]+)\s+out of\s+5\s+with\s+([\d,]+)/i);
  if (!match) return null;
  return {
    source: "Fragrantica",
    rating: Number(match[1]),
    ratingScale: 5,
    voteCount: Number(match[2].replace(/,/g, "")),
    reviewCountLabel: null
  };
}

function inferAccords({ family, notes, productName }) {
  const text = [family, productName, ...notes.top, ...notes.middle, ...notes.base].join(" ").toLowerCase();
  const accords = ACCORD_KEYWORDS.filter(([, words]) => words.some((word) => text.includes(word))).map(([accord]) => accord);
  if (/aromatic/i.test(family)) accords.unshift("aromatic");
  if (/gourmand/i.test(family)) accords.unshift("gourmand");
  if (/oriental|amber/i.test(family)) accords.unshift("amber");
  if (/floral/i.test(family)) accords.unshift("floral");
  if (/woody/i.test(family)) accords.unshift("woody");
  if (!accords.length) accords.push("fragrance");
  return [...new Set(accords)].slice(0, 8);
}

function makeAngle(notes, family, accords) {
  if (notes.top.length || notes.middle.length || notes.base.length) {
    const parts = [];
    if (notes.top.length) parts.push(`${notes.top.slice(0, 3).join(", ")} opening`);
    if (notes.middle.length) parts.push(`${notes.middle.slice(0, 3).join(", ")} heart`);
    if (notes.base.length) parts.push(`${notes.base.slice(0, 3).join(", ")} base`);
    return parts.join(" with ");
  }
  return `${accords.filter((item) => item !== "fragrance").slice(0, 4).join(", ") || family.toLowerCase()} profile`;
}

function sourceImage(result) {
  const id = extractFragranticaId(result.url);
  if (!id) return null;
  return {
    url: `https://fimgs.net/mdimg/perfume-thumbs/375x500.${id}.jpg`,
    thumbUrl: `https://fimgs.net/mdimg/perfume-thumbs/375x500.${id}.jpg`,
    source: "Fragrantica",
    alt: result.title,
    confidence: "medium",
    usage: "reference"
  };
}

function buildContent(product, result, combinedText, confidence, status) {
  const brand = inferBrand(product.perfumeName);
  const displayName = tidyDisplayName(product.perfumeName) || product.perfumeName;
  const fallbackGender = inferGenderFromName(product.perfumeName);
  const { family, gender } = extractFamilyAndGender(combinedText, fallbackGender);
  const notes = extractNotes(combinedText);
  const launchYear = extractLaunchYear(combinedText);
  const accords = inferAccords({ family, notes, productName: product.perfumeName });
  const rating = extractRating(combinedText);
  const image = result ? sourceImage(result) : null;
  const sourceLinks = result
    ? [
        {
          label: result.url.includes("fragrantica") ? "Fragrantica product page" : "Research source",
          url: result.url
        }
      ]
    : [];

  if (rating && sourceLinks[0]) rating.sourceUrl = sourceLinks[0].url;

  return {
    brand,
    displayName,
    gender,
    launchYear,
    family,
    concentration: inferConcentration(product.perfumeName),
    accords,
    top: notes.top,
    middle: notes.middle,
    base: notes.base,
    angle: makeAngle(notes, family, accords),
    dataConfidence: confidence,
    researchStatus: status,
    reviewNote:
      status === "researched"
        ? "Perfume facts were extracted from public search result snippets pointing to perfume database pages. Review before making regulated marketplace claims."
        : "No reliable perfume database snippet was found automatically. This SKU needs manual review.",
    community: {
      stats: rating,
      gallery: [image, product.image].filter(Boolean),
      reviewInsights: {
        source: result?.url?.includes("fragrantica") ? "Fragrantica search result signals" : "Perfume research signals",
        summary:
          status === "researched"
            ? `${displayName} is presented in perfume database search signals as a ${family.toLowerCase()} profile for ${gender.toLowerCase()} buyers. The extracted note pyramid and source link are stored for ecommerce listing review.`
            : `${displayName} still needs manual perfume-database research before final marketplace publishing.`,
        likedFor: notes.top.length || notes.middle.length || notes.base.length
          ? [
              notes.top.length ? `${notes.top.slice(0, 3).join(", ")} opening` : null,
              notes.middle.length ? `${notes.middle.slice(0, 3).join(", ")} heart` : null,
              notes.base.length ? `${notes.base.slice(0, 3).join(", ")} drydown` : null
            ].filter(Boolean)
          : ["wholesale SKU with supplier image and inventory available"],
        watchouts: [
          "confirm official claims and final image rights before marketplace upload",
          "community-uploaded photos require permission before commercial reuse",
          confidence === "low" ? "automatic match is low confidence and should be reviewed manually" : null
        ].filter(Boolean),
        merchandisingAngles: [
          `${brand} wholesale SKU`,
          `${family} fragrance profile`,
          `${gender} audience positioning`,
          "one-piece dropshipping ready"
        ],
        reviewSampleSizeLabel: rating?.voteCount ? `${rating.voteCount} Fragrantica votes` : "review volume not extracted",
        sourceUrl: sourceLinks[0]?.url || null
      },
      recommendations: [],
      sourceLinks,
      photoResearchLinks: result
        ? [
            {
              label: "Image and user photo research",
              url: result.url
            },
            {
              label: "Google Images research",
              url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${displayName} perfume review photos`)}`
            }
          ]
        : [
            {
              label: "Manual Google research",
              url: `https://www.google.com/search?q=${encodeURIComponent(`${displayName} perfume notes Fragrantica`)}`
            }
          ],
      usageNotice:
        "Use database and community images as research references only unless image rights are verified for ecommerce listing."
    }
  };
}

async function researchProduct(product) {
  const queryBase = cleanSearchName(product.perfumeName);
  const queries = [
    `${queryBase} Fragrantica notes rating`,
    `${queryBase} perfume notes Fragrantica`
  ];
  const seen = new Set();
  const allResults = [];
  for (const query of queries) {
    const results = await searchWeb(query);
    for (const result of results) {
      const key = result.url;
      if (!seen.has(key)) {
        seen.add(key);
        allResults.push({ ...result, query });
      }
    }
    if (allResults.some((result) => scoreResult(result, product.perfumeName) >= 80 && /top notes?|launched in/i.test(result.snippet))) {
      break;
    }
    await sleep(150);
  }
  const ranked = allResults
    .map((result) => ({ ...result, score: scoreResult(result, product.perfumeName) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0] || null;
  const combinedText = best ? `${best.title}. ${best.snippet}` : "";
  const notes = extractNotes(combinedText);
  const hasNotes = notes.top.length || notes.middle.length || notes.base.length;
  const isPerfumeDb = best && /fragrantica\.[a-z.]+\/perfume\/|parfumo\.com\/Perfumes\//i.test(best.url);
  const confidence = isPerfumeDb && hasNotes ? "medium" : isPerfumeDb ? "low" : "low";
  const status = isPerfumeDb ? "researched" : "needs-manual-review";

  return {
    sku: product.sku,
    sourceProductName: product.perfumeName,
    researchedAt: new Date().toISOString(),
    bestMatch: best
      ? {
          title: best.title,
          url: best.url,
          query: best.query,
          score: best.score,
          snippet: best.snippet
        }
      : null,
    candidates: ranked.slice(0, 5).map((result) => ({
      title: result.title,
      url: result.url,
      query: result.query,
      score: result.score,
      snippet: result.snippet
    })),
    content: buildContent(product, best, combinedText, confidence, status)
  };
}

function parseArgs(argv) {
  const args = {
    limit: null,
    offset: 0,
    delayMs: DEFAULT_DELAY_MS,
    force: false,
    onlyMissing: false
  };
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length));
    if (arg.startsWith("--offset=")) args.offset = Number(arg.slice("--offset=".length));
    if (arg.startsWith("--delay=")) args.delayMs = Number(arg.slice("--delay=".length));
    if (arg === "--force") args.force = true;
    if (arg === "--only-missing") args.onlyMissing = true;
  }
  return args;
}

function loadExisting() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    return { version: 1, generatedAt: null, totalProducts: 0, researchedProducts: 0, items: {} };
  }
  return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
}

function saveResearch(payload) {
  ensureDir(DATA_DIR);
  payload.generatedAt = new Date().toISOString();
  payload.researchedProducts = Object.keys(payload.items || {}).length;
  const body = JSON.stringify(payload, null, 2);
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const tempPath = `${OUTPUT_PATH}.${process.pid}.${attempt}.tmp`;
      fs.writeFileSync(tempPath, body, "utf8");
      fs.renameSync(tempPath, OUTPUT_PATH);
      return;
    } catch (error) {
      lastError = error;
      try {
        fs.rmSync(`${OUTPUT_PATH}.${process.pid}.${attempt}.tmp`, { force: true });
      } catch (_cleanupError) {
        // Best effort cleanup; retry below.
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200 * (attempt + 1));
    }
  }
  throw lastError;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  let products = (state.products || []).slice(args.offset, args.limit ? args.offset + args.limit : undefined);
  const payload = loadExisting();
  payload.version = 1;
  payload.totalProducts = state.products.length;
  payload.strategy = {
    primary: "DuckDuckGo result snippets for Fragrantica product pages",
    secondary: "Parfumo or other perfume result snippets when Fragrantica is not found",
    note: "Direct Fragrantica pages may block automated fetches; snippets are stored with source URLs and confidence labels."
  };
  payload.items ||= {};

  if (args.onlyMissing) {
    products = products.filter((product) => !payload.items[product.sku]);
  }

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    if (!args.force && payload.items[product.sku]?.content?.researchStatus === "researched") {
      console.log(`[skip] ${product.sku} already researched`);
      continue;
    }
    try {
      console.log(`[${args.offset + index + 1}/${state.products.length}] ${product.sku} ${product.perfumeName}`);
      payload.items[product.sku] = await researchProduct(product);
      const content = payload.items[product.sku].content;
      console.log(`  -> ${content.researchStatus} ${content.dataConfidence}: ${content.displayName} | ${content.family} | ${content.top.length}/${content.middle.length}/${content.base.length} notes`);
      saveResearch(payload);
    } catch (error) {
      payload.items[product.sku] = {
        sku: product.sku,
        sourceProductName: product.perfumeName,
        researchedAt: new Date().toISOString(),
        error: error.message,
        content: buildContent(product, null, "", "low", "needs-manual-review")
      };
      saveResearch(payload);
      console.warn(`  -> failed: ${error.message}`);
    }
    if (index < products.length - 1) await sleep(args.delayMs);
  }

  saveResearch(payload);
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath: OUTPUT_PATH,
        totalProducts: payload.totalProducts,
        researchedProducts: payload.researchedProducts,
        statusCounts: Object.values(payload.items).reduce((counts, item) => {
          const status = item.content?.researchStatus || "unknown";
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        }, {})
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
