export type FieldGuideQuote = {
  text: string
  attribution?: string
}

export const FIELD_GUIDE_QUOTE_SEED: FieldGuideQuote[] = [
  {
    text: "I have not failed. I've just found 10,000 ways that won't work.",
    attribution: 'Thomas Edison',
  },
  {
    text: 'The desire to create is one of the deepest yearnings of the human soul.',
    attribution: 'Dieter F. Uchtdorf',
  },
  {
    text: "I cannot remember the books I've read any more than the meals I have eaten; even so, they have made me.",
    attribution: 'Ralph Waldo Emerson',
  },
  {
    text: 'I found shelf behind the apple shelf. On the shelf was a wooden thing I did not know. I did this for a long time. I forgot the apples.',
    attribution: 'Sofija Kakauskus, 1870',
  },
  {
    text: 'The secret of getting ahead is getting started.',
    attribution: 'Mark Twain',
  },
  {
    text: 'She generally gave herself very good advice, though she very seldom followed it.',
    attribution: 'Lewis Carroll',
  },
  {
    text: 'An idea that is not dangerous is unworthy of being called an idea at all.',
    attribution: 'Oscar Wilde',
  },
  {
    text: 'The best way to predict the future is to invent it.',
    attribution: 'Alan Kay',
  },
  {
    text: 'I am always doing that which I cannot do, in order that I may learn how to do it.',
    attribution: 'Pablo Picasso',
  },
  {
    text: 'Make something wonderful and put it out there.',
    attribution: 'Steve Jobs',
  },
  {
    text: 'Make the thing with the stuff!',
    attribution: 'Mr. Cook',
  },
  {
    text: "I don't care what you make, just make it cool and make it awesome.",
    attribution: 'Mr. Cook',
  },
  {
    text: "Half of what they call disorder is just a kid who hasn't been listened to. The other half is something I can't fix and that I have learned to sit with.",
    attribution: 'Barry',
  },
  {
    text: "The men I worked with were not smarter than me. They were louder. There is a difference, and the difference matters less than you'd think.",
    attribution: 'Frances',
  },
  {
    text: 'I will remember.',
    attribution: 'Sofija Kakauskus, 1870',
  },
  {
    text: 'Somewhere in her first year, she found something. She started asking questions nobody wanted to answer.',
    attribution: 'from the day-one telling',
  },
  {
    text: 'Not lesser knowing. Not vocational knowing. Just knowing.',
    attribution: 'Luther Sampson, as remembered',
  },
  {
    text: "I would rather have questions that can't be answered than answers that can't be questioned.",
    attribution: 'Richard Feynman',
  },
  {
    text: 'Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.',
    attribution: 'Richard Feynman',
  },
  {
    text: 'The first principle is that you must not fool yourself — and you are the easiest person to fool.',
    attribution: 'Richard Feynman',
  },
  {
    text: 'I learned very early the difference between knowing the name of something and knowing something.',
    attribution: 'Richard Feynman',
  },
  {
    text: 'There is something in this school I have not found yet. I am looking.',
  },
  {
    text: 'Someone made this. I want to know who.',
  },
  {
    text: 'The mark was there before I arrived. I do not think it was meant for me. I am not sure it wasn\'t.',
  },
  {
    text: 'Find what I found.',
  },
]

/** Fisher–Yates shuffle (copy; does not mutate seed). */
export function shuffleFieldGuideQuotes(quotes: FieldGuideQuote[]): FieldGuideQuote[] {
  const out = [...quotes]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
