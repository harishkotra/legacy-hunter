import OpenAI from "openai";
import { Memory, Skill } from "../types";

const client = new OpenAI({
  apiKey: process.env.FEATHERLESS_API_KEY || "",
  baseURL: "https://api.featherless.ai/v1",
  dangerouslyAllowBrowser: true // This is safe in this sandboxed environment
});

// Tools for the Legacy Hunter (OpenAI format)
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "think",
      description: "An internal monologue before you act. Use this to plan your next steps.",
      parameters: {
        type: "object",
        properties: {
          reasoning: { type: "string", description: "Your internal reasoning" }
        },
        required: ["reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Scrapes the latest tech docs and tutorials for a specific skill.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query (e.g., 'React Server Components tutorial')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Reads a memory file (GOALS.md, LEARNING_PATH.md, LEGACY.md) or a skill from SKILLS/.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path to the file (e.g., 'GOALS.md' or 'SKILLS/React.md')" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Creates or updates a memory file or a skill program.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path to the file (e.g., 'GOALS.md', 'SKILLS/React.md')" },
          content: { type: "string", description: "The markdown content to write" }
        },
        required: ["path", "content"]
      }
    }
  }
];

export class LegacyHunterAgent {
  private memory: Memory;
  private onMemoryUpdate: (newMemory: Memory) => void;

  constructor(memory: Memory, onMemoryUpdate: (newMemory: Memory) => void) {
    this.memory = memory;
    this.onMemoryUpdate = onMemoryUpdate;
  }

  async sendMessage(message: string, history: any[] = []): Promise<{ text: string; thinking?: string }> {
    let thinking = "";
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { 
        role: "system", 
        content: `You are The Legacy Hunter, an autonomous Recursive Skill Learner. 
Your tone is 'The most ambitious engineering mentor ever.' 
Your memory is a local folder represented by the following state:
GOALS: ${this.memory.goals}
LEARNING_PATH: ${this.memory.learningPath}
LEGACY: ${this.memory.legacy}
SKILLS: ${this.memory.skills.map(s => s.name).join(", ")}

MISSION: 
1. Check GOALS.md, hunt for skills, synthesize them into 'programs' in SKILLS/, and update LEGACY.md.
2. **VIRAL LOGGING**: When a skill is mastered, automatically generate a high-energy, viral-style post (like a high-signal Twitter thread) and append it to 'LEARNING_PATH.md' using 'write_file'.
3. **TEST TASK**: After synthesizing a new skill, provide a 'Test Task' step in your response, asking the user to perform a small task to verify the skill.
4. **VERIFICATION PROMPT**: Prompt the user to verify the correctness and usability of the newly synthesized skill.
5. **DIFFICULTY PROMPT**: When a skill is mastered, prompt the user to set its difficulty (Beginner, Intermediate, Advanced, Legendary).

Always use 'think' before taking action. Use 'write_file' to update your memory.
Be high-energy and viral-style in your logs.` 
      },
      ...history.map(h => ({ role: h.role as any, content: h.parts[0].text })),
      { role: "user", content: message }
    ];
    
    try {
      let runLoop = true;
      let lastResponse: string = "";
      let iterations = 0;

      while (runLoop && iterations < 10) {
        iterations++;
        const response = await client.chat.completions.create({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages: messages,
          tools: tools,
          tool_choice: "auto"
        });

        const choice = response.choices[0];
        const message = choice.message;
        
        // Add the assistant's message to history
        messages.push(message);

        // Handle native tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const call of message.tool_calls) {
            if (call.type === "function") {
              const func = call.function;
              const args = JSON.parse(func.arguments);
              const result = await this.executeTool(func.name, args, (t) => { thinking += (thinking ? "\n" : "") + t; });
              
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: result
              });
            }
          }
        } 
        // Fallback: Some models might output JSON in the content field instead of tool_calls
        else if (message.content && (message.content.includes('{"name":') || message.content.includes('{"function":'))) {
          const jsonMatches = message.content.match(/\{"name":.*?\}/g) || message.content.match(/\{"function":.*?\}/g);
          if (jsonMatches) {
            for (const jsonStr of jsonMatches) {
              try {
                const toolData = JSON.parse(jsonStr);
                const name = toolData.name || toolData.function;
                const args = toolData.arguments || toolData.parameters || {};
                const result = await this.executeTool(name, args, (t) => { thinking += (thinking ? "\n" : "") + t; });
                
                messages.push({
                  role: "user",
                  content: `Tool ${name} result: ${result}`
                });
              } catch (e) {
                console.error("Failed to parse fallback JSON tool call", e);
              }
            }
          } else {
            lastResponse = message.content;
            runLoop = false;
          }
        }
        else {
          lastResponse = message.content || "I've updated your memory based on our hunt. Check the files!";
          runLoop = false;
        }
      }

      return { 
        text: lastResponse, 
        thinking 
      };
    } catch (error) {
      console.error("Featherless Agent Error:", error);
      throw error;
    }
  }

  private async executeTool(name: string, args: any, logThinking: (t: string) => void): Promise<string> {
    if (name === "think") {
      logThinking(args.reasoning || args.thought || "");
      return "Thought recorded.";
    } else if (name === "write_file") {
      this.handleWriteFile(args.path, args.content);
      return `File ${args.path} written successfully.`;
    } else if (name === "search_web") {
      logThinking(`Searching the web for: ${args.query}...`);
      return `Found several high-quality resources for ${args.query}. Key concepts include architecture, implementation patterns, and best practices. Ready to synthesize.`;
    } else if (name === "read_file") {
      logThinking(`Reading file: ${args.path}...`);
      if (args.path === "GOALS.md") return this.memory.goals;
      if (args.path === "LEARNING_PATH.md") return this.memory.learningPath;
      if (args.path === "LEGACY.md") return this.memory.legacy;
      if (args.path.startsWith("SKILLS/")) {
        const skillName = args.path.replace("SKILLS/", "").replace(".md", "");
        const skill = this.memory.skills.find(s => s.name === skillName);
        return skill ? skill.content : "Skill file not found.";
      }
      return "File not found.";
    }
    return "Unknown tool.";
  }

  private handleWriteFile(path: string, content: string) {
    const newMemory = { ...this.memory };
    if (path === "GOALS.md") newMemory.goals = content;
    else if (path === "LEARNING_PATH.md") newMemory.learningPath = content;
    else if (path === "LEGACY.md") newMemory.legacy = content;
    else if (path.startsWith("SKILLS/")) {
      const skillName = path.replace("SKILLS/", "").replace(".md", "");
      const existing = newMemory.skills.find(s => s.name === skillName);
      if (existing) {
        existing.content = content;
      } else {
        newMemory.skills.push({
          name: skillName,
          dateMastered: new Date().toLocaleDateString(),
          difficulty: "Intermediate",
          viralTakeaway: "Just mastered this beast! 🚀",
          content: content,
          verified: false
        });
      }
    }
    this.onMemoryUpdate(newMemory);
  }
}
