export const previewDashboard = {
  user: { firstName: "Local Preview" },
  role: "SUPER_ADMIN" as const,
  points: 0,
  wallet: { available: "0.00", pending: "0.00", lifetime: "0.00" },
  completedGames: 0, highScore: 0, unlockedLevels: 15, bestStars: 0,
  ads: { configured: false, miniAppId: null, environment: "DEVELOPMENT_MOCK" }
};
export const previewQuestions = [
  { question: "Which planet is known as the Red Planet?", answers: ["Mars","Venus","Jupiter","Mercury"], correct: 0, explanation: "Iron minerals give Mars its reddish appearance." },
  { question: "What does HTML describe?", answers: ["Page structure","Database rows","Image pixels","Server memory"], correct: 0, explanation: "HTML provides the semantic structure of a web page." },
  { question: "How many sides does a hexagon have?", answers: ["5","6","7","8"], correct: 1, explanation: "A hexagon has six sides." },
  { question: "Which ocean is the largest?", answers: ["Atlantic","Indian","Pacific","Arctic"], correct: 2, explanation: "The Pacific Ocean is the largest." },
  { question: "What is 9 × 7?", answers: ["56","63","72","81"], correct: 1, explanation: "Nine multiplied by seven is sixty-three." }
];
