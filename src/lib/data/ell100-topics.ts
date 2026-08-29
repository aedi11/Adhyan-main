/**
 * Topic structure for the built-in ELL 1000 course.
 *
 * The 66 questions in `ell100.ts` (auto-generated from the IIT Delhi ELL100
 * Lecture Quiz-I) are grouped here into 7 topics. This drives:
 *   - the teacher's topic-wise view of the course, and
 *   - topic-balanced test generation (every test covers every topic, with a
 *     different per-student draw from each topic's pool).
 *
 * Question ids are `ell100-q{n}` as emitted by scripts/extract-ell100.mjs.
 */
export interface Ell100Topic {
  id: string;
  title: string;
  blurb: string;
  questionIds: string[];
}

const q = (...ns: number[]) => ns.map((n) => `ell100-q${n}`);

export const ELL100_TOPICS: Ell100Topic[] = [
  {
    id: "basics",
    title: "Basic Concepts",
    blurb: "Charge, current, voltage, energy and power.",
    questionIds: q(1, 2, 6, 7, 8, 9, 10, 11),
  },
  {
    id: "elements",
    title: "Circuit Elements & Devices",
    blurb: "Resistors, inductors, capacitors and diodes.",
    questionIds: q(3, 4, 5, 12, 13, 14, 15, 19),
  },
  {
    id: "kirchhoff",
    title: "Kirchhoff's Laws & Network Graph",
    blurb: "KCL, KVL, nodes, branches, loops and meshes.",
    questionIds: q(16, 25, 26, 27, 28, 36, 37, 38),
  },
  {
    id: "nodal",
    title: "Nodal Analysis",
    blurb: "Node voltages, supernodes and reference nodes.",
    questionIds: q(18, 29, 30, 31, 35, 39, 40, 41, 42),
  },
  {
    id: "resistive",
    title: "Resistive Networks & Star–Delta",
    blurb: "Series/parallel, source transformation and Y–Δ conversion.",
    questionIds: q(17, 20, 21, 22, 23, 24, 32, 33, 34, 56),
  },
  {
    id: "theorems",
    title: "Network Theorems",
    blurb: "Thévenin, Norton, superposition and maximum power transfer.",
    questionIds: q(43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55),
  },
  {
    id: "transients",
    title: "Transient Analysis",
    blurb: "First-order RC/RL circuits and time constants.",
    questionIds: q(57, 58, 59, 60, 61, 62, 63, 64, 65, 66),
  },
];

/**
 * How many questions each test draws from EVERY topic, so a test always spans
 * the whole syllabus. 21 topics × 5 = 105 questions per 2-hour test.
 */
export const PER_TOPIC_PER_TEST = 5;

/** Number of tests offered for the ELL 1000 course. */
export const ELL100_TEST_COUNT = 10;

/** topic id → topic, and question id → topic id (built once). */
export const ELL100_TOPIC_OF = new Map<string, string>();
for (const t of ELL100_TOPICS) for (const qid of t.questionIds) ELL100_TOPIC_OF.set(qid, t.id);
