import { clampLevel, shuffle } from "@/lib/games/memory-match";

export type Choice = { key: string; label: string };
export type ChoiceQuestion = {
  prompt: string;
  hint: string;
  /** The pictures shown above the answers. Use "?" for the missing one. */
  visual: string[];
  /** What a screen reader says for the pictures. */
  visualLabel: string;
  choices: Choice[];
  correctKey: string;
  /** A photo to show instead of the pictures above (used by "Who is this?"). */
  imageUrl?: string;
  /** Said when the answer is right, e.g. "Priya, your daughter." */
  praise?: string;
};

/** Small helper so each question below fits on a few lines. */
export function choiceQuestion(
  prompt: string,
  hint: string,
  visual: string[],
  visualLabel: string,
  choices: [key: string, label: string][],
  correctKey: string,
): ChoiceQuestion {
  return {
    prompt,
    hint,
    visual,
    visualLabel,
    choices: choices.map(([key, label]) => ({ key, label })),
    correctKey,
  };
}

const q = choiceQuestion;

/*
 * Six questions for each of the five levels, easiest first. A game uses three
 * of the six at random, so the rounds are different and replays stay fresh.
 * To add more questions, add them to a level's list (keep three answer choices
 * and make sure exactly one is right).
 */
export const PATTERN_QUESTIONS: ChoiceQuestion[][] = [
  // Level 1: two things taking turns
  [
    q(
      "What comes next?",
      "Look for the two-picture pattern.",
      ["●", "○", "●", "?"],
      "solid circle, empty circle, solid circle, missing item",
      [
        ["solid", "Solid circle ●"],
        ["empty", "Empty circle ○"],
        ["square", "Square ■"],
      ],
      "empty",
    ),
    q(
      "What comes next?",
      "The colors take turns.",
      ["🔴", "🔵", "🔴", "?"],
      "red circle, blue circle, red circle, missing item",
      [
        ["red", "Red circle"],
        ["blue", "Blue circle"],
        ["green", "Green circle"],
      ],
      "blue",
    ),
    q(
      "What comes next?",
      "Two shapes take turns.",
      ["▲", "■", "▲", "?"],
      "triangle, square, triangle, missing item",
      [
        ["triangle", "Triangle ▲"],
        ["square", "Square ■"],
        ["circle", "Circle ●"],
      ],
      "square",
    ),
    q(
      "What comes next?",
      "Day and night take turns.",
      ["☀️", "🌙", "☀️", "?"],
      "sun, moon, sun, missing item",
      [
        ["sun", "Sun"],
        ["moon", "Moon"],
        ["star", "Star"],
      ],
      "moon",
    ),
    q(
      "What comes next?",
      "Two fruits take turns.",
      ["🍎", "🍌", "🍎", "?"],
      "apple, banana, apple, missing item",
      [
        ["apple", "Apple"],
        ["banana", "Banana"],
        ["grapes", "Grapes"],
      ],
      "banana",
    ),
    q(
      "What comes next?",
      "Two numbers take turns.",
      ["1", "2", "1", "?"],
      "one, two, one, missing number",
      [
        ["1", "1"],
        ["2", "2"],
        ["3", "3"],
      ],
      "2",
    ),
  ],
  // Level 2: a short group that repeats
  [
    q(
      "What comes next?",
      "Look for the group that repeats.",
      ["🔵", "🔵", "🟡", "🔵", "🔵", "?"],
      "blue, blue, yellow, blue, blue, missing item",
      [
        ["blue", "Blue circle"],
        ["yellow", "Yellow circle"],
        ["green", "Green circle"],
      ],
      "yellow",
    ),
    q(
      "What comes next?",
      "Three colors repeat in the same order.",
      ["🔴", "🟡", "🟢", "🔴", "🟡", "?"],
      "red, yellow, green, red, yellow, missing item",
      [
        ["red", "Red circle"],
        ["yellow", "Yellow circle"],
        ["green", "Green circle"],
      ],
      "green",
    ),
    q(
      "What comes next?",
      "Three shapes repeat in the same order.",
      ["▲", "■", "●", "▲", "■", "?"],
      "triangle, square, circle, triangle, square, missing item",
      [
        ["triangle", "Triangle ▲"],
        ["square", "Square ■"],
        ["circle", "Circle ●"],
      ],
      "circle",
    ),
    q(
      "What comes next?",
      "The pairs take turns.",
      ["●", "●", "○", "○", "●", "●", "?"],
      "two solid circles, two empty circles, two solid circles, missing item",
      [
        ["solid", "Solid circle ●"],
        ["empty", "Empty circle ○"],
        ["square", "Square ■"],
      ],
      "empty",
    ),
    q(
      "What comes next?",
      "Look for the group that repeats.",
      ["🍎", "🍎", "🍌", "🍎", "🍎", "?"],
      "apple, apple, banana, apple, apple, missing item",
      [
        ["apple", "Apple"],
        ["banana", "Banana"],
        ["grapes", "Grapes"],
      ],
      "banana",
    ),
    q(
      "What comes next?",
      "The numbers repeat in the same order.",
      ["1", "2", "3", "1", "2", "?"],
      "one, two, three, one, two, missing number",
      [
        ["1", "1"],
        ["2", "2"],
        ["3", "3"],
      ],
      "3",
    ),
  ],
  // Level 3: gaps in the middle, counting up
  [
    q(
      "Choose the missing picture.",
      "The shapes repeat in groups of three.",
      ["▲", "■", "●", "▲", "?", "●"],
      "triangle, square, circle, triangle, missing item, circle",
      [
        ["triangle", "Triangle ▲"],
        ["square", "Square ■"],
        ["circle", "Circle ●"],
      ],
      "square",
    ),
    q(
      "What comes next?",
      "Count the stars in each group.",
      ["★", "★★", "★★★", "?"],
      "one star, two stars, three stars, missing group",
      [
        ["two", "Two stars ★★"],
        ["three", "Three stars ★★★"],
        ["four", "Four stars ★★★★"],
      ],
      "four",
    ),
    q(
      "What comes next?",
      "The numbers go up by the same amount each time.",
      ["2", "4", "6", "?"],
      "two, four, six, missing number",
      [
        ["7", "7"],
        ["8", "8"],
        ["10", "10"],
      ],
      "8",
    ),
    q(
      "What comes next?",
      "Look for the group that repeats.",
      ["🔴", "🔴", "🔵", "🔴", "🔴", "🔵", "🔴", "?"],
      "red, red, blue, red, red, blue, red, missing item",
      [
        ["red", "Red circle"],
        ["blue", "Blue circle"],
        ["green", "Green circle"],
      ],
      "red",
    ),
    q(
      "What comes next?",
      "The numbers go up by the same amount each time.",
      ["1", "3", "5", "?"],
      "one, three, five, missing number",
      [
        ["6", "6"],
        ["7", "7"],
        ["8", "8"],
      ],
      "7",
    ),
    q(
      "What comes next?",
      "Think about how a plant grows.",
      ["🌱", "🌿", "🌳", "🌱", "🌿", "?"],
      "seedling, leafy plant, tree, seedling, leafy plant, missing item",
      [
        ["seedling", "Seedling"],
        ["plant", "Leafy plant"],
        ["tree", "Tree"],
      ],
      "tree",
    ),
  ],
  // Level 4: bigger jumps, two things changing, pairs
  [
    q(
      "What comes next?",
      "The numbers go up by the same amount each time.",
      ["10", "20", "30", "?"],
      "ten, twenty, thirty, missing number",
      [
        ["35", "35"],
        ["40", "40"],
        ["50", "50"],
      ],
      "40",
    ),
    q(
      "What comes next?",
      "The numbers go up by the same amount each time.",
      ["5", "10", "15", "?"],
      "five, ten, fifteen, missing number",
      [
        ["18", "18"],
        ["20", "20"],
        ["25", "25"],
      ],
      "20",
    ),
    q(
      "Choose the missing picture.",
      "Two patterns are happening: shape and color.",
      ["🔴●", "🔵■", "🔴●", "?", "🔴●"],
      "red circle, blue square, red circle, missing item, red circle",
      [
        ["red-circle", "Red circle"],
        ["blue-square", "Blue square"],
        ["green-triangle", "Green triangle"],
      ],
      "blue-square",
    ),
    q(
      "What comes next?",
      "Think about how each number grows.",
      ["2", "4", "8", "?"],
      "two, four, eight, missing number",
      [
        ["10", "10"],
        ["12", "12"],
        ["16", "16"],
      ],
      "16",
    ),
    q(
      "What comes next?",
      "Look at every other letter.",
      ["A", "C", "E", "?"],
      "A, C, E, missing letter",
      [
        ["F", "F"],
        ["G", "G"],
        ["H", "H"],
      ],
      "G",
    ),
    q(
      "What comes next?",
      "The pairs take turns.",
      ["▲▲", "■■", "●●", "▲▲", "?"],
      "two triangles, two squares, two circles, two triangles, missing pair",
      [
        ["triangles", "Two triangles ▲▲"],
        ["squares", "Two squares ■■"],
        ["circles", "Two circles ●●"],
      ],
      "squares",
    ),
  ],
  // Level 5: growing jumps, doubling, several things at once
  [
    q(
      "What comes next?",
      "The jump gets bigger each time.",
      ["1", "2", "4", "7", "?"],
      "one, two, four, seven, missing number",
      [
        ["10", "10"],
        ["11", "11"],
        ["12", "12"],
      ],
      "11",
    ),
    q(
      "What comes next?",
      "Think about how each number grows.",
      ["3", "6", "12", "24", "?"],
      "three, six, twelve, twenty-four, missing number",
      [
        ["30", "30"],
        ["36", "36"],
        ["48", "48"],
      ],
      "48",
    ),
    q(
      "What comes next?",
      "The gaps between the letters get bigger.",
      ["A", "B", "D", "G", "?"],
      "A, B, D, G, missing letter",
      [
        ["J", "J"],
        ["K", "K"],
        ["L", "L"],
      ],
      "K",
    ),
    q(
      "Choose the missing picture.",
      "Color and shape change together.",
      ["🔴▲", "🔵■", "🟢●", "🔴▲", "🔵■", "?"],
      "red triangle, blue square, green circle, red triangle, blue square, missing item",
      [
        ["green-circle", "Green circle"],
        ["red-triangle", "Red triangle"],
        ["blue-square", "Blue square"],
      ],
      "green-circle",
    ),
    q(
      "Choose the missing number.",
      "The numbers go down by the same amount each time.",
      ["100", "90", "80", "?", "60"],
      "one hundred, ninety, eighty, missing number, sixty",
      [
        ["65", "65"],
        ["70", "70"],
        ["75", "75"],
      ],
      "70",
    ),
    q(
      "What comes next?",
      "Think about how each number shrinks.",
      ["64", "32", "16", "?"],
      "sixty-four, thirty-two, sixteen, missing number",
      [
        ["4", "4"],
        ["8", "8"],
        ["12", "12"],
      ],
      "8",
    ),
  ],
];

/** One fixed question for a level and round (used by tests and as a fallback). */
export function getPatternQuestion(level: number, round: number): ChoiceQuestion {
  const options = PATTERN_QUESTIONS[clampLevel(level) - 1] ?? PATTERN_QUESTIONS[0];
  return options[(round - 1) % options.length] ?? options[0];
}

/**
 * Picks `count` different questions for one game at random, and shuffles the
 * order of the answers so the right one is not always in the same place.
 */
export function pickQuestionSet(
  bank: readonly (readonly ChoiceQuestion[])[],
  level: number,
  count: number,
  random: () => number = Math.random,
): ChoiceQuestion[] {
  const pool = bank[clampLevel(level) - 1] ?? bank[0] ?? [];
  return shuffle(pool, random)
    .slice(0, Math.min(count, pool.length))
    .map((question) => ({ ...question, choices: shuffle(question.choices, random) }));
}

/**
 * Shows at most `max` answers: always the right one, plus randomly chosen
 * wrong ones. Fewer answers make a question simpler.
 */
export function limitChoices(
  question: ChoiceQuestion,
  max: number,
  random: () => number = Math.random,
): ChoiceQuestion {
  if (question.choices.length <= max) return question;
  const correct = question.choices.find((choice) => choice.key === question.correctKey);
  const wrong = shuffle(
    question.choices.filter((choice) => choice.key !== question.correctKey),
    random,
  ).slice(0, Math.max(1, max - 1));
  return { ...question, choices: shuffle(correct ? [correct, ...wrong] : wrong, random) };
}

export function calculateChoiceScore(correct: number, mistakes: number): number {
  return Math.max(0, correct * 100 - mistakes * 10);
}
