export const CATEGORY_FACTS: Record<string, Array<[string, string]>> = {
  "general-knowledge": [
    ["the largest ocean", "Pacific Ocean"], ["the author of 1984", "George Orwell"], ["the Red Planet", "Mars"],
    ["an instrument that measures temperature", "Thermometer"], ["the most abundant gas in Earth's atmosphere", "Nitrogen"],
    ["the common name for H₂O", "Water"], ["the birthplace of the Renaissance", "Italy"], ["Japan's currency", "Yen"],
    ["the largest living mammal", "Blue whale"], ["Brazil's official language", "Portuguese"]
  ],
  science: [
    ["the powerhouse of a cell", "Mitochondrion"], ["neutral pH", "7"], ["the approximate speed of light", "300,000 km/s"],
    ["the element with symbol Au", "Gold"], ["the typical adult human bone count", "206"], ["the planet famous for visible rings", "Saturn"],
    ["the gas plants absorb in photosynthesis", "Carbon dioxide"], ["DNA's overall shape", "Double helix"], ["the SI unit of force", "Newton"],
    ["water's boiling point at sea level", "100°C"]
  ],
  technology: [
    ["the meaning of CPU", "Central Processing Unit"], ["HTML's primary role", "Structuring web content"], ["binary digits", "0 and 1"],
    ["HTTPS", "Encrypted web communication"], ["RAM", "Temporary working memory"], ["the meaning of URL", "Uniform Resource Locator"],
    ["an operating system", "Software that manages hardware"], ["phishing", "Fraudulent identity impersonation"], ["open-source software", "Software with inspectable source code"],
    ["a database", "An organized collection of data"]
  ],
  sports: [
    ["players on a soccer team on the field", "11"], ["points for a basketball free throw", "1"], ["rings in the Olympic symbol", "5"],
    ["love in tennis scoring", "Zero"], ["official marathon distance", "42.195 kilometres"], ["stumps in a cricket wicket", "3"],
    ["volleyball players per team on court", "6"], ["the aim of golf scoring", "Use the fewest strokes"], ["regulation baseball innings", "9"],
    ["a hat-trick", "Three notable successes by one player"]
  ],
  geography: [
    ["Australia's capital", "Canberra"], ["the continent containing the Sahara", "Africa"], ["Mount Everest's range", "Himalayas"],
    ["the largest country by area", "Russia"], ["the Equator's latitude", "0 degrees"], ["Japan's ocean", "Pacific Ocean"],
    ["the continent containing the Andes", "South America"], ["the sea between Europe and Africa", "Mediterranean Sea"],
    ["the Prime Meridian's traditional location", "Greenwich"], ["the country shaped like a boot", "Italy"]
  ],
  history: [
    ["the European movable-type printing press pioneer", "Johannes Gutenberg"], ["the Magna Carta year", "1215"], ["the origin of the ancient Olympic Games", "Greece"],
    ["the civilization that built the Giza pyramids", "Ancient Egypt"], ["the principal language of ancient Rome", "Latin"],
    ["the Silk Road", "A trade network linking Asia and Europe"], ["the Industrial Revolution's early center", "Great Britain"],
    ["the first crewed Moon landing year", "1969"], ["the Berlin Wall's opening year", "1989"], ["cuneiform's origin region", "Mesopotamia"]
  ],
  entertainment: [
    ["the person directing an orchestra", "Conductor"], ["a film's written blueprint", "Screenplay"], ["a break between stage-show sections", "Intermission"],
    ["a nonfiction film", "Documentary"], ["the Grammy Awards", "Music"], ["the Cannes festival", "Film"],
    ["a novel's common major divisions", "Chapters"], ["a story's central character", "Protagonist"], ["translated on-screen dialogue", "Subtitles"],
    ["the person who designs dance movement", "Choreographer"]
  ],
  mathematics: [
    ["the only even prime number", "2"], ["pi", "Circumference divided by diameter"], ["7 × 8", "56"], ["the square root of 81", "9"],
    ["angles in a Euclidean triangle", "180 degrees"], ["25 percent", "One quarter"], ["3 cubed", "27"], ["the median", "The middle ordered value"],
    ["zero factorial", "1"], ["two thirds of 18", "12"]
  ],
  business: [
    ["revenue", "Income before expenses"], ["profit", "Revenue minus expenses"], ["an invoice", "A request for payment"],
    ["a budget", "A financial plan"], ["an asset", "A resource owned"], ["a liability", "A financial obligation"],
    ["ROI", "Return relative to investment"], ["diversification", "Spreading risk"], ["an entrepreneur", "A person who starts a venture"],
    ["market demand", "Customer willingness to buy"]
  ],
  "telegram-internet": [
    ["a URL", "A web resource address"], ["a browser", "Software used to access websites"], ["cloud computing", "Computing on remote servers"],
    ["two-factor authentication", "A second identity check"], ["encryption", "Encoding data against unauthorized reading"], ["a Telegram bot", "An automated Telegram account"],
    ["a Telegram Mini App", "A web app opened inside Telegram"], ["emoji encoding", "Unicode"], ["Wi‑Fi", "Wireless local networking"],
    ["spam", "Unsolicited bulk messages"]
  ]
};

export const STARTER_CATEGORIES = [
  ["general-knowledge", "General Knowledge", "🌐"], ["science", "Science", "🧪"], ["technology", "Technology", "💻"],
  ["sports", "Sports", "🏅"], ["geography", "Geography", "🗺️"], ["history", "History", "🏛️"],
  ["entertainment", "Entertainment", "🎬"], ["mathematics", "Mathematics", "➗"], ["business", "Business", "📈"],
  ["telegram-internet", "Telegram and Internet", "✈️"]
] as const;

export function buildSeedQuestions() {
  return STARTER_CATEGORIES.flatMap(([slug]) => CATEGORY_FACTS[slug].map(([subject, answer], index, facts) => ({
    seedKey: `quiz-v1:${slug}:${index + 1}`,
    categorySlug: slug,
    difficulty: index < 4 ? "EASY" as const : index < 8 ? "MEDIUM" as const : "HARD" as const,
    questionText: `Which answer correctly describes ${subject}?`,
    explanation: `${answer} is the correct answer for ${subject}.`,
    options: [answer, facts[(index + 3) % facts.length][1], facts[(index + 6) % facts.length][1], facts[(index + 8) % facts.length][1]]
  })));
}
