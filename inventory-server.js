const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { PRODUCT_CONTENT_OVERRIDES } = require("./product-content");
const { extractInventoryImages } = require("./scripts/extract-inventory-images");

const PORT = Number(process.env.INVENTORY_PORT || process.env.PORT || 4100);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const STATE_PATH = path.join(DATA_DIR, "inventory-state.json");
const WEBHOOKS_PATH = path.join(DATA_DIR, "webhook-subscriptions.json");
const LOCKS_PATH = path.join(DATA_DIR, "inventory-locks.json");
const IMAGE_MAP_PATH = path.join(DATA_DIR, "image-map.json");
const PERFUME_RESEARCH_PATH = path.join(DATA_DIR, "perfume-research.json");
const PUBLIC_DIR = path.join(ROOT_DIR, "inventory-public");
const DEFAULT_SOURCE_FILE = "C:\\Users\\DELL\\Desktop\\Inventory.xlsx";
const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;
const IS_VERCEL = Boolean(process.env.VERCEL);
const DEFAULT_API_KEY = process.env.SOURCEFLOW_API_KEY || "";
const DEFAULT_WEBHOOK_SECRET = process.env.SOURCEFLOW_WEBHOOK_SECRET || "";

const PRODUCT_IMAGE_OVERRIDES = {
  "YKW-LA-FEN": fragranticaImage("76880", "Yara", "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Yara-76880.html"),
  "YKW-LA-HONG": fragranticaImage(
    "95752",
    "Yara Candy",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Yara-Candy-95752.html"
  ),
  "YKW-LA-HUANG": fragranticaImage(
    "83320",
    "Yara Tous",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Yara-Tous-83320.html"
  ),
  "YKW-LA-BAI": fragranticaImage("80722", "Yara Moi", "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Yara-Moi-80722.html"),
  "YKW-LA-HEI": fragranticaImage("72821", "Asad", "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Asad-72821.html"),
  "YKW-LA-ZONG": fragranticaImage(
    "101124",
    "Asad Bourbon",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Asad-Bourbon-101124.html"
  ),
  "YKW-LA-LAN": fragranticaImage(
    "90713",
    "Asad Zanzibar",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Asad-Zanzibar-90713.html"
  ),
  "YKW-LA-EXFEN": fragranticaImage(
    "117615",
    "Yara Elixir",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Yara-Elixir-117615.html"
  ),
  "YKW-LA-EXHEI": fragranticaImage(
    "117616",
    "Asad Elixir",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Asad-Elixir-117616.html"
  ),
  "la-jx-xq": fragranticaImage(
    "101314",
    "Art Of Universe",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Art-Of-Universe-101314.html"
  ),
  "kh-jx-hei": fragranticaImage("75805", "Khamrah", "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Khamrah-75805.html"),
  "kh-jx-du": fragranticaImage(
    "104529",
    "Khamrah Dukhan",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Khamrah-Dukhan-104529.html"
  ),
  "kh-jx-ka": {
    url: "https://mysticlabbeauty.com/cdn/shop/files/Se7b8be21e6e04db6859b6d2bbffe3530t.avif?v=1767102063&width=1445",
    thumbUrl: "https://mysticlabbeauty.com/cdn/shop/files/Se7b8be21e6e04db6859b6d2bbffe3530t.avif?v=1767102063&width=360",
    source: "Mystic Lab Beauty",
    pageUrl: "https://mysticlabbeauty.com/products/lattafa-khamrah-karaz-edp-100ml",
    sourceLabel: "fallback",
    confidence: "low",
    notes: "No verified Fragrantica perfume page was found for Khamrah Karaz during lookup."
  },
  "kh-jx-qa": fragranticaImage(
    "88175",
    "Khamrah Qahwa",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Khamrah-Qahwa-88175.html"
  ),
  "gb-jx-hei": fragranticaImage(
    "96866",
    "His Confession",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/His-Confession-96866.html"
  ),
  "gb-jx-bai": fragranticaImage(
    "96864",
    "Her Confession",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Her-Confession-96864.html"
  ),
  "Lattafa-binggun": fragranticaImage("96768", "Angham", "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Angham-96768.html"),
  "YKW-NY-MI": fragranticaImage("93628", "Eclaire", "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Eclaire-93628.html"),
  "YKW-NY-HUANG": fragranticaImage(
    "113778",
    "Eclaire Banoffi",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Eclaire-Banoffi-113778.html"
  ),
  "YKW-NY-LUE": fragranticaImage(
    "113777",
    "Eclaire Pistache",
    "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Eclaire-Pistache-113777.html"
  )
};

const PRICE_COLUMN_HINTS = ["pcs", "piece", "qty", "quantity", ">=", "-"];
const HEADER_HINTS = {
  sku: ["sku", "seller sku", "item sku", "货号", "编码"],
  name: ["perfume name", "product name", "name", "品名", "商品名称", "产品名称"],
  capacity: ["capacity", "规格", "容量", "size"],
  inventory: ["inventory", "stock", "qty", "库存", "数量"],
  note: ["note", "notes", "remark", "remarks", "备注"],
  no: ["no.", "no", "序号", "编号"],
  photo: ["photo", "image", "picture", "图片"]
};

ensureDir(DATA_DIR);
ensureDir(UPLOAD_DIR);

function fragranticaImage(fragranticaId, title, pageUrl) {
  return {
    url: `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragranticaId}.jpg`,
    thumbUrl: `https://fimgs.net/mdimg/perfume-thumbs/375x500.${fragranticaId}.jpg`,
    source: "Fragrantica",
    pageUrl,
    fragranticaId,
    title,
    sourceLabel: "database",
    confidence: "high"
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || ".xlsx").toLowerCase();
      const base = path
        .basename(file.originalname || "inventory", ext)
        .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-")
        .slice(0, 80);
      cb(null, `${Date.now()}-${base || "inventory"}${ext || ".xlsx"}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if ([".xlsx", ".xls", ".csv"].includes(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only .xlsx, .xls, and .csv files are accepted."));
  }
});

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase();
}

function compactKey(value) {
  return normalizeHeader(value).replace(/[^a-z0-9\u4e00-\u9fa5>=-]+/g, "");
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeText(value).replace(/[$,]/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const number = parseNumber(value);
  return number === null ? null : Math.trunc(number);
}

function findHeaderRow(rows) {
  let best = { index: -1, score: 0 };
  rows.slice(0, 25).forEach((row, index) => {
    const labels = row.map(compactKey);
    let score = 0;
    Object.values(HEADER_HINTS).forEach((hints) => {
      if (labels.some((label) => hints.some((hint) => label === compactKey(hint) || label.includes(compactKey(hint))))) {
        score += 1;
      }
    });
    if (score > best.score) best = { index, score };
  });
  return best.score >= 3 ? best.index : 0;
}

function findColumn(headers, key) {
  const hints = HEADER_HINTS[key].map(compactKey);
  return headers.findIndex((header) => {
    const normalized = compactKey(header);
    return hints.some((hint) => normalized === hint || normalized.includes(hint));
  });
}

function isPriceColumn(header) {
  const normalized = normalizeHeader(header);
  if (!normalized) return false;
  return PRICE_COLUMN_HINTS.some((hint) => normalized.includes(hint)) && /(\d|>=|>|-)/.test(normalized);
}

function parsePriceTier(label) {
  const text = normalizeText(label);
  const numbers = [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (text.includes(">=") && numbers.length >= 1) {
    return { label: text, minQty: numbers[0], maxQty: null, currency: "USD" };
  }
  if (text.includes(">") && numbers.length >= 1) {
    return { label: text, minQty: numbers[0] + 1, maxQty: null, currency: "USD" };
  }
  if (numbers.length >= 2) {
    return { label: text, minQty: numbers[0], maxQty: numbers[1], currency: "USD" };
  }
  if (numbers.length === 1) {
    return { label: text, minQty: numbers[0], maxQty: numbers[0], currency: "USD" };
  }
  return { label: text, minQty: null, maxQty: null, currency: "USD" };
}

function extractImageRef(value) {
  const text = normalizeText(value);
  const match = text.match(/DISPIMG\("([^"]+)"/i);
  return {
    formula: text || null,
    id: match ? match[1] : null
  };
}

function loadImageMap() {
  if (!fs.existsSync(IMAGE_MAP_PATH)) {
    return { images: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(IMAGE_MAP_PATH, "utf8"));
  } catch (_error) {
    return { images: {} };
  }
}

function getProductImage(sku, photo, imageMap = loadImageMap()) {
  const override = PRODUCT_IMAGE_OVERRIDES[sku];
  const sheetImage = photo?.id ? imageMap.images?.[photo.id] : null;
  if (override && sheetImage) {
    return {
      ...override,
      supplierImage: sheetImage
    };
  }
  return override || sheetImage || null;
}

function getProductContent(sku) {
  return PRODUCT_CONTENT_OVERRIDES[sku] || null;
}

function loadPerfumeResearch() {
  if (!fs.existsSync(PERFUME_RESEARCH_PATH)) {
    return { items: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(PERFUME_RESEARCH_PATH, "utf8"));
  } catch (_error) {
    return { items: {} };
  }
}

function getResearchContent(sku, research = loadPerfumeResearch()) {
  return research.items?.[sku]?.content || null;
}

function makeProductSlug(product) {
  return `${product.sku || product.id || product.rowNumber}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseWord(word) {
  if (!word) return "";
  if (word.length <= 3 && word === word.toUpperCase()) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function tidyProductName(value) {
  return normalizeText(value)
    .replace(/\s+by\s+.+$/i, "")
    .replace(/\b(eau\s+de\s+parfum|eau\s+de\s+toilette|edp|edt|extrait\s+de\s+parfum|parfum|cologne)\b/gi, "")
    .replace(/\bfor\s+(women|men)\s*(?:&|and)\s*(women|men)\b/gi, "")
    .replace(/\bfor\s+(women|men|unisex|her|him)\b/gi, "")
    .replace(/\b(?:women|men)\s*(?:&|and)\s*(?:women|men)\b/gi, "")
    .replace(/\b(spray|perfume|fragrance|women'?s|men'?s)\b/gi, "")
    .replace(/\b(3\.?4\s*(fl\.?\s*)?oz|100\s*ml|3\.40\s*ounce)\b/gi, "")
    .replace(/\s*[-|,]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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

const CONCENTRATION_PATTERNS = [
  [/extrait\s+de\s+parfum|pure\s+perfume/i, "Extrait de Parfum"],
  [/eau\s+de\s+parfum|\bedp\b/i, "Eau de Parfum"],
  [/eau\s+de\s+toilette|\bedt\b/i, "Eau de Toilette"],
  [/cologne/i, "Cologne"],
  [/\bparfum\b/i, "Parfum"]
];

const ACCORD_KEYWORDS = [
  ["vanilla", ["vanilla", "vanille"]],
  ["oud", ["oud", "oudh"]],
  ["amber", ["amber", "ambre"]],
  ["rose", ["rose"]],
  ["musk", ["musk", "musky"]],
  ["citrus", ["citrus", "orange", "lemon", "bergamot", "mandarin", "limoni", "yuzu", "grapefruit"]],
  ["woody", ["wood", "woods", "cedar", "sandal", "santal", "oak", "forest"]],
  ["spicy", ["spice", "spicy", "pepper", "cardamom", "saffron", "cinnamon", "tonka"]],
  ["gourmand", ["gourmand", "choco", "chocolate", "cocoa", "caramel", "honey", "toffee", "cookie", "marshmallow", "mallow", "pistachio", "praline", "candy", "sweet tooth", "espresso", "coffee", "milk", "cream", "banoffi"]],
  ["fruity", ["fruit", "fruity", "apple", "cherry", "berry", "lychee", "peach", "tropical", "mango", "banana", "pineapple", "coconut", "juicy"]],
  ["floral", ["floral", "flower", "jasmine", "tuberose", "peony", "mimosa", "orchid", "blush", "divine", "delina", "grace"]],
  ["fresh", ["fresh", "aqua", "water", "blue", "cool", "ice", "eclat", "tonic"]],
  ["green", ["green", "herbal", "tea", "mint", "bleecker"]],
  ["smoky", ["smoke", "smoky", "dukhan", "incense", "tobacco"]],
  ["powdery", ["powder", "poudree"]],
  ["leather", ["leather"]],
  ["aromatic", ["aromatic", "lavender", "sage", "fougere"]]
];

function inferBrand(productName) {
  const normalized = normalizeText(productName);
  const compact = normalized.toLowerCase().replace(/\s+/g, " ");
  const brand = BRAND_ALIASES.find((item) => compact.includes(item.toLowerCase()));
  if (brand === "Lattafa") return "Lattafa Perfumes";
  if (brand) return brand;
  const firstWords = normalized.split(/\s+/).slice(0, 2).map(titleCaseWord).join(" ");
  return firstWords || "SourceFlow Supplier";
}

function inferGender(productName) {
  const text = normalizeText(productName).toLowerCase();
  if (/\b(women|woman|her)\b.*\b(men|man|him)\b|\b(men|man|him)\b.*\b(women|woman|her)\b/.test(text)) return "Unisex";
  if (/\b(for women|women|woman|for her|for womenedp|her\b|feminine)\b/.test(text)) return "Women";
  if (/\b(for men|men|man|for him|mens|masculine)\b/.test(text)) return "Men";
  return "Unisex";
}

function inferConcentration(productName) {
  for (const [pattern, concentration] of CONCENTRATION_PATTERNS) {
    if (pattern.test(productName)) return concentration;
  }
  return "Eau de Parfum";
}

function inferAccords(productName) {
  const text = normalizeText(productName).toLowerCase();
  const accords = ACCORD_KEYWORDS.filter(([, words]) => words.some((word) => text.includes(word))).map(([accord]) => accord);
  if (!accords.length && /night|black|intense|elixir|supreme|royale/.test(text)) {
    accords.push("amber", "woody");
  }
  if (!accords.length) accords.push("fragrance");
  return [...new Set(accords)].slice(0, 6);
}

function inferFamily(accords, gender) {
  const set = new Set(accords);
  if (set.has("gourmand") && set.has("vanilla")) return "Gourmand Vanilla";
  if (set.has("oud") && set.has("amber")) return "Amber Oud";
  if (set.has("citrus") && set.has("fresh")) return "Fresh Citrus";
  if (set.has("floral") && set.has("fruity")) return "Floral Fruity";
  if (set.has("spicy") && set.has("woody")) return "Woody Spicy";
  if (set.has("rose")) return "Floral Rose";
  if (set.has("vanilla")) return "Amber Vanilla";
  if (set.has("fresh")) return "Fresh Aromatic";
  if (set.has("floral")) return "Floral";
  if (set.has("woody")) return "Woody";
  return gender === "Men" ? "Masculine Fragrance" : "Fragrance";
}

function readableAccordPhrase(accords) {
  return accords.filter((accord) => accord !== "fragrance").slice(0, 4).join(", ") || "commercial fragrance";
}

function familyDirection(family) {
  const normalized = normalizeText(family);
  if (!normalized) return "Fragrance direction";
  return /fragrance$/i.test(normalized) ? `${normalized} direction` : `${normalized} fragrance direction`;
}

function buildGeneratedContent(product) {
  const brand = inferBrand(product.perfumeName);
  const displayName = tidyProductName(product.perfumeName) || product.perfumeName || product.sku;
  const gender = inferGender(product.perfumeName);
  const concentration = inferConcentration(product.perfumeName);
  const accords = inferAccords(product.perfumeName);
  const family = inferFamily(accords, gender);
  const accordPhrase = readableAccordPhrase(accords);

  return {
    brand,
    displayName,
    gender,
    launchYear: null,
    family,
    concentration,
    accords,
    top: [],
    middle: [],
    base: [],
    angle: `${accordPhrase} direction based on the supplier catalog name`,
    dataConfidence: "catalog-generated",
    reviewNote:
      "Generated from the supplier inventory row and embedded sheet image. Confirm perfume-database notes, official claims, and image rights before publishing on strict marketplaces.",
    community: {
      stats: null,
      gallery: product.image ? [product.image] : [],
      reviewInsights: {
        source: "Supplier catalog baseline",
        summary:
          "This SKU has baseline B2B listing content generated from the supplier sheet so agents and sellers can read a complete product pack. It has not yet received manual Fragrantica or brand-site review enrichment.",
        likedFor: [
          "available for wholesale and one-piece dropshipping",
          "structured stock, price tiers, capacity, and SKU are available through the API",
          "supplier sheet image is included when embedded in the uploaded workbook"
        ],
        watchouts: [
          "fragrance notes are not asserted until verified from authoritative sources",
          "community photo and review detail still require manual enrichment",
          "marketplace-ready claims should be reviewed before publishing"
        ],
        merchandisingAngles: [
          `${brand} wholesale SKU`,
          `${gender.toLowerCase()} ${family.toLowerCase()} direction`,
          "one-piece dropshipping eligible product",
          "API-ready listing pack for ecommerce upload"
        ],
        reviewSampleSizeLabel: "not researched",
        sourceUrl: null
      },
      recommendations: [],
      sourceLinks: [],
      photoResearchLinks: [],
      usageNotice:
        "Sheet images are supplier-provided catalog assets. Verify usage permissions before using them as final marketplace images."
    }
  };
}

function buildCommerceProfile(product) {
  const content = getProductContent(product.sku) || getResearchContent(product.sku) || buildGeneratedContent(product);

  const displayName = content.displayName || product.perfumeName;
  const minPrice = product.priceTiers
    .map((tier) => tier.unitPrice)
    .filter((price) => typeof price === "number")
    .reduce((lowest, price) => Math.min(lowest, price), Infinity);
  const wholesaleFrom = Number.isFinite(minPrice) ? minPrice : null;
  const image = product.image || null;
  const imageGallery = [
    image?.supplierImage || null,
    image,
    image
      ? {
          ...image,
          label: "Marketplace listing image",
          role: "listing"
        }
      : null
  ].filter(Boolean);

  const family = content.family || "Fragrance";
  const concentration = content.concentration || "Eau de Parfum";
  const accords = Array.isArray(content.accords) && content.accords.length ? content.accords : ["fragrance"];
  const topNotes = Array.isArray(content.top) ? content.top : [];
  const middleNotes = Array.isArray(content.middle) ? content.middle : [];
  const baseNotes = Array.isArray(content.base) ? content.base : [];
  const shortDescription = `${displayName} is a ${family.toLowerCase()} ${concentration} with ${content.angle}.`;
  const longDescription = [
    `${displayName} by ${content.brand} is prepared for B2B resale, dropshipping, and marketplace listing workflows.`,
    `The scent direction is ${content.angle}, supported by a ${family.toLowerCase()} profile and key accords including ${accords.slice(0, 5).join(", ")}.`,
    `Wholesale customers can list this SKU with the supplied image links, product copy, fragrance-note structure, tiered pricing, inventory count, and after-sales policy notes from the current supply sheet.`
  ].join(" ");

  return {
    slug: makeProductSlug(product),
    brand: content.brand,
    displayName,
    title: `${displayName} ${product.capacity} ${concentration}`,
    seoTitle: `${displayName} Wholesale Dropshipping | ${product.sku}`,
    metaDescription: `${displayName} wholesale dropshipping product pack with images, notes, description, SKU ${product.sku}, stock, and tier pricing.`,
    shortDescription,
    longDescription,
    listingBullets: [
      `${familyDirection(family)} for ${content.gender.toLowerCase()} buyers.`,
      `Key accords: ${accords.slice(0, 6).join(", ")}.`,
      `Wholesale tiers start from ${wholesaleFrom === null ? "current sheet pricing" : `$${wholesaleFrom}`} per unit before shipping.`,
      `Supports one-piece dropshipping and bulk B2B orders from the same inventory feed.`,
      `Use the supplied product image URLs and structured notes to build marketplace listings faster.`
    ],
    fragrance: {
      gender: content.gender,
      launchYear: content.launchYear,
      family,
      concentration,
      accords,
      notes: {
        top: topNotes,
        middle: middleNotes,
        base: baseNotes
      }
    },
    sourcing: {
      imageSource: image?.source || null,
      sourcePage: image?.pageUrl || null,
      dataConfidence: content.dataConfidence || image?.confidence || "medium",
      researchStatus: content.researchStatus || (PRODUCT_CONTENT_OVERRIDES[product.sku] ? "manual-verified" : "catalog-generated"),
      reviewNote: content.reviewNote || image?.notes || null,
      sourceLinks: content.community?.sourceLinks || []
    },
    ecommerce: {
      sku: product.sku,
      capacity: product.capacity,
      inventory: product.inventory,
      available: product.available,
      wholesaleFrom,
      priceTiers: product.priceTiers,
      dropship: true,
      bulkWholesale: true,
      category: "Fragrance > Eau de Parfum",
      tags: [
        "perfume wholesale",
        "dropshipping",
        content.brand,
        family,
        ...accords.slice(0, 4)
      ]
    },
    images: imageGallery,
    community: content.community || null,
    sourceProductName: product.perfumeName
  };
}

function enrichProduct(product) {
  const commerce = buildCommerceProfile(product);
  return {
    ...product,
    slug: makeProductSlug(product),
    commerce
  };
}

function enrichProducts(products) {
  return products.map(enrichProduct);
}

function toListingRecord(product) {
  const item = enrichProduct(product);
  const commerce = item.commerce;
  return {
    sku: item.sku,
    handle: item.slug,
    title: commerce?.title || item.perfumeName,
    brand: commerce?.brand || "",
    category: commerce?.ecommerce.category || "Fragrance",
    capacity: item.capacity,
    inventory: item.inventory,
    price_1_3: item.priceTiers[0]?.unitPrice ?? "",
    price_4_39: item.priceTiers[1]?.unitPrice ?? "",
    price_40_plus: item.priceTiers[2]?.unitPrice ?? "",
    image_url: commerce?.images[0]?.url || item.image?.url || "",
    community_image_urls: (commerce?.community?.gallery || []).map((image) => image.url).join(" | "),
    image_source_page: commerce?.sourcing.sourcePage || "",
    short_description: commerce?.shortDescription || "",
    long_description: commerce?.longDescription || "",
    bullet_1: commerce?.listingBullets[0] || "",
    bullet_2: commerce?.listingBullets[1] || "",
    bullet_3: commerce?.listingBullets[2] || "",
    top_notes: commerce?.fragrance.notes.top.join(", ") || "",
    middle_notes: commerce?.fragrance.notes.middle.join(", ") || "",
    base_notes: commerce?.fragrance.notes.base.join(", ") || "",
    accords: commerce?.fragrance.accords.join(", ") || "",
    community_rating: commerce?.community?.stats?.rating || "",
    community_review_summary: commerce?.community?.reviewInsights?.summary || "",
    dropship: "yes",
    data_confidence: commerce?.sourcing.dataConfidence || ""
  };
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(records) {
  const headers = Object.keys(records[0] || {});
  return [
    headers.join(","),
    ...records.map((record) => headers.map((header) => escapeCsv(record[header])).join(","))
  ].join("\n");
}

function choosePriceTier(priceTiers, quantity) {
  return (priceTiers || []).find((tier) => {
    const min = tier.minQty ?? 1;
    const max = tier.maxQty ?? Infinity;
    return quantity >= min && quantity <= max;
  });
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function requireApiKey(req, res, next) {
  if (!DEFAULT_API_KEY) {
    next();
    return;
  }
  const supplied = req.get("x-sourceflow-api-key") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supplied === DEFAULT_API_KEY) {
    next();
    return;
  }
  res.status(401).json({ ok: false, error: "Missing or invalid SourceFlow API key." });
}

function getWholesalePrice(product) {
  const ecommercePrice = product.commerce?.ecommerce?.wholesaleFrom;
  if (typeof ecommercePrice === "number") return ecommercePrice;
  const tierPrices = (product.priceTiers || []).map((tier) => tier.unitPrice).filter((value) => typeof value === "number");
  return tierPrices.length ? Math.min(...tierPrices) : null;
}

function toSyncProduct(product) {
  return {
    sku: product.sku,
    slug: product.slug,
    productUrl: `/products/${encodeURIComponent(product.sku)}`,
    name: product.commerce?.displayName || product.perfumeName,
    title: product.commerce?.title || product.perfumeName,
    capacity: product.capacity,
    brand: product.commerce?.brand || null,
    inventory: product.inventory,
    available: product.available,
    wholesaleFrom: getWholesalePrice(product),
    priceTiers: product.priceTiers,
    image: product.image,
    commerce: product.commerce,
    listingRecord: toListingRecord(product)
  };
}

function buildChangeEvent(product, state, eventType = "product.upserted") {
  return {
    id: `${state.revision || "rev"}:${product.sku}`,
    event: eventType,
    revision: state.revision,
    updatedAt: state.source?.importedAt || null,
    sku: product.sku,
    inventory: product.inventory,
    available: product.available,
    wholesaleFrom: getWholesalePrice(product),
    product: toSyncProduct(product)
  };
}

function getChangeEvents(state, query = {}) {
  const enriched = enrichProducts(state.products).filter((product) => product.commerce);
  const sku = normalizeHeader(query.sku || "");
  const since = normalizeHeader(query.since || "");
  const limit = Math.min(1000, Math.max(1, parseInteger(query.limit) || enriched.length || 100));
  const products = sku ? enriched.filter((product) => normalizeHeader(product.sku) === sku) : enriched;
  const changed = since && since === normalizeHeader(state.revision) ? [] : products;
  return changed.slice(0, limit).map((product) => buildChangeEvent(product, state));
}

function readWebhookStore() {
  return readJsonFile(WEBHOOKS_PATH, { version: 1, subscriptions: [] });
}

function writeWebhookStore(store) {
  writeJsonFile(WEBHOOKS_PATH, store);
}

function safeWebhook(subscription) {
  return {
    id: subscription.id,
    url: subscription.url,
    events: subscription.events,
    active: subscription.active,
    platform: subscription.platform || null,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    lastTestAt: subscription.lastTestAt || null
  };
}

function signWebhookPayload(payload, secret) {
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

function readLockStore() {
  return readJsonFile(LOCKS_PATH, { version: 1, locks: [] });
}

function writeLockStore(store) {
  writeJsonFile(LOCKS_PATH, store);
}

function activeLocks(store, now = new Date()) {
  return (store.locks || []).filter((lock) => lock.status === "active" && new Date(lock.expiresAt) > now);
}

function lockedQuantityBySku(store) {
  return activeLocks(store).reduce((totals, lock) => {
    (lock.items || []).forEach((item) => {
      const sku = normalizeHeader(item.sku);
      totals[sku] = (totals[sku] || 0) + item.quantity;
    });
    return totals;
  }, {});
}

function normalizeOrderItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      sku: normalizeText(item.sku),
      quantity: Math.max(1, parseInteger(item.quantity) || 1)
    }))
    .filter((item) => item.sku);
}

function splitPolicy(rawPolicy) {
  return rawPolicy
    .split(/\n|●/g)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function parsePolicy(rawPolicy) {
  const bullets = splitPolicy(rawPolicy);
  const shippingText = bullets.find((item) => /shipping fee/i.test(item)) || "";
  const shippingAmounts = [...shippingText.matchAll(/\$(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  const deliveryText = bullets.find((item) => /business days|package/i.test(item)) || "";
  const businessDaysMatch = deliveryText.match(/(\d+)\s+business days/i);
  const issueText = bullets.find((item) => /damage|wrong items|missing items|refund|reshipment/i.test(item)) || "";

  return {
    raw: rawPolicy,
    bullets,
    shipping: {
      raw: shippingText || null,
      sameProductOnly: /same product/i.test(shippingText),
      firstPieceUsd: shippingAmounts[0] ?? null,
      additionalPieceUsd: shippingAmounts[1] ?? null
    },
    deliveryException: {
      raw: deliveryText || null,
      contactAfterBusinessDays: businessDaysMatch ? Number(businessDaysMatch[1]) : null,
      failedPickupOrLostReship: /failed pickup|lost during transit/i.test(deliveryText)
    },
    afterSales: {
      raw: issueText || null,
      refundOrReshipmentForProductIssues: /refund|reshipment/i.test(issueText),
      excludesUnreasonableRequests: /unreasonable|malicious/i.test(issueText)
    }
  };
}

function makeRevision(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      source: payload.source,
      policy: payload.policy.raw,
      products: payload.products.map((item) => [item.sku, item.inventory, item.priceTiers])
    }))
    .digest("hex")
    .slice(0, 16);
}

function parseInventoryWorkbook(filePath, options = {}) {
  let imageMap = loadImageMap();
  if (path.extname(filePath).toLowerCase() === ".xlsx") {
    try {
      imageMap = extractInventoryImages(filePath, { quiet: true });
    } catch (error) {
      console.warn(`Could not extract embedded workbook images: ${error.message}`);
    }
  }

  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    cellFormula: true,
    cellNF: false,
    cellStyles: false
  });
  const sheetName = options.sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: ""
  });
  const headerRowIndex = findHeaderRow(rows);
  const headers = (rows[headerRowIndex] || []).map((header, index) => normalizeText(header) || `Column ${index + 1}`);
  const policyRaw = rows
    .slice(0, headerRowIndex)
    .map((row) => row.map(normalizeText).filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n");

  const columns = {
    no: findColumn(headers, "no"),
    photo: findColumn(headers, "photo"),
    name: findColumn(headers, "name"),
    capacity: findColumn(headers, "capacity"),
    inventory: findColumn(headers, "inventory"),
    note: findColumn(headers, "note"),
    sku: findColumn(headers, "sku")
  };
  const priceColumnIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => isPriceColumn(header))
    .map(({ index }) => index);

  if (columns.sku === -1 && columns.name === -1) {
    throw new Error("Could not identify SKU or product name columns in the uploaded file.");
  }

  const importedAt = new Date().toISOString();
  const products = [];

  rows.slice(headerRowIndex + 1).forEach((row, rowOffset) => {
    const rowNumber = headerRowIndex + rowOffset + 2;
    const raw = {};
    headers.forEach((header, index) => {
      raw[header] = normalizeText(row[index]);
    });

    const sku = normalizeText(row[columns.sku]);
    const perfumeName = normalizeText(row[columns.name]);
    const hasUsefulValue = sku || perfumeName || normalizeText(row[columns.no]);
    if (!hasUsefulValue) return;

    const priceTiers = priceColumnIndexes.map((index) => ({
      ...parsePriceTier(headers[index]),
      unitPrice: parseNumber(row[index])
    }));

    const inventory = parseInteger(row[columns.inventory]);
    const photo = columns.photo >= 0 ? extractImageRef(row[columns.photo]) : { formula: null, id: null };
    const image = getProductImage(sku, photo, imageMap);

    products.push({
      id: normalizeText(row[columns.no]) || sku || `row-${rowNumber}`,
      rowNumber,
      sku,
      perfumeName,
      capacity: normalizeText(row[columns.capacity]),
      inventory: inventory ?? 0,
      available: (inventory ?? 0) > 0,
      note: normalizeText(row[columns.note]),
      photo,
      image,
      priceTiers,
      raw
    });
  });

  const policy = parsePolicy(policyRaw);
  const payload = {
    version: 1,
    source: {
      filename: path.basename(filePath),
      path: filePath,
      importedAt,
      sheetName,
      workbookSheets: workbook.SheetNames,
      headerRow: headerRowIndex + 1,
      dataRows: products.length
    },
    assets: {
      imageMapPath: fs.existsSync(IMAGE_MAP_PATH) ? IMAGE_MAP_PATH : null,
      embeddedImages: {
        extracted: imageMap.extractedImages || 0,
        total: imageMap.totalCellImages || 0,
        missing: imageMap.missingImages?.length || 0
      }
    },
    policy,
    columns: headers,
    mappings: {
      ...columns,
      priceColumns: priceColumnIndexes
    },
    summary: summarizeProducts(products),
    products
  };
  payload.revision = makeRevision(payload);
  return payload;
}

function summarizeProducts(products) {
  return {
    productCount: products.length,
    productImageCount: products.filter((product) => product.image?.url).length,
    totalInventory: products.reduce((sum, product) => sum + (Number(product.inventory) || 0), 0),
    outOfStockCount: products.filter((product) => !product.available).length,
    lowStockCount: products.filter((product) => product.inventory > 0 && product.inventory <= 100).length,
    skuCount: new Set(products.map((product) => product.sku).filter(Boolean)).size
  };
}

function saveState(state) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {
      version: 1,
      revision: null,
      source: null,
      policy: parsePolicy(""),
      assets: {
        imageMapPath: fs.existsSync(IMAGE_MAP_PATH) ? IMAGE_MAP_PATH : null,
        embeddedImages: {
          extracted: 0,
          total: 0,
          missing: 0
        }
      },
      columns: [],
      mappings: {},
      summary: summarizeProducts([]),
      products: []
    };
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function buildSyncStatus(req, state) {
  const origin = `${req.protocol}://${req.get("host")}`;
  return {
    ok: true,
    service: "sourceflow-sync-api",
    revision: state.revision,
    updatedAt: state.source?.importedAt || null,
    auth: {
      required: Boolean(DEFAULT_API_KEY),
      header: "x-sourceflow-api-key",
      bearerSupported: true
    },
    recommendedFlow: [
      "First import: GET /api/catalog-pack?format=json or GET /api/products?limit=all",
      "Store SKU mappings in the seller store.",
      "Subscribe webhook: POST /api/webhooks/subscriptions",
      "Poll fallback: GET /api/changes?since={lastRevision}",
      "Before order fulfillment: POST /api/inventory/locks",
      "Submit dropship order: POST /api/dropship/orders"
    ],
    endpoints: {
      status: `${origin}/api/sync/status`,
      fullCatalog: `${origin}/api/catalog-pack?format=json`,
      changes: `${origin}/api/changes?since=${state.revision || "LAST_REVISION"}`,
      webhooks: `${origin}/api/webhooks/subscriptions`,
      lockInventory: `${origin}/api/inventory/locks`,
      dropshipOrders: `${origin}/api/dropship/orders`
    },
    webhookSignature: {
      header: "x-sourceflow-signature",
      algorithm: "HMAC-SHA256 over raw JSON payload",
      configured: Boolean(DEFAULT_WEBHOOK_SECRET)
    },
    notes: [
      "Use SKU as the stable key. Do not match by product title.",
      "Webhook delivery should be retried by production queue infrastructure.",
      "Local JSON stores are for prototype use; move webhooks and locks to KV/Postgres before production."
    ]
  };
}

function toAgentPayload(state) {
  return {
    ok: true,
    revision: state.revision,
    updatedAt: state.source?.importedAt || null,
    source: state.source
      ? {
          filename: state.source.filename,
          sheetName: state.source.sheetName,
          dataRows: state.source.dataRows
        }
      : null,
    summary: state.summary,
    policy: state.policy,
    items: enrichProducts(state.products).map((product) => ({
      sku: product.sku,
      name: product.perfumeName,
      capacity: product.capacity,
      inventory: product.inventory,
      available: product.available,
      note: product.note,
      prices: product.priceTiers,
      image: product.image,
      commerce: product.commerce,
      rowNumber: product.rowNumber
    }))
  };
}

function filterProducts(state, query) {
  const q = normalizeHeader(query.q || query.search || "");
  const sku = normalizeHeader(query.sku || "");
  let products = state.products || [];
  if (sku) {
    products = products.filter((product) => normalizeHeader(product.sku) === sku);
  }
  if (q) {
    products = products.filter((product) =>
      [product.sku, product.perfumeName, product.capacity, product.note, product.id]
        .map(normalizeHeader)
        .some((value) => value.includes(q))
    );
  }
  const offset = Math.max(0, parseInteger(query.offset) || 0);
  const requestedLimit = normalizeHeader(query.limit || "");
  const limit =
    requestedLimit === "all"
      ? products.length || 1
      : Math.min(1000, Math.max(1, parseInteger(query.limit) || products.length || 100));
  return {
    total: products.length,
    offset,
    limit,
    items: products.slice(offset, offset + limit)
  };
}

function buildApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    const state = loadState();
    const enriched = enrichProducts(state.products);
    res.json({
      ok: true,
      service: "perfume-inventory-api",
      revision: state.revision,
      productCount: state.summary.productCount,
      productImageCount: state.summary.productImageCount,
      commerceProductCount: enriched.filter((product) => product.commerce).length,
      researchStatusCounts: enriched.reduce((counts, product) => {
        const status = product.commerce?.sourcing?.researchStatus || "unknown";
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {}),
      updatedAt: state.source?.importedAt || null
    });
  });

  app.get("/api/inventory", (req, res) => {
    const state = loadState();
    if (req.query.format === "agent") {
      res.json(toAgentPayload(state));
      return;
    }
    res.json({ ok: true, ...state, products: enrichProducts(state.products) });
  });

  app.get("/api/agent/inventory", (_req, res) => {
    res.json(toAgentPayload(loadState()));
  });

  app.get("/api/policy", (_req, res) => {
    const state = loadState();
    res.json({ ok: true, revision: state.revision, updatedAt: state.source?.importedAt || null, policy: state.policy });
  });

  app.get("/api/sync/status", (req, res) => {
    res.json(buildSyncStatus(req, loadState()));
  });

  app.get("/api/changes", requireApiKey, (req, res) => {
    const state = loadState();
    const events = getChangeEvents(state, req.query);
    res.json({
      ok: true,
      revision: state.revision,
      since: req.query.since || null,
      hasChanges: events.length > 0,
      nextSince: state.revision,
      updatedAt: state.source?.importedAt || null,
      total: events.length,
      events
    });
  });

  app.get("/api/webhooks/subscriptions", requireApiKey, (_req, res) => {
    const store = readWebhookStore();
    res.json({ ok: true, total: store.subscriptions.length, subscriptions: store.subscriptions.map(safeWebhook) });
  });

  app.post("/api/webhooks/subscriptions", requireApiKey, (req, res) => {
    const url = normalizeText(req.body?.url);
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ ok: false, error: "Expected url to be an absolute http(s) webhook endpoint." });
      return;
    }
    const allowedEvents = new Set(["product.upserted", "inventory.updated", "price.updated", "catalog.revision", "order.accepted"]);
    const requestedEvents = Array.isArray(req.body?.events) && req.body.events.length ? req.body.events : ["product.upserted", "inventory.updated", "price.updated"];
    const events = requestedEvents.map(normalizeText).filter((event) => allowedEvents.has(event));
    if (!events.length) {
      res.status(400).json({ ok: false, error: "No supported webhook events provided." });
      return;
    }
    const store = readWebhookStore();
    const existing = store.subscriptions.find((item) => normalizeHeader(item.url) === normalizeHeader(url));
    const now = nowIso();
    const subscription = existing || { id: makeId("wh"), createdAt: now };
    subscription.url = url;
    subscription.events = events;
    subscription.active = req.body?.active !== false;
    subscription.platform = normalizeText(req.body?.platform || "");
    subscription.secretHint = DEFAULT_WEBHOOK_SECRET ? "server-configured" : "not-configured";
    subscription.updatedAt = now;
    if (!existing) store.subscriptions.push(subscription);
    writeWebhookStore(store);
    res.status(existing ? 200 : 201).json({ ok: true, subscription: safeWebhook(subscription) });
  });

  app.post("/api/webhooks/subscriptions/:id/test", requireApiKey, async (req, res) => {
    const store = readWebhookStore();
    const subscription = store.subscriptions.find((item) => item.id === req.params.id);
    if (!subscription) {
      res.status(404).json({ ok: false, error: "Webhook subscription not found." });
      return;
    }
    const state = loadState();
    const payload = {
      id: makeId("evt"),
      event: "catalog.revision",
      revision: state.revision,
      updatedAt: state.source?.importedAt || null,
      test: true,
      message: "SourceFlow webhook test event."
    };
    const headers = { "content-type": "application/json", "user-agent": "SourceFlow-Webhooks/1.0" };
    const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);
    if (signature) headers["x-sourceflow-signature"] = signature;
    try {
      const response = await fetch(subscription.url, { method: "POST", headers, body: JSON.stringify(payload) });
      subscription.lastTestAt = nowIso();
      subscription.lastTestStatus = response.status;
      writeWebhookStore(store);
      res.json({ ok: response.ok, status: response.status, subscription: safeWebhook(subscription) });
    } catch (error) {
      subscription.lastTestAt = nowIso();
      subscription.lastTestStatus = "network_error";
      writeWebhookStore(store);
      res.status(502).json({ ok: false, error: error.message, subscription: safeWebhook(subscription) });
    }
  });

  app.delete("/api/webhooks/subscriptions/:id", requireApiKey, (req, res) => {
    const store = readWebhookStore();
    const before = store.subscriptions.length;
    store.subscriptions = store.subscriptions.filter((item) => item.id !== req.params.id);
    writeWebhookStore(store);
    res.json({ ok: true, deleted: before - store.subscriptions.length });
  });

  app.get("/api/products", (req, res) => {
    const state = loadState();
    res.json({
      ok: true,
      revision: state.revision,
      updatedAt: state.source?.importedAt || null,
      ...filterProducts({ ...state, products: enrichProducts(state.products) }, req.query)
    });
  });

  app.get("/api/products/:sku", (req, res) => {
    const sku = normalizeHeader(req.params.sku);
    const state = loadState();
    const product = enrichProducts(state.products).find((item) => normalizeHeader(item.sku) === sku || normalizeHeader(item.slug) === sku);
    if (!product) {
      res.status(404).json({ ok: false, error: "Product not found." });
      return;
    }
    res.json({ ok: true, revision: state.revision, updatedAt: state.source?.importedAt || null, item: product });
  });

  app.get("/api/products/:sku/pack", (req, res) => {
    const sku = normalizeHeader(req.params.sku);
    const state = loadState();
    const product = enrichProducts(state.products).find((item) => normalizeHeader(item.sku) === sku || normalizeHeader(item.slug) === sku);
    if (!product) {
      res.status(404).json({ ok: false, error: "Product not found." });
      return;
    }
    res.setHeader("Content-Disposition", `attachment; filename="${product.slug}-product-pack.json"`);
    res.json({
      ok: true,
      revision: state.revision,
      policy: state.policy,
      product
    });
  });

  app.get("/api/catalog-pack", (req, res) => {
    const state = loadState();
    const enrichedProducts = enrichProducts(state.products).filter((product) => product.commerce);
    const requestedLimit = normalizeHeader(req.query.limit || "all");
    const limit = requestedLimit === "all" ? enrichedProducts.length : Math.max(1, parseInteger(req.query.limit) || enrichedProducts.length);
    const products = enrichedProducts.slice(0, limit);
    const format = normalizeHeader(req.query.format || "json");
    const records = products.map(toListingRecord);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"sourceflow-b2b-listing-pack.csv\"");
      res.send(toCsv(records));
      return;
    }
    res.setHeader("Content-Disposition", "attachment; filename=\"sourceflow-b2b-listing-pack.json\"");
    res.json({
      ok: true,
      revision: state.revision,
      updatedAt: state.source?.importedAt || null,
      policy: state.policy,
      totalProducts: enrichedProducts.length,
      products,
      listingRecords: records
    });
  });

  app.get("/api/stock", (req, res) => {
    const sku = normalizeHeader(req.query.sku || "");
    if (!sku) {
      res.status(400).json({ ok: false, error: "Missing required query parameter: sku" });
      return;
    }
    const state = loadState();
    const product = enrichProducts(state.products).find((item) => normalizeHeader(item.sku) === sku);
    if (!product) {
      res.status(404).json({ ok: false, error: "SKU not found." });
      return;
    }
    res.json({
      ok: true,
      revision: state.revision,
      updatedAt: state.source?.importedAt || null,
      sku: product.sku,
      inventory: product.inventory,
      available: product.available,
      prices: product.priceTiers,
      image: product.image,
      commerce: product.commerce,
      name: product.perfumeName,
      capacity: product.capacity,
      note: product.note
    });
  });

  app.post("/api/dropship/quote", (req, res) => {
    const state = loadState();
    const lines = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!lines.length) {
      res.status(400).json({ ok: false, error: "Expected items: [{ sku, quantity }]" });
      return;
    }
    const enriched = enrichProducts(state.products);
    const quotedLines = [];
    let subtotal = 0;
    let shipping = 0;

    for (const line of lines) {
      const sku = normalizeText(line.sku);
      const quantity = Math.max(1, parseInteger(line.quantity) || 1);
      const product = enriched.find((item) => normalizeHeader(item.sku) === normalizeHeader(sku));
      if (!product) {
        res.status(404).json({ ok: false, error: `SKU not found: ${sku}` });
        return;
      }
      const tier = choosePriceTier(product.priceTiers, quantity);
      const unitPrice = tier?.unitPrice ?? product.commerce?.ecommerce?.wholesaleFrom ?? 0;
      const lineSubtotal = unitPrice * quantity;
      const lineShipping = quantity > 0 ? 3 + Math.max(0, quantity - 1) * 2 : 0;
      subtotal += lineSubtotal;
      shipping += lineShipping;
      quotedLines.push({
        sku: product.sku,
        name: product.commerce?.displayName || product.perfumeName,
        quantity,
        unitPrice,
        priceTier: tier?.label || null,
        subtotal: roundMoney(lineSubtotal),
        estimatedShipping: roundMoney(lineShipping),
        available: product.inventory >= quantity,
        currentInventory: product.inventory
      });
    }

    res.json({
      ok: true,
      revision: state.revision,
      currency: "USD",
      dropship: true,
      lines: quotedLines,
      totals: {
        subtotal: roundMoney(subtotal),
        estimatedShipping: roundMoney(shipping),
        estimatedTotal: roundMoney(subtotal + shipping)
      },
      policy: state.policy.shipping
    });
  });

  app.post("/api/inventory/locks", requireApiKey, (req, res) => {
    if (IS_VERCEL) {
      res.status(501).json({
        ok: false,
        error: "Inventory locks need persistent storage before they can run on Vercel.",
        message: "Move lock storage to KV/Postgres before accepting live seller orders."
      });
      return;
    }
    const state = loadState();
    const enriched = enrichProducts(state.products);
    const items = normalizeOrderItems(req.body?.items);
    if (!items.length) {
      res.status(400).json({ ok: false, error: "Expected items: [{ sku, quantity }]" });
      return;
    }
    const store = readLockStore();
    store.locks = activeLocks(store);
    const lockedBySku = lockedQuantityBySku(store);
    const lines = items.map((item) => {
      const product = enriched.find((entry) => normalizeHeader(entry.sku) === normalizeHeader(item.sku));
      const skuKey = normalizeHeader(item.sku);
      const locked = lockedBySku[skuKey] || 0;
      const currentInventory = product?.inventory || 0;
      const availableToLock = Math.max(0, currentInventory - locked);
      return {
        sku: item.sku,
        quantity: item.quantity,
        known: Boolean(product),
        currentInventory,
        alreadyLocked: locked,
        availableToLock,
        canLock: Boolean(product) && availableToLock >= item.quantity
      };
    });
    if (lines.some((line) => !line.known || !line.canLock)) {
      writeLockStore(store);
      res.status(409).json({ ok: false, error: "Insufficient inventory for one or more SKUs.", lines });
      return;
    }
    const ttlMinutes = Math.min(120, Math.max(5, parseInteger(req.body?.ttlMinutes) || 30));
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const lock = {
      id: makeId("lock"),
      status: "active",
      createdAt,
      expiresAt,
      ttlMinutes,
      sellerOrderId: normalizeText(req.body?.sellerOrderId || ""),
      platform: normalizeText(req.body?.platform || ""),
      items: lines.map(({ sku, quantity }) => ({ sku, quantity }))
    };
    store.locks.push(lock);
    writeLockStore(store);
    res.status(201).json({ ok: true, revision: state.revision, lock, lines });
  });

  app.get("/api/inventory/locks", requireApiKey, (_req, res) => {
    const store = readLockStore();
    store.locks = activeLocks(store);
    writeLockStore(store);
    res.json({ ok: true, total: store.locks.length, locks: store.locks });
  });

  app.post("/api/inventory/locks/:id/release", requireApiKey, (req, res) => {
    const store = readLockStore();
    const lock = (store.locks || []).find((item) => item.id === req.params.id);
    if (!lock) {
      res.status(404).json({ ok: false, error: "Inventory lock not found." });
      return;
    }
    lock.status = "released";
    lock.releasedAt = nowIso();
    lock.releaseReason = normalizeText(req.body?.reason || "manual_release");
    writeLockStore(store);
    res.json({ ok: true, lock });
  });

  app.post("/api/dropship/orders", requireApiKey, (req, res) => {
    const state = loadState();
    const quoteReq = { body: { items: req.body?.items || [] } };
    const customer = req.body?.shipTo || {};
    if (!customer.name || !customer.country || !customer.address1) {
      res.status(400).json({ ok: false, error: "Missing shipTo.name, shipTo.country, or shipTo.address1." });
      return;
    }
    const enriched = enrichProducts(state.products);
    const lines = Array.isArray(quoteReq.body.items) ? quoteReq.body.items : [];
    const normalizedLines = lines.map((line) => {
      const product = enriched.find((item) => normalizeHeader(item.sku) === normalizeHeader(line.sku));
      return {
        sku: normalizeText(line.sku),
        quantity: Math.max(1, parseInteger(line.quantity) || 1),
        known: Boolean(product),
        available: product ? product.inventory >= (Math.max(1, parseInteger(line.quantity) || 1)) : false
      };
    });
    if (!normalizedLines.length || normalizedLines.some((line) => !line.known)) {
      res.status(400).json({ ok: false, error: "Order contains missing or unknown SKU.", lines: normalizedLines });
      return;
    }
    if (normalizedLines.some((line) => !line.available)) {
      res.status(409).json({ ok: false, error: "Order contains insufficient inventory.", lines: normalizedLines });
      return;
    }
    const lockId = normalizeText(req.body?.lockId || "");
    if (lockId) {
      const store = readLockStore();
      const lock = (store.locks || []).find((item) => item.id === lockId);
      if (!lock || lock.status !== "active" || new Date(lock.expiresAt) <= new Date()) {
        res.status(409).json({ ok: false, error: "Inventory lock is missing, expired, or inactive.", lockId });
        return;
      }
      lock.status = "converted";
      lock.convertedAt = nowIso();
      writeLockStore(store);
    }
    res.status(202).json({
      ok: true,
      status: "draft_received",
      orderDraftId: `DS-${Date.now()}`,
      revision: state.revision,
      lockId: lockId || null,
      lines: normalizedLines,
      shipTo: {
        name: customer.name,
        country: customer.country,
        province: customer.province || "",
        city: customer.city || "",
        address1: customer.address1,
        postalCode: customer.postalCode || ""
      },
      message: "Draft accepted locally. Add authentication and fulfillment connector before production use."
    });
  });

  app.get("/api/docs", (_req, res) => {
    res.json({
      ok: true,
      title: "Perfume Inventory API",
      endpoints: [
        { method: "GET", path: "/api/health", description: "Service status and latest revision." },
        { method: "GET", path: "/api/sync/status", description: "Integration guide for seller stores, auth, webhooks, polling, and order flow." },
        { method: "GET", path: "/api/agent/inventory", description: "Compact inventory payload for agents." },
        { method: "GET", path: "/api/inventory", description: "Full inventory, policy, source metadata, and raw rows." },
        { method: "GET", path: "/api/inventory?format=agent", description: "Same compact payload as /api/agent/inventory." },
        { method: "GET", path: "/api/products?q=lattafa&limit=50&offset=0", description: "Search products." },
        { method: "GET", path: "/api/products/:sku", description: "Read one product by SKU." },
        { method: "GET", path: "/api/products/:sku/pack", description: "Download one ecommerce listing product pack." },
        { method: "GET", path: "/api/catalog-pack?format=json", description: "Download all product listing packs as JSON." },
        { method: "GET", path: "/api/catalog-pack?format=csv", description: "Download all product listing packs as CSV." },
        { method: "GET", path: "/api/changes?since=:revision", description: "Pull changed products since the last known revision for polling fallback." },
        { method: "GET", path: "/api/webhooks/subscriptions", description: "List seller-store webhook subscriptions." },
        { method: "POST", path: "/api/webhooks/subscriptions", description: "Create or update a webhook subscription with { url, events, platform }." },
        { method: "POST", path: "/api/webhooks/subscriptions/:id/test", description: "Send a signed test event to a seller webhook URL." },
        { method: "DELETE", path: "/api/webhooks/subscriptions/:id", description: "Delete a webhook subscription." },
        { method: "GET", path: "/api/stock?sku=YKW-LA-FEN", description: "Read stock and price tiers for one SKU." },
        { method: "POST", path: "/api/inventory/locks", description: "Lock stock before submitting a seller dropship order." },
        { method: "GET", path: "/api/inventory/locks", description: "List active inventory locks." },
        { method: "POST", path: "/api/inventory/locks/:id/release", description: "Release an active inventory lock." },
        { method: "POST", path: "/api/dropship/quote", description: "Estimate dropship item totals and shipping." },
        { method: "POST", path: "/api/dropship/orders", description: "Create a dropship order draft, optionally converting a lockId." },
        { method: "GET", path: "/api/policy", description: "Read supply and after-sales policy." },
        { method: "POST", path: "/api/upload", description: "Upload a new Excel/CSV file with multipart field name file." },
        { method: "POST", path: "/api/import-default", description: "Import C:\\Users\\DELL\\Desktop\\Inventory.xlsx from this machine." }
      ],
      auth: {
        header: "x-sourceflow-api-key",
        bearerSupported: true,
        requiredWhenEnvSet: "SOURCEFLOW_API_KEY"
      },
      webhookSignature: {
        header: "x-sourceflow-signature",
        algorithm: "HMAC-SHA256",
        secretEnv: "SOURCEFLOW_WEBHOOK_SECRET"
      }
    });
  });

  app.post("/api/upload", (req, res, next) => {
    if (IS_VERCEL) {
      res.status(501).json({
        ok: false,
        error: "Inventory uploads need persistent storage before they can run on Vercel.",
        message: "The public catalog and read APIs are live. Connect Vercel Blob/KV/Postgres or Supabase for cloud inventory updates."
      });
      return;
    }
    next();
  }, upload.single("file"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ ok: false, error: "No file uploaded. Use multipart/form-data field name: file" });
      return;
    }
    try {
      const state = parseInventoryWorkbook(req.file.path, { sheetName: req.body.sheetName });
      saveState(state);
      res.json({
        ok: true,
        revision: state.revision,
        source: state.source,
        summary: state.summary,
        sample: state.products.slice(0, 3)
      });
    } catch (error) {
      res.status(422).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/import-default", (_req, res) => {
    if (IS_VERCEL) {
      res.status(501).json({
        ok: false,
        error: "Desktop import is only available in the local admin environment.",
        message: "On Vercel, inventory should be updated through a connected cloud database or storage bucket."
      });
      return;
    }
    try {
      if (!fs.existsSync(DEFAULT_SOURCE_FILE)) {
        res.status(404).json({ ok: false, error: `Default file not found: ${DEFAULT_SOURCE_FILE}` });
        return;
      }
      const state = parseInventoryWorkbook(DEFAULT_SOURCE_FILE);
      saveState(state);
      res.json({
        ok: true,
        revision: state.revision,
        source: state.source,
        summary: state.summary,
        sample: state.products.slice(0, 3)
      });
    } catch (error) {
      res.status(422).json({ ok: false, error: error.message });
    }
  });

  app.use((error, _req, res, _next) => {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ ok: false, error: error.message });
  });

  app.use(express.static(PUBLIC_DIR));
  app.get(["/catalog", "/dropship", "/api-center", "/admin", "/products/:sku"], (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });

  return app;
}

async function runCli() {
  const command = process.argv[2];
  if (command === "import") {
    const filePath = process.argv[3] || DEFAULT_SOURCE_FILE;
    const state = parseInventoryWorkbook(filePath);
    saveState(state);
    console.log(JSON.stringify({ ok: true, revision: state.revision, source: state.source, assets: state.assets, summary: state.summary }, null, 2));
    return;
  }

  const app = buildApp();
  app.listen(PORT, () => {
    console.log(`Perfume inventory API running at http://localhost:${PORT}`);
    console.log(`Upload and docs page: http://localhost:${PORT}/`);
  });
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildApp,
  parseInventoryWorkbook,
  loadState,
  saveState,
  toAgentPayload
};
