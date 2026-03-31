export interface Skill {
  name: string;
  dateMastered: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Legendary";
  viralTakeaway: string;
  content: string; // The "Skill Program"
  verified: boolean;
}

export interface Memory {
  goals: string;
  learningPath: string;
  skills: Skill[];
  legacy: string; // Markdown table representation
}

export const INITIAL_MEMORY: Memory = {
  goals: "# GOALS\n- Master React & Tailwind\n- Build an AI Agent\n- Learn Rust Ownership",
  learningPath: "# LEARNING PATH\n- Day 0: Initialized The Legacy Hunter. Ready to conquer.",
  skills: [],
  legacy: "| Skill | Date Mastered | Difficulty | Viral Takeaway |\n|-------|---------------|------------|----------------|",
};
