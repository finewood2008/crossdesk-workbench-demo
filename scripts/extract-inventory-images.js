const fs = require("fs");
const path = require("path");

const XLSX = require("xlsx");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "inventory-public");
const DEFAULT_SOURCE_FILE = "C:\\Users\\DELL\\Desktop\\Inventory.xlsx";
const DEFAULT_IMAGE_DIR = path.join(PUBLIC_DIR, "product-images");
const DEFAULT_IMAGE_MAP_PATH = path.join(DATA_DIR, "image-map.json");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttrs(markup) {
  const attrs = {};
  for (const match of markup.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attrs[match[1]] = xmlDecode(match[2]);
  }
  return attrs;
}

function workbookFiles(filePath) {
  const workbook = XLSX.readFile(filePath, { bookFiles: true });
  return workbook.files || {};
}

function fileText(files, name) {
  const file = files[name];
  if (!file?.content) return "";
  return Buffer.from(file.content).toString("utf8");
}

function fileBuffer(files, name) {
  const file = files[name];
  if (!file?.content) return null;
  return Buffer.from(file.content);
}

function resolveRelationshipTarget(relsPath, target) {
  if (!target || /^https?:\/\//i.test(target) || /^NULL$/i.test(target)) return null;
  const relsDir = path.posix.dirname(relsPath);
  const ownerDir = relsDir.endsWith("_rels") ? path.posix.dirname(relsDir) : relsDir;
  const cleanTarget = target.replace(/^\/+/, "");
  return path.posix.normalize(path.posix.join(ownerDir, cleanTarget));
}

function parseRelationships(xml, relsPath) {
  const relationships = {};
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = parseAttrs(match[1]);
    const resolvedTarget = resolveRelationshipTarget(relsPath, attrs.Target);
    if (!attrs.Id || !resolvedTarget) continue;
    relationships[attrs.Id] = {
      id: attrs.Id,
      target: resolvedTarget,
      type: attrs.Type || null,
      targetMode: attrs.TargetMode || null
    };
  }
  return relationships;
}

function parseCellImages(xml) {
  const images = [];
  for (const match of xml.matchAll(/<etc:cellImage\b[\s\S]*?<\/etc:cellImage>/g)) {
    const block = match[0];
    const nameMatch = block.match(/<xdr:cNvPr\b([^>]*)\/?>/);
    const embedMatch = block.match(/<a:blip\b([^>]*)\/?>/);
    if (!nameMatch || !embedMatch) continue;
    const nameAttrs = parseAttrs(nameMatch[1]);
    const blipAttrs = parseAttrs(embedMatch[1]);
    const id = nameAttrs.name;
    const relationshipId = blipAttrs["r:embed"];
    if (!id || !relationshipId) continue;
    images.push({
      id,
      relationshipId,
      description: nameAttrs.descr || null
    });
  }
  return images;
}

function safeImageName(id, mediaPath) {
  const ext = path.posix.extname(mediaPath || "").toLowerCase() || ".jpg";
  const safeId = String(id || "image").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 120);
  return `${safeId}${ext}`;
}

function extractInventoryImages(filePath = DEFAULT_SOURCE_FILE, options = {}) {
  const dataDir = options.dataDir || DATA_DIR;
  const publicDir = options.publicDir || PUBLIC_DIR;
  const imageDir = options.imageDir || path.join(publicDir, "product-images");
  const imageMapPath = options.imageMapPath || path.join(dataDir, "image-map.json");
  const sourceFile = path.resolve(filePath);

  ensureDir(dataDir);
  ensureDir(imageDir);

  const files = workbookFiles(sourceFile);
  const cellImagesXml = fileText(files, "xl/cellimages.xml");
  const relsPath = "xl/_rels/cellimages.xml.rels";
  const relsXml = fileText(files, relsPath);
  const relationships = parseRelationships(relsXml, relsPath);
  const cellImages = parseCellImages(cellImagesXml);
  const images = {};
  const missing = [];

  for (const cellImage of cellImages) {
    const relationship = relationships[cellImage.relationshipId];
    const mediaPath = relationship?.target;
    const buffer = mediaPath ? fileBuffer(files, mediaPath) : null;
    if (!mediaPath || !buffer) {
      missing.push(cellImage.id);
      continue;
    }

    const filename = safeImageName(cellImage.id, mediaPath);
    const outputPath = path.join(imageDir, filename);
    fs.writeFileSync(outputPath, buffer);
    images[cellImage.id] = {
      url: `/product-images/${filename}`,
      thumbUrl: `/product-images/${filename}`,
      source: "Inventory.xlsx",
      sourceLabel: "supplier-sheet",
      confidence: "high",
      imageId: cellImage.id,
      originalDescription: cellImage.description,
      embeddedFile: mediaPath
    };
  }

  const imageMap = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      filename: path.basename(sourceFile),
      path: sourceFile
    },
    totalCellImages: cellImages.length,
    extractedImages: Object.keys(images).length,
    missingImages: missing,
    images
  };

  fs.writeFileSync(imageMapPath, JSON.stringify(imageMap, null, 2), "utf8");
  if (!options.quiet) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          source: imageMap.source,
          totalCellImages: imageMap.totalCellImages,
          extractedImages: imageMap.extractedImages,
          missingImages: imageMap.missingImages.length,
          imageMapPath,
          imageDir
        },
        null,
        2
      )
    );
  }
  return imageMap;
}

if (require.main === module) {
  const filePath = process.argv[2] || DEFAULT_SOURCE_FILE;
  try {
    extractInventoryImages(filePath);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

module.exports = {
  extractInventoryImages,
  DEFAULT_IMAGE_DIR,
  DEFAULT_IMAGE_MAP_PATH
};
