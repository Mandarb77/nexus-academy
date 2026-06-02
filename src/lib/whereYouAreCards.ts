export type WhereYouAreCard = {
  category: string
  name: string
  place: string
  year: string
  hook: string
  story: string
  kicker: string
}

export const WHERE_YOU_ARE_CARDS: WhereYouAreCard[] = [
  {
    category: 'INVENTOR',
    name: 'Chester Greenwood',
    place: 'Farmington',
    year: '1858–1937',
    hook: 'Invented earmuffs at 15 because wool made him itch.',
    story:
      'Goes ice skating. Ears cold. Allergic to wool so scarves are out. Bends wire into loops, has his grandmother sew fur on them. Patents it at 18. Manufactures earmuffs in Farmington for sixty years, employing half the town.',
    kicker:
      'Also invented a spark plug, a shock absorber, and a steel-tooth rake made from earmuff factory scraps. Ran a mile a day until he was 75. Never left Farmington. December 21st is Chester Greenwood Day in Maine.',
  },
  {
    category: 'INVENTOR',
    name: 'Margaret Knight',
    place: 'York',
    year: '1838–1914',
    hook: 'Designed her first safety device at twelve. After watching a man get impaled.',
    story:
      'A steel shuttle flies off a textile loom and hits a worker. Twelve-year-old Margaret designs a fix within weeks. The mill adopts it. Later she invents the machine that makes flat-bottomed paper bags — one machine replacing thirty workers.',
    kicker:
      'A man named Charles Annan stole her design and patented it first. She took him to court and won. 25+ patents. Queen Victoria gave her the Royal Legion of Honor. Her line: "I\'m only sorry I couldn\'t have had as good a chance as a boy."',
  },
  {
    category: 'INVENTOR',
    name: 'Percy Spencer',
    place: 'Howland',
    year: '1894–1970',
    hook: 'Orphan. Fifth-grade dropout. Invented the microwave because chocolate melted in his pocket.',
    story:
      "Father dies when he's eighteen months old. Mother leaves him with relatives. Drops out at twelve. Teaches himself electricity, joins the Navy, teaches himself physics from textbooks during night watches. Becomes one of the world's top radar experts at Raytheon.",
    kicker:
      "Standing near a magnetron one day, the chocolate bar in his pocket melts. He tries popcorn — pops everywhere. Tries an egg — explodes in a colleague's face. That's the microwave oven. 300+ patents. Raytheon paid him $2 for that one.",
  },
  {
    category: 'DOWN THE ROAD',
    name: 'Hallowell',
    place: '15 min south',
    year: 'Est. 1762',
    hook: 'Looks quiet now. In the 1800s it almost beat Portland.',
    story:
      'Granite quarries shipped stone to Boston. Forty-two ice houses lined the Kennebec — they cut river ice in winter, packed it in sawdust, and shipped it to Cuba. They called it "Ice Mania." Thousands worked the trade for seventy-five years.',
    kicker:
      "Maine's first automobile came from Hallowell. So did the first practical threshing machine. Water Street — the main drag — was originally a Wabanaki trail.",
  },
  {
    category: 'STILL BUILDING',
    name: 'Bath Iron Works',
    place: '45 min away',
    year: 'Since 1890',
    hook: 'Ships on the Kennebec for 280 years. Still going.',
    story:
      'Building ships since 1890. Currently builds Arleigh Burke–class destroyers for the U.S. Navy — some of the most advanced warships on the planet. Largest private employer in Maine. Over 6,000 workers.',
    kicker:
      'The town motto: "Bath-built is best-built." It\'s not a museum. They\'re building right now.',
  },
  {
    category: 'THE GROUND',
    name: 'Maine Granite',
    place: 'Vinalhaven & beyond',
    year: '1800s–1950s',
    hook: "You've stood on Maine granite in five states and didn't know it.",
    story:
      'Maine granite is in the Brooklyn Bridge, the Washington Monument, Grant\'s Tomb, and the Smithsonian. Immigrant stone workers — Italian, Scottish, Scandinavian — came here to cut it by hand.',
    kicker:
      'The work was dangerous. Dynamite, cave-ins, and a lung disease from stone dust. The industry ended when cement took over. The stone is still in those buildings. The hands that cut it were here.',
  },
  {
    category: '12,000+ YEARS',
    name: 'The Wabanaki',
    place: 'Here. Now.',
    year: 'People of the Dawnland',
    hook: 'Five nations. The original makers of this place. Not historical — present.',
    story:
      'Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, Abenaki. Built birch bark canoes — some of the most sophisticated watercraft ever made by hand. The first time the English language recorded the word "canoe" was on the Maine coast in 1605, describing one of theirs.',
    kicker:
      "The skill of building traditional canoes nearly disappeared. In 2013 the first birch bark canoe made by a Wabanaki builder in over a century was completed. It's in the Abbe Museum. They also make pounded ash baskets — the emerald ash borer threatening ash trees right now is threatening that craft tradition too.",
  },
  {
    category: 'WHO CAME HERE',
    name: 'Everyone',
    place: 'All over Maine',
    year: '1700s–now',
    hook: 'Every mill town you drive through has a story about who showed up and why.',
    story:
      'French Canadians to the textile mills. Irish to the railroads. Italians and Scandinavians to the granite quarries. Eastern Europeans to the factories. Whole families crossed the Atlantic and landed in towns fifteen minutes from here.',
    kicker:
      'Lewiston, Biddeford, Waterville, Rumford, Hallowell — each one built by people who came from somewhere else to make things. Some of their grandkids are still here.',
  },
  {
    category: 'MATERIAL',
    name: 'White Pine',
    place: 'The Pine Tree State',
    year: 'Since forever',
    hook: 'The British Crown reserved the tallest ones for ship masts. Colonists cut them down anyway.',
    story:
      'The best white pines were marked with the "King\'s Broad Arrow" — claimed by the Crown for Royal Navy masts. Cutting a marked tree was illegal. Colonists did it anyway.',
    kicker:
      "One of the small rebellions before the Revolution. The pine tree on Maine's flag isn't decorative.",
  },
  {
    category: 'MATERIAL',
    name: 'Brown Ash',
    place: 'Northeast forests',
    year: 'Threatened now',
    hook: 'The tree Wabanaki basket-makers depend on is dying.',
    story:
      'Brown ash is the traditional material for Wabanaki pounded-ash baskets — a craft tradition that goes back centuries. The emerald ash borer, an invasive beetle, is killing ash trees across the Northeast.',
    kicker:
      'The species and the craft are both threatened at the same time. This is a living story, not a historical one.',
  },
  {
    category: 'DOWN THE ROAD',
    name: 'Fayette General Store',
    place: 'Route 17',
    year: 'Since 1850',
    hook: "You've bought food there. It's been open since before the Civil War.",
    story:
      "Serving the town of Fayette since 1850. Different owners, different names, same building on the same road. It's been a mercantile, a country store, and now a general store. Sandwiches, pizza, fried food, and whatever else you need in the backwoods of the Winthrop Lakes Region.",
    kicker:
      "When you walk in for a sandwich, you're walking into a building that's been feeding people in this spot for 175 years. Most of those people were making things too.",
  },
]

export function categoryAccent(category: string): { band: string; border: string } {
  switch (category) {
    case 'INVENTOR':
      return { band: '#1a1714', border: '#1a1714' }
    case 'DOWN THE ROAD':
      return { band: '#7a6344', border: '#7a6344' }
    case 'STILL BUILDING':
      return { band: '#4a5a62', border: '#4a5a62' }
    case 'THE GROUND':
      return { band: '#5c5650', border: '#5c5650' }
    case '12,000+ YEARS':
      return { band: '#2a4a3a', border: '#3a6b52' }
    case 'WHO CAME HERE':
      return { band: '#4a4f58', border: '#4a4f58' }
    case 'MATERIAL':
      return { band: '#2d5236', border: '#2d5236' }
    default:
      return { band: '#1a1714', border: '#1a1714' }
  }
}
