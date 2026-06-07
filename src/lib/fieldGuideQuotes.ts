export type FieldGuideQuote = {
  text: string
  attribution: string
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
