/**
 * One-time ingestion: "ELL100 LQ-1 29-01-2020.docx" → built-in ELL 1000 bank.
 *
 *   1. Parse MCQs (yellow-highlighted option = correct answer).
 *   2. Map figures → embedded images (last image ref before each "Fig. N" caption).
 *   3. Convert .emf → PNG (LibreOffice headless) and trim whitespace (sharp).
 *   4. Emit  public/ell100/fig-N.png  and  src/lib/data/ell100.ts.
 *
 * Run: node scripts/extract-ell100.mjs
 */
import JSZip from "jszip";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";

const SRC = "C:/Users/Duke/Downloads/ELL100 LQ-1 29-01-2020.docx";
const SOFFICE = "C:/Program Files/LibreOffice/program/soffice.exe";
const OUT_IMG = "public/ell100";
const TMP = "scripts/_tmp";

const zip = await JSZip.loadAsync(readFileSync(SRC));
const xml = await zip.file("word/document.xml").async("string");
const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");

// ── relationships: rId → media filename ──
const rels = {};
for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
  rels[m[1]] = m[2].replace(/^media\//, "");
}

const paraBlocks = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((m) => m[0]);
const cleanText = (b) =>
  [...b.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((m) => m[1])
    .join("")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, " ").trim();

// ── figure map: last image ref before each "Fig. N" caption ──
const figMap = {};
let lastMedia = null;
for (const b of paraBlocks) {
  const refs = [
    ...[...b.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1]),
    ...[...b.matchAll(/<v:imagedata[^>]*r:id="([^"]+)"/g)].map((m) => m[1]),
  ];
  for (const r of refs) if (rels[r]) lastMedia = rels[r];
  const cap = cleanText(b).match(/^(fig\.?|figure)\s*[-.]?\s*(\d+)\s*$/i);
  if (cap && !figMap[Number(cap[2])]) figMap[Number(cap[2])] = lastMedia;
}
// Manual overrides (caption-adjacency ambiguous for these):
Object.assign(figMap, {
  1: "image1.emf", 11: "image12.emf", 28: "image29.emf", 29: "image30.emf",
});

// ── parse questions ──
const paras = paraBlocks.map((b) => ({
  text: cleanText(b),
  numId: (b.match(/<w:numId w:val="(\d+)"/) || [])[1] || null,
  highlight: /<w:highlight w:val="(?!none)[^"]+"/.test(b),
  hasImage: /<w:drawing>|<w:pict>|<v:imagedata|<a:blip/.test(b),
}));
const optionListNumIds = new Set(paras.filter((p) => p.numId && p.highlight).map((p) => p.numId));
const isBracket = (t) => /^\s*\[[A-Da-d]\]/.test(t);
const isOption = (p) => isBracket(p.text) || (p.numId && optionListNumIds.has(p.numId));
const SKIP = /^(DEPARTMENT OF|ELL100:|TIME-|Name:|Note:|_{5,}|Group|Entry No|MAXIMUM|LECTURE|<w:)/i;
const isCap = (t) => /^(fig\.?|figure)\s*[-.]?\s*\d+\s*$/i.test(t);
const stripBracket = (t) => t.replace(/^\s*\[[A-Da-d]\]\s*/, "").replace(/\s*,\s*$/, "").trim();
const stripNum = (t) => t.replace(/^\d{1,3}\s*[.)]\s*/, "").trim();

const groups = [];
let cur = null;
for (const p of paras) {
  if (!p.text) continue;
  if (SKIP.test(p.text) || isCap(p.text)) continue;
  if (isOption(p)) {
    if (cur) cur.options.push({ text: stripBracket(p.text), correct: p.highlight });
  } else {
    if (cur) groups.push(cur);
    const fig = p.text.match(/\b(?:fig\.?|figure)\s*[-.]?\s*(\d+)/i);
    cur = { prompt: stripNum(p.text), figure: fig ? Number(fig[1]) : null, options: [], subjective: /\banswer\s*:/i.test(p.text) };
  }
}
if (cur) groups.push(cur);

// keep clean MCQs; apply one manual fix for a doc typo (merged RL options)
const usable = [];
for (const g of groups) {
  if (/time constant for an RL circuit with R = 2/i.test(g.prompt)) {
    g.options = [
      { text: "0.5 s", correct: false }, { text: "2 s", correct: true },
      { text: "4 s", correct: false }, { text: "8 s", correct: false },
    ];
  }
  const correct = g.options.filter((o) => o.correct).length;
  if (g.options.length === 4 && correct === 1 && !g.subjective) usable.push(g);
}

// ── figures needed, convert + trim ──
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_IMG, { recursive: true });

const neededFigs = [...new Set(usable.map((q) => q.figure).filter(Boolean))];
const emfToConvert = [];
const mediaForFig = {};
for (const n of neededFigs) {
  const media = figMap[n];
  if (!media) continue;
  mediaForFig[n] = media;
  const buf = await zip.file(`word/media/${media}`)?.async("nodebuffer");
  if (!buf) continue;
  writeFileSync(`${TMP}/${media}`, buf);
  if (media.endsWith(".emf")) emfToConvert.push(`${TMP}/${media}`);
}
if (emfToConvert.length) {
  execFileSync(SOFFICE, ["--headless", "--convert-to", "png", "--outdir", TMP, ...emfToConvert], { stdio: "ignore" });
}

const figUrl = {};
for (const n of neededFigs) {
  const media = mediaForFig[n];
  if (!media) continue;
  const src = media.endsWith(".emf") ? `${TMP}/${media.replace(/\.emf$/, ".png")}` : `${TMP}/${media}`;
  if (!existsSync(src)) continue;
  const out = `${OUT_IMG}/fig-${n}.png`;
  await sharp(src).flatten({ background: "#ffffff" }).trim({ threshold: 12 })
    .resize({ width: 900, withoutEnlargement: true }).png().toFile(out);
  figUrl[n] = `/ell100/fig-${n}.png`;
}

// ── emit seed module ──
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const qLines = usable.map((q, i) => {
  const opts = q.options
    .map((o, j) => `      { id: "${"abcd"[j]}", text: \`${esc(o.text)}\`, correct: ${o.correct} },`)
    .join("\n");
  const media = q.figure && figUrl[q.figure] ? `\n    media: "${figUrl[q.figure]}",` : "";
  return `  {
    id: "ell100-q${i + 1}",
    levelId: "",
    prompt: \`${esc(q.prompt)}\`,
    baseType: "single",
    difficulty: 1,
    allowedTransforms: ["single"],${media}
    options: [
${opts}
    ],
  },`;
}).join("\n");

const module = `/**
 * Built-in ELL 1000 question bank — sourced from the IIT Delhi ELL100
 * "Introduction to Electrical Engineering" Lecture Quiz-I.
 *
 * AUTO-GENERATED by scripts/extract-ell100.mjs — do not edit by hand.
 * ${usable.length} MCQs (${neededFigs.length} with figures). Correct answers are the
 * options that were highlighted in the source document.
 */
import type { AuthoredQuestion } from "@/lib/domain/types";

export const ELL100_COURSE_TITLE = "ELL 1000: Introduction to Electrical Engineering";
export const ELL100_COURSE_SUBTITLE = "Department of Electrical Engineering · Lecture Quiz-I";

export const ELL100_QUESTIONS: AuthoredQuestion[] = [
${qLines}
];
`;
writeFileSync("src/lib/data/ell100.ts", module);

console.log("usable MCQs:", usable.length);
console.log("figures needed:", neededFigs.length, "| converted:", Object.keys(figUrl).length);
console.log("figure files:", readdirSync(OUT_IMG).join(", "));
const missing = neededFigs.filter((n) => !figUrl[n]);
if (missing.length) console.log("!! figures WITHOUT image:", missing.join(", "));
