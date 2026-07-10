/**
 * Wortfilter für den Community-Chat: Treffer werden maskiert ("***"),
 * die Nachricht geht trotzdem durch. Ganze-Wort-Matching über
 * Unicode-Lookarounds statt \b — \b behandelt ä/ö/ü/ß als Nicht-Wort-
 * Zeichen und würde z. B. in "Marsch"/"Überfickende" falsch anschlagen.
 * Deklinierte Formen müssen explizit gelistet werden; Leetspeak-
 * Normalisierung (z. B. "sh1t") ist bewusst out of scope für v1.
 */
export const BAD_WORDS: readonly string[] = [
  // Englisch
  "ass",
  "asshole",
  "assholes",
  "bastard",
  "bastards",
  "bitch",
  "bitches",
  "bullshit",
  "cunt",
  "cunts",
  "dick",
  "dickhead",
  "douchebag",
  "faggot",
  "fuck",
  "fucked",
  "fucker",
  "fucking",
  "motherfucker",
  "nigga",
  "nigger",
  "prick",
  "pussy",
  "retard",
  "shit",
  "slut",
  "twat",
  "wanker",
  "whore",
  // Deutsch (inkl. gängiger deklinierter Formen)
  "arsch",
  "arschgeige",
  "arschloch",
  "arschlöcher",
  "drecksau",
  "dreckschwein",
  "fick",
  "ficken",
  "fickt",
  "fotze",
  "fotzen",
  "gefickt",
  "hure",
  "huren",
  "hurensohn",
  "hurensöhne",
  "kanake",
  "kanaken",
  "missgeburt",
  "neger",
  "nutte",
  "nutten",
  "schlampe",
  "schlampen",
  "scheiß",
  "scheiße",
  "scheisse",
  "schwuchtel",
  "spast",
  "spasten",
  "spasti",
  "verarschen",
  "verarscht",
  "verfickt",
  "verfickte",
  "verfickter",
  "wichser",
];

const escaped = [...BAD_WORDS]
  .sort((a, b) => b.length - a.length)
  .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const badWordsPattern = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:${escaped.join("|")})(?![\p{L}\p{N}])`,
  "giu",
);

export function maskBadWords(text: string): string {
  return text.replace(badWordsPattern, "***");
}
