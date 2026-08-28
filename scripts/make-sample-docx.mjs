/**
 * Generates a sample question-bank Word document (sample-questions.docx) in the
 * project root, in the format the uploader expects. 120 MCQs → splits into
 * Test 1 (100 Q) + Test 2 (20 Q). Run: node scripts/make-sample-docx.mjs
 */
import JSZip from "jszip";
import { writeFileSync } from "node:fs";

const N = 120;
const lines = [];
for (let i = 1; i <= N; i++) {
  const a = (i % 9) + 1;
  const b = (i % 7) + 2;
  const sum = a + b;
  const opts = [sum - 1, sum, sum + 2, sum + 5]; // B is always correct
  lines.push(`${i}. What is ${a} + ${b}?`);
  lines.push(`A) ${opts[0]}`);
  lines.push(`B) ${opts[1]}`);
  lines.push(`C) ${opts[2]}`);
  lines.push(`D) ${opts[3]}`);
  lines.push(`Answer: B`);
  lines.push("");
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paras = lines
  .map((l) => `<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`)
  .join("");

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paras}</w:body></w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const zip = new JSZip();
zip.file("[Content_Types].xml", contentTypes);
zip.file("_rels/.rels", rels);
zip.file("word/document.xml", documentXml);

const buf = await zip.generateAsync({ type: "nodebuffer" });
writeFileSync("sample-questions.docx", buf);
console.log(`Wrote sample-questions.docx (${N} questions, ${buf.length} bytes)`);
