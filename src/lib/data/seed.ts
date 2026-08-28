/**
 * Demo seed content. In production this comes from Supabase; here it lets the
 * full app run end-to-end without external services. Mirrors the real schema.
 */
import type { AuthoredQuestion, Course } from "@/lib/domain/types";

/**
 * A level is purely a difficulty step within a topic. Students only ever see
 * "Level N" — the `concept` arg is an author-facing note and is never shown.
 * Levels ascend in difficulty; questions inside one level share that difficulty.
 */
function level(
  id: string,
  topicId: string,
  index: number,
  concept: string,
  questionIds: string[],
  timeLimitSec = 180,
) {
  return {
    id,
    topicId,
    index,
    title: `Level ${index + 1}`,
    concept,
    passThreshold: 70,
    minQuestions: Math.min(4, questionIds.length),
    timeLimitSec,
    questionIds,
  };
}

export const DEMO_COURSE: Course = {
  id: "course-qa",
  title: "Quantitative Aptitude",
  description:
    "Master the quant section for campus placements & competitive exams — arithmetic, speed-distance-time, percentages, and more. Adaptive, gamified, exam-ready.",
  subject: "Aptitude",
  pricePerMonth: 299,
  trialDays: 7,
  topics: [
    {
      id: "topic-sdt",
      courseId: "course-qa",
      index: 0,
      title: "Speed, Distance & Time",
      unlockLevelIndex: 1, // clear level index 1 to unlock next topic
      levels: [
        level("lvl-sdt-1", "topic-sdt", 0, "Basics", [
          "q-sdt-1",
          "q-sdt-2",
          "q-sdt-3",
          "q-sdt-4",
        ]),
        level("lvl-sdt-2", "topic-sdt", 1, "Average Speed", [
          "q-sdt-5",
          "q-sdt-6",
          "q-sdt-7",
          "q-sdt-8",
        ]),
        level("lvl-sdt-3", "topic-sdt", 2, "Trains & Relative Speed", [
          "q-sdt-9",
          "q-sdt-10",
          "q-sdt-11",
          "q-sdt-12",
        ]),
      ],
    },
    {
      id: "topic-pct",
      courseId: "course-qa",
      index: 1,
      title: "Percentages",
      unlockLevelIndex: 1,
      levels: [
        level("lvl-pct-1", "topic-pct", 0, "Percentage Basics", [
          "q-pct-1",
          "q-pct-2",
          "q-pct-3",
          "q-pct-4",
        ]),
        level("lvl-pct-2", "topic-pct", 1, "Profit & Loss", [
          "q-pct-5",
          "q-pct-6",
          "q-pct-7",
          "q-pct-8",
        ]),
        level("lvl-pct-3", "topic-pct", 2, "Successive Change", [
          "q-pct-9",
          "q-pct-10",
          "q-pct-11",
          "q-pct-12",
        ]),
      ],
    },
  ],
};

export const DEMO_COURSE_2: Course = {
  id: "course-na",
  title: "Number Systems & Algebra",
  description:
    "Build rock-solid fundamentals in number theory and algebra — the backbone of every aptitude and entrance exam.",
  subject: "Mathematics",
  pricePerMonth: 249,
  trialDays: 7,
  topics: [
    {
      id: "topic-num",
      courseId: "course-na",
      index: 0,
      title: "Number Systems",
      unlockLevelIndex: 1,
      levels: [
        level("lvl-num-1", "topic-num", 0, "Divisibility & Factors", [
          "q-num-1",
          "q-num-2",
          "q-num-3",
        ]),
        level("lvl-num-2", "topic-num", 1, "HCF & LCM", ["q-num-4", "q-num-5", "q-num-6"]),
      ],
    },
    {
      id: "topic-alg",
      courseId: "course-na",
      index: 1,
      title: "Algebra Basics",
      unlockLevelIndex: 1,
      levels: [
        level("lvl-alg-1", "topic-alg", 0, "Linear Equations", [
          "q-alg-1",
          "q-alg-2",
          "q-alg-3",
        ]),
        level("lvl-alg-2", "topic-alg", 1, "Ratios & Proportion", [
          "q-alg-4",
          "q-alg-5",
          "q-alg-6",
        ]),
      ],
    },
  ],
};

/** All published courses — the catalog shown on /learn. */
export const DEMO_COURSES: Course[] = [DEMO_COURSE, DEMO_COURSE_2];

/**
 * Question bank. Parameterized questions (variables + answerFormula) generate
 * near-infinite per-student variants; the engine computes answers deterministically.
 */
export const DEMO_QUESTIONS: Record<string, AuthoredQuestion> = {
  // --- Speed, Distance & Time : Basics (parameterized) ---
  "q-sdt-1": {
    id: "q-sdt-1",
    levelId: "lvl-sdt-1",
    prompt: "A car travels at {v} km/h for {t} hours. What distance does it cover (km)?",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "v", min: 40, max: 90, step: 5 },
      { name: "t", min: 2, max: 6 },
    ],
    answerFormula: "v * t",
    allowedTransforms: ["integer", "single"],
    explanation: "Distance = Speed × Time.",
  },
  "q-sdt-2": {
    id: "q-sdt-2",
    levelId: "lvl-sdt-1",
    prompt: "A cyclist covers {d} km in {t} hours. Find the speed (km/h).",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "t", min: 2, max: 5 },
      { name: "d", min: 20, max: 100, step: 10 },
    ],
    answerFormula: "d / t",
    allowedTransforms: ["integer", "single"],
    explanation: "Speed = Distance ÷ Time.",
  },
  "q-sdt-3": {
    id: "q-sdt-3",
    levelId: "lvl-sdt-1",
    prompt: "Convert {v} m/s to km/h.",
    baseType: "integer",
    difficulty: 1,
    variables: [{ name: "v", min: 5, max: 25 }],
    answerFormula: "v * 18 / 5",
    allowedTransforms: ["integer"],
    explanation: "Multiply m/s by 18/5 to get km/h.",
  },
  "q-sdt-4": {
    id: "q-sdt-4",
    levelId: "lvl-sdt-1",
    prompt: "Doubling the speed while keeping distance fixed halves the time taken.",
    baseType: "true_false",
    difficulty: 1,
    options: [
      { id: "a", text: "True", correct: true },
      { id: "b", text: "False", correct: false },
    ],
    allowedTransforms: ["true_false"],
    explanation: "Time = Distance ÷ Speed, so doubling speed halves the time.",
  },

  // --- Average Speed (static authored) ---
  "q-sdt-5": {
    id: "q-sdt-5",
    levelId: "lvl-sdt-2",
    prompt:
      "A man goes from A to B at 40 km/h and returns at 60 km/h. What is his average speed for the whole journey?",
    baseType: "single",
    difficulty: 2,
    options: [
      { id: "a", text: "48 km/h", correct: true },
      { id: "b", text: "50 km/h", correct: false },
      { id: "c", text: "45 km/h", correct: false },
      { id: "d", text: "52 km/h", correct: false },
    ],
    allowedTransforms: ["single", "integer"],
    answerValue: 48,
    explanation: "Average speed = 2xy/(x+y) = 2·40·60/100 = 48 km/h.",
  },
  "q-sdt-6": {
    id: "q-sdt-6",
    levelId: "lvl-sdt-2",
    prompt: "Average speed equals the arithmetic mean of the two speeds when distances are equal.",
    baseType: "true_false",
    difficulty: 2,
    options: [
      { id: "a", text: "True", correct: false },
      { id: "b", text: "False", correct: true },
    ],
    allowedTransforms: ["true_false"],
    explanation: "For equal distances it's the harmonic mean, not the arithmetic mean.",
  },
  "q-sdt-7": {
    id: "q-sdt-7",
    levelId: "lvl-sdt-2",
    prompt: "A car covers {d} km at {v} km/h. How many minutes does it take?",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "v", min: 30, max: 60, step: 10 },
      { name: "d", min: 30, max: 120, step: 30 },
    ],
    answerFormula: "d / v * 60",
    allowedTransforms: ["integer"],
    explanation: "Time = Distance ÷ Speed, then convert hours to minutes.",
  },
  "q-sdt-8": {
    id: "q-sdt-8",
    levelId: "lvl-sdt-2",
    prompt: "If speed increases by {p}% with distance fixed, time decreases. Find new time factor numerator over 100.",
    baseType: "integer",
    difficulty: 3,
    variables: [{ name: "p", min: 20, max: 50, step: 10 }],
    answerFormula: "10000 / (100 + p)",
    allowedTransforms: ["integer"],
    explanation: "New time = old × 100/(100+p).",
  },

  // --- Trains & Relative Speed ---
  "q-sdt-9": {
    id: "q-sdt-9",
    levelId: "lvl-sdt-3",
    prompt: "Two trains move toward each other at {a} and {b} km/h. Relative speed (km/h)?",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "a", min: 40, max: 80, step: 10 },
      { name: "b", min: 30, max: 70, step: 10 },
    ],
    answerFormula: "a + b",
    allowedTransforms: ["integer", "single"],
    explanation: "Opposite directions: relative speed = sum of speeds.",
  },
  "q-sdt-10": {
    id: "q-sdt-10",
    levelId: "lvl-sdt-3",
    prompt: "Two trains move in the same direction at {a} and {b} km/h. Relative speed (km/h)?",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "a", min: 60, max: 90, step: 10 },
      { name: "b", min: 20, max: 50, step: 10 },
    ],
    answerFormula: "a - b",
    allowedTransforms: ["integer"],
    explanation: "Same direction: relative speed = difference of speeds.",
  },
  "q-sdt-11": {
    id: "q-sdt-11",
    levelId: "lvl-sdt-3",
    prompt: "A {l} m train crosses a pole at {v} m/s. Time taken (seconds)?",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "v", min: 10, max: 20, step: 5 },
      { name: "l", min: 100, max: 300, step: 50 },
    ],
    answerFormula: "l / v",
    allowedTransforms: ["integer"],
    explanation: "Crossing a pole: time = length ÷ speed.",
  },
  "q-sdt-12": {
    id: "q-sdt-12",
    levelId: "lvl-sdt-3",
    prompt: "Relative speed is always the sum of the two speeds, regardless of direction.",
    baseType: "true_false",
    difficulty: 1,
    options: [
      { id: "a", text: "True", correct: false },
      { id: "b", text: "False", correct: true },
    ],
    allowedTransforms: ["true_false"],
    explanation: "Only when moving in opposite directions; same direction uses the difference.",
  },

  // --- Percentages : Basics ---
  "q-pct-1": {
    id: "q-pct-1",
    levelId: "lvl-pct-1",
    prompt: "What is {p}% of {n}?",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "p", min: 10, max: 50, step: 5 },
      { name: "n", min: 100, max: 400, step: 50 },
    ],
    answerFormula: "p * n / 100",
    allowedTransforms: ["integer", "single"],
    explanation: "x% of n = (x/100) × n.",
  },
  "q-pct-2": {
    id: "q-pct-2",
    levelId: "lvl-pct-1",
    prompt: "If {n} is increased by {p}%, what is the new value?",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "p", min: 10, max: 40, step: 10 },
      { name: "n", min: 100, max: 300, step: 50 },
    ],
    answerFormula: "n * (100 + p) / 100",
    allowedTransforms: ["integer"],
    explanation: "New = n × (100 + p)/100.",
  },
  "q-pct-3": {
    id: "q-pct-3",
    levelId: "lvl-pct-1",
    prompt: "Express {a} out of {b} as a percentage.",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "a", min: 10, max: 50, step: 10 },
      { name: "b", min: 50, max: 100, step: 25 },
    ],
    answerFormula: "a / b * 100",
    allowedTransforms: ["integer"],
    explanation: "Percentage = (a/b) × 100.",
  },
  "q-pct-4": {
    id: "q-pct-4",
    levelId: "lvl-pct-1",
    prompt: "A 25% increase followed by a 20% decrease returns to the original value.",
    baseType: "true_false",
    difficulty: 2,
    options: [
      { id: "a", text: "True", correct: true },
      { id: "b", text: "False", correct: false },
    ],
    allowedTransforms: ["true_false"],
    explanation: "1.25 × 0.80 = 1.0 — back to the original.",
  },

  // --- Profit & Loss ---
  "q-pct-5": {
    id: "q-pct-5",
    levelId: "lvl-pct-2",
    prompt: "An item bought for ₹{cp} is sold for ₹{sp}. Find the profit percentage.",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "cp", min: 100, max: 200, step: 50 },
      { name: "sp", min: 250, max: 400, step: 50 },
    ],
    answerFormula: "(sp - cp) / cp * 100",
    allowedTransforms: ["integer"],
    explanation: "Profit% = (SP − CP)/CP × 100.",
  },
  "q-pct-6": {
    id: "q-pct-6",
    levelId: "lvl-pct-2",
    prompt: "Selling at cost price means there is no profit and no loss.",
    baseType: "true_false",
    difficulty: 1,
    options: [
      { id: "a", text: "True", correct: true },
      { id: "b", text: "False", correct: false },
    ],
    allowedTransforms: ["true_false"],
    explanation: "SP = CP ⇒ zero profit, zero loss.",
  },
  "q-pct-7": {
    id: "q-pct-7",
    levelId: "lvl-pct-2",
    prompt: "A shopkeeper marks up by {p}% and gives no discount. Selling price of a ₹{cp} item?",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "p", min: 10, max: 40, step: 10 },
      { name: "cp", min: 100, max: 250, step: 50 },
    ],
    answerFormula: "cp * (100 + p) / 100",
    allowedTransforms: ["integer"],
    explanation: "SP = CP × (100 + markup%)/100.",
  },
  "q-pct-8": {
    id: "q-pct-8",
    levelId: "lvl-pct-2",
    prompt: "If CP = ₹{cp} and loss = {p}%, find the selling price (₹).",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "p", min: 10, max: 30, step: 10 },
      { name: "cp", min: 100, max: 300, step: 100 },
    ],
    answerFormula: "cp * (100 - p) / 100",
    allowedTransforms: ["integer"],
    explanation: "SP = CP × (100 − loss%)/100.",
  },

  // --- Successive Change ---
  "q-pct-9": {
    id: "q-pct-9",
    levelId: "lvl-pct-3",
    prompt: "A salary rises {a}% then {b}%. Net percentage change is approximately?",
    baseType: "integer",
    difficulty: 3,
    variables: [
      { name: "a", min: 10, max: 20, step: 10 },
      { name: "b", min: 10, max: 20, step: 10 },
    ],
    answerFormula: "a + b + a * b / 100",
    allowedTransforms: ["integer"],
    explanation: "Net% = a + b + ab/100.",
  },
  "q-pct-10": {
    id: "q-pct-10",
    levelId: "lvl-pct-3",
    prompt: "Two successive 10% discounts equal a single 20% discount.",
    baseType: "true_false",
    difficulty: 2,
    options: [
      { id: "a", text: "True", correct: false },
      { id: "b", text: "False", correct: true },
    ],
    allowedTransforms: ["true_false"],
    explanation: "0.9 × 0.9 = 0.81 ⇒ 19% off, not 20%.",
  },
  "q-pct-11": {
    id: "q-pct-11",
    levelId: "lvl-pct-3",
    prompt: "A population of {n} grows {p}% per year. Population after 1 year?",
    baseType: "integer",
    difficulty: 2,
    variables: [
      { name: "p", min: 10, max: 30, step: 10 },
      { name: "n", min: 1000, max: 5000, step: 1000 },
    ],
    answerFormula: "n * (100 + p) / 100",
    allowedTransforms: ["integer"],
    explanation: "Apply the growth factor once.",
  },
  "q-pct-12": {
    id: "q-pct-12",
    levelId: "lvl-pct-3",
    prompt: "A price increases {p}% then decreases {p}%. The final price is lower than the original.",
    baseType: "true_false",
    difficulty: 3,
    options: [
      { id: "a", text: "True", correct: true },
      { id: "b", text: "False", correct: false },
    ],
    allowedTransforms: ["true_false"],
    explanation: "(1+p)(1−p) = 1 − p² < 1, so it ends lower.",
  },

  // ───────── Course 2: Number Systems ─────────
  "q-num-1": {
    id: "q-num-1",
    levelId: "lvl-num-1",
    prompt: "Find the remainder when {a} is divided by {b}.",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "b", min: 3, max: 9 },
      { name: "a", min: 20, max: 99 },
    ],
    answerFormula: "a % b",
    allowedTransforms: ["integer"],
    explanation: "The remainder is what's left after dividing a by b (a mod b).",
  },
  "q-num-2": {
    id: "q-num-2",
    levelId: "lvl-num-1",
    prompt: "What is the product of {a} and {b}?",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "a", min: 6, max: 15 },
      { name: "b", min: 6, max: 15 },
    ],
    answerFormula: "a * b",
    allowedTransforms: ["integer", "single"],
    explanation: "Multiply the two numbers.",
  },
  "q-num-3": {
    id: "q-num-3",
    levelId: "lvl-num-1",
    prompt: "How many positive factors does 12 have?",
    baseType: "single",
    difficulty: 2,
    options: [
      { id: "a", text: "6", correct: true },
      { id: "b", text: "4", correct: false },
      { id: "c", text: "5", correct: false },
      { id: "d", text: "12", correct: false },
    ],
    answerValue: 6,
    allowedTransforms: ["single", "integer"],
    explanation: "Factors of 12: 1, 2, 3, 4, 6, 12 — six in total.",
  },
  "q-num-4": {
    id: "q-num-4",
    levelId: "lvl-num-2",
    prompt: "Find the LCM of 4 and 6.",
    baseType: "single",
    difficulty: 2,
    options: [
      { id: "a", text: "12", correct: true },
      { id: "b", text: "24", correct: false },
      { id: "c", text: "10", correct: false },
      { id: "d", text: "6", correct: false },
    ],
    answerValue: 12,
    allowedTransforms: ["single", "integer"],
    explanation: "LCM(4, 6) = 12.",
  },
  "q-num-5": {
    id: "q-num-5",
    levelId: "lvl-num-2",
    prompt: "Find the HCF of 12 and 18.",
    baseType: "single",
    difficulty: 2,
    options: [
      { id: "a", text: "6", correct: true },
      { id: "b", text: "3", correct: false },
      { id: "c", text: "9", correct: false },
      { id: "d", text: "12", correct: false },
    ],
    answerValue: 6,
    allowedTransforms: ["single", "integer"],
    explanation: "HCF(12, 18) = 6.",
  },
  "q-num-6": {
    id: "q-num-6",
    levelId: "lvl-num-2",
    prompt: "For any two numbers, (their product) = HCF × LCM.",
    baseType: "true_false",
    difficulty: 2,
    options: [
      { id: "a", text: "True", correct: true },
      { id: "b", text: "False", correct: false },
    ],
    allowedTransforms: ["true_false"],
    explanation: "a × b = HCF(a, b) × LCM(a, b) always holds.",
  },

  // ───────── Course 2: Algebra Basics ─────────
  "q-alg-1": {
    id: "q-alg-1",
    levelId: "lvl-alg-1",
    prompt: "If x + {a} = {b}, find x.",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "a", min: 1, max: 9 },
      { name: "b", min: 10, max: 20 },
    ],
    answerFormula: "b - a",
    allowedTransforms: ["integer"],
    explanation: "x = b − a.",
  },
  "q-alg-2": {
    id: "q-alg-2",
    levelId: "lvl-alg-1",
    prompt: "If x − {a} = {b}, find x.",
    baseType: "integer",
    difficulty: 1,
    variables: [
      { name: "a", min: 1, max: 9 },
      { name: "b", min: 5, max: 15 },
    ],
    answerFormula: "a + b",
    allowedTransforms: ["integer"],
    explanation: "x = a + b.",
  },
  "q-alg-3": {
    id: "q-alg-3",
    levelId: "lvl-alg-1",
    prompt: "Find the value of 2x + 3 when x = {a}.",
    baseType: "integer",
    difficulty: 1,
    variables: [{ name: "a", min: 2, max: 12 }],
    answerFormula: "2 * a + 3",
    allowedTransforms: ["integer", "single"],
    explanation: "Substitute x and compute 2x + 3.",
  },
  "q-alg-4": {
    id: "q-alg-4",
    levelId: "lvl-alg-2",
    prompt: "Divide {n} equally into 2 parts. What is each part?",
    baseType: "integer",
    difficulty: 2,
    variables: [{ name: "n", min: 10, max: 40, step: 2 }],
    answerFormula: "n / 2",
    allowedTransforms: ["integer"],
    explanation: "Each part = n ÷ 2.",
  },
  "q-alg-5": {
    id: "q-alg-5",
    levelId: "lvl-alg-2",
    prompt: "If a : b = 2 : 3 and a = {a}, find b.",
    baseType: "integer",
    difficulty: 2,
    variables: [{ name: "a", min: 2, max: 20, step: 2 }],
    answerFormula: "a * 3 / 2",
    allowedTransforms: ["integer"],
    explanation: "b = a × 3/2.",
  },
  "q-alg-6": {
    id: "q-alg-6",
    levelId: "lvl-alg-2",
    prompt: "In the ratio 2 : 3, the larger share corresponds to 3 parts.",
    baseType: "true_false",
    difficulty: 1,
    options: [
      { id: "a", text: "True", correct: true },
      { id: "b", text: "False", correct: false },
    ],
    allowedTransforms: ["true_false"],
    explanation: "3 > 2, so the 3-part share is the larger one.",
  },
};
