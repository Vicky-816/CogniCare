import { clampLevel } from "@/lib/games/memory-match";
import { choiceQuestion as q, type ChoiceQuestion } from "@/lib/games/pattern-practice";

/*
 * Six questions for each of the five levels, easiest first. A game uses three
 * of the six at random. Level 1 is naming everyday objects, level 2 is what
 * objects are for, level 3 is the order of the day, level 4 is sensible and
 * safe choices, and level 5 is putting steps in order.
 */
export const ROUTINE_QUESTIONS: ChoiceQuestion[][] = [
  [
    q(
      "Which object helps you tell the time?",
      "Choose the everyday object that shows hours and minutes.",
      ["🕰️"],
      "clock",
      [
        ["clock", "Clock"],
        ["cup", "Cup"],
        ["key", "Key"],
      ],
      "clock",
    ),
    q(
      "What do you drink water from?",
      "Think about the kitchen.",
      ["🚰"],
      "water tap",
      [
        ["cup", "A cup"],
        ["shoe", "A shoe"],
        ["pillow", "A pillow"],
      ],
      "cup",
    ),
    q(
      "What do you use to clean your teeth?",
      "Think about the morning.",
      ["🪥"],
      "toothbrush",
      [
        ["toothbrush", "A toothbrush"],
        ["spoon", "A spoon"],
        ["book", "A book"],
      ],
      "toothbrush",
    ),
    q(
      "What do you wear on your feet?",
      "Think about going outside.",
      ["👟"],
      "shoe",
      [
        ["shoes", "Shoes"],
        ["hat", "A hat"],
        ["gloves", "Gloves"],
      ],
      "shoes",
    ),
    q(
      "What do you sleep on?",
      "Think about the night.",
      ["🌙", "😴"],
      "moon and a sleeping face",
      [
        ["bed", "A bed"],
        ["table", "A table"],
        ["bucket", "A bucket"],
      ],
      "bed",
    ),
    q(
      "What do you use to call a friend?",
      "Choose the object that carries your voice.",
      ["📞"],
      "telephone",
      [
        ["phone", "A phone"],
        ["spoon", "A spoon"],
        ["umbrella", "An umbrella"],
      ],
      "phone",
    ),
  ],
  [
    q(
      "What do you use to unlock a door?",
      "Think about arriving home.",
      ["🔑"],
      "key",
      [
        ["key", "A key"],
        ["spoon", "A spoon"],
        ["book", "A book"],
      ],
      "key",
    ),
    q(
      "What do you use to eat soup?",
      "Choose the right tool for a liquid meal.",
      ["🍲"],
      "bowl of soup",
      [
        ["spoon", "A spoon"],
        ["pen", "A pen"],
        ["scissors", "Scissors"],
      ],
      "spoon",
    ),
    q(
      "What do you use to cut paper?",
      "Choose the tool with two blades.",
      ["📄"],
      "sheet of paper",
      [
        ["scissors", "Scissors"],
        ["spoon", "A spoon"],
        ["pillow", "A pillow"],
      ],
      "scissors",
    ),
    q(
      "What do you use to write a note?",
      "Think about a shopping list.",
      ["📝"],
      "notepad",
      [
        ["pen", "A pen"],
        ["plate", "A plate"],
        ["soap", "Soap"],
      ],
      "pen",
    ),
    q(
      "What do you use to wash your hands?",
      "Think about the bathroom.",
      ["🧼", "💧"],
      "soap and water",
      [
        ["soap", "Soap and water"],
        ["book", "A book"],
        ["shoe", "A shoe"],
      ],
      "soap",
    ),
    q(
      "What helps you see in the dark?",
      "Think about a power cut.",
      ["🌑"],
      "dark night",
      [
        ["torch", "A torch (flashlight)"],
        ["cup", "A cup"],
        ["scarf", "A scarf"],
      ],
      "torch",
    ),
  ],
  [
    q(
      "Which comes first in a morning routine?",
      "Choose the earliest step.",
      ["🌅", "🪥", "🥣"],
      "sunrise, toothbrush, breakfast bowl",
      [
        ["wake", "Wake up"],
        ["breakfast", "Eat breakfast"],
        ["bed", "Go to bed"],
      ],
      "wake",
    ),
    q(
      "What should you do before eating?",
      "Think about keeping clean.",
      ["🍽️"],
      "plate",
      [
        ["wash", "Wash your hands"],
        ["car", "Wash the car"],
        ["plants", "Water the plants"],
      ],
      "wash",
    ),
    q(
      "When do most people go to sleep?",
      "Look at the picture.",
      ["🌙", "⭐"],
      "moon and star",
      [
        ["night", "At night"],
        ["noon", "At noon"],
        ["sunrise", "At sunrise"],
      ],
      "night",
    ),
    q(
      "What should you do when the alarm rings in the morning?",
      "Choose the helpful action.",
      ["⏰"],
      "alarm clock",
      [
        ["wake", "Wake up"],
        ["sleep", "Switch it off and sleep"],
        ["dinner", "Eat dinner"],
      ],
      "wake",
    ),
    q(
      "What should you do when you feel thirsty?",
      "Choose what your body needs.",
      ["💧"],
      "water drop",
      [
        ["drink", "Drink some water"],
        ["coat", "Put on a coat"],
        ["door", "Close the door"],
      ],
      "drink",
    ),
    q(
      "Which comes last in an evening routine?",
      "Choose the final step of the day.",
      ["🌆", "🍽️", "🛏️"],
      "evening sky, dinner plate, bed",
      [
        ["sleep", "Go to sleep"],
        ["breakfast", "Eat breakfast"],
        ["wake", "Wake up"],
      ],
      "sleep",
    ),
  ],
  [
    q(
      "What do you use to stay dry in the rain?",
      "Choose the object for rainy weather.",
      ["🌧️"],
      "rain cloud",
      [
        ["umbrella", "Umbrella"],
        ["sunglasses", "Sunglasses"],
        ["fan", "Fan"],
      ],
      "umbrella",
    ),
    q(
      "What should you do before crossing a road?",
      "Choose the safe first step.",
      ["🚦", "🚶"],
      "traffic light and walking person",
      [
        ["look", "Look for traffic"],
        ["run", "Run straight across"],
        ["phone", "Use a phone"],
      ],
      "look",
    ),
    q(
      "What should you do if you smell smoke at home?",
      "Choose the safe action.",
      ["🔥"],
      "fire",
      [
        ["leave", "Get out and call for help"],
        ["ignore", "Ignore it"],
        ["sleep", "Go back to sleep"],
      ],
      "leave",
    ),
    q(
      "When should you take your medicine?",
      "Choose the safest answer.",
      ["💊"],
      "pills",
      [
        ["doctor", "As your doctor told you"],
        ["random", "Whenever you remember"],
        ["never", "Never"],
      ],
      "doctor",
    ),
    q(
      "What should you do before leaving home?",
      "Think about keeping your home safe.",
      ["🏠", "🔑"],
      "house and key",
      [
        ["lock", "Lock the door"],
        ["windows", "Open every window"],
        ["tv", "Turn the TV up"],
      ],
      "lock",
    ),
    q(
      "What helps you stay safe when walking at night?",
      "Choose what helps others see you.",
      ["🌙", "🚶"],
      "moon and walking person",
      [
        ["light", "Carry a light"],
        ["middle", "Walk in the middle of the road"],
        ["run", "Run fast"],
      ],
      "light",
    ),
  ],
  [
    q(
      "What is the first step when making tea?",
      "Choose the step that comes first.",
      ["🍵"],
      "cup of tea",
      [
        ["boil", "Boil the water"],
        ["drink", "Drink the tea"],
        ["wash", "Wash the cup afterwards"],
      ],
      "boil",
    ),
    q(
      "What comes first when washing clothes?",
      "Choose the earliest step.",
      ["👕"],
      "shirt",
      [
        ["wash", "Put the clothes in to wash"],
        ["fold", "Fold the clothes"],
        ["iron", "Iron the clothes"],
      ],
      "wash",
    ),
    q(
      "You are going to the market. What should you do first?",
      "Choose the step before you leave.",
      ["🛒"],
      "shopping basket",
      [
        ["list", "Make a list"],
        ["pay", "Pay the bill"],
        ["carry", "Carry the bags home"],
      ],
      "list",
    ),
    q(
      "What is the last step of cooking a meal?",
      "Choose the final step.",
      ["🍳"],
      "frying pan",
      [
        ["eat", "Serve and eat"],
        ["wash", "Wash the vegetables"],
        ["stove", "Switch on the stove"],
      ],
      "eat",
    ),
    q(
      "What is the last thing to do before going to bed?",
      "Choose the final step of the day.",
      ["🛏️"],
      "bed",
      [
        ["lights", "Switch off the lights"],
        ["cook", "Cook dinner"],
        ["shop", "Go shopping"],
      ],
      "lights",
    ),
    q(
      "What is the first step when you get a letter?",
      "Choose the earliest step.",
      ["✉️"],
      "envelope",
      [
        ["open", "Open the envelope"],
        ["reply", "Write a reply"],
        ["file", "Put it away"],
      ],
      "open",
    ),
  ],
];

/** One fixed question for a level and round (used by tests and as a fallback). */
export function getRoutineQuestion(level: number, round: number): ChoiceQuestion {
  const options = ROUTINE_QUESTIONS[clampLevel(level) - 1] ?? ROUTINE_QUESTIONS[0];
  return options[(round - 1) % options.length] ?? options[0];
}
