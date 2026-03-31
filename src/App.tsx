import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Target, 
  TrendingUp, 
  BookOpen, 
  Trophy, 
  Terminal, 
  FileText, 
  ChevronRight, 
  Send, 
  Zap, 
  Settings,
  Plus,
  Trash2,
  ExternalLink,
  Cpu,
  BrainCircuit
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "./lib/utils";
import { Memory, INITIAL_MEMORY, Skill } from "./types";
import { LegacyHunterAgent } from "./services/agentService";

type View = "GOALS" | "LEARNING_PATH" | "SKILLS" | "LEGACY" | "CHAT";

export default function App() {
  const [memory, setMemory] = useState<Memory>(() => {
    const saved = localStorage.getItem("legacy_hunter_memory");
    return saved ? JSON.parse(saved) : INITIAL_MEMORY;
  });
  const [currentView, setCurrentView] = useState<View>("CHAT");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "agent"; text: string; thinking?: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const agent = new LegacyHunterAgent(memory, (newMemory) => {
    setMemory(newMemory);
    localStorage.setItem("legacy_hunter_memory", JSON.stringify(newMemory));
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue;
    setInputValue("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsThinking(true);

    try {
      // Convert chatMessages to the format expected by the agent
      const history = chatMessages.map(msg => ({
        role: msg.role === "agent" ? "assistant" : "user",
        parts: [{ text: msg.text }]
      }));
      
      const response = await agent.sendMessage(userMsg, history);
      setChatMessages(prev => [...prev, { role: "agent", text: response.text, thinking: response.thinking }]);
    } catch (error) {
      console.error("Agent Error:", error);
      setChatMessages(prev => [...prev, { role: "agent", text: "Error: Failed to communicate with the hunter. Check your FEATHERLESS_API_KEY in the Secrets panel." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const updateSkill = (skillName: string, updates: Partial<Skill>) => {
    const newSkills = memory.skills.map(s => s.name === skillName ? { ...s, ...updates } : s);
    const newMemory = { ...memory, skills: newSkills };
    setMemory(newMemory);
    localStorage.setItem("legacy_hunter_memory", JSON.stringify(newMemory));
  };

  const filteredSkills = memory.skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === "All" || skill.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const renderContent = () => {
    switch (currentView) {
      case "GOALS":
        return <FileEditor content={memory.goals} title="GOALS.md" icon={<Target className="w-5 h-5 text-orange-500" />} />;
      case "LEARNING_PATH":
        return <FileEditor content={memory.learningPath} title="LEARNING_PATH.md" icon={<TrendingUp className="w-5 h-5 text-blue-500" />} />;
      case "SKILLS":
        return selectedSkill ? (
          <div className="flex flex-col h-full">
            <FileEditor 
              content={selectedSkill.content} 
              title={`SKILLS/${selectedSkill.name}.md`} 
              icon={<BookOpen className="w-5 h-5 text-emerald-500" />} 
              onBack={() => setSelectedSkill(null)}
            />
            {!selectedSkill.verified && (
              <div className="p-6 bg-emerald-950/20 border-t border-emerald-900/30 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-400">Verify this Skill</h4>
                    <p className="text-xs text-emerald-500/70">Did the Hunter synthesize this correctly? Set difficulty to master it.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={selectedSkill.difficulty}
                    onChange={(e) => updateSkill(selectedSkill.name, { difficulty: e.target.value as any })}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                  <button 
                    onClick={() => {
                      updateSkill(selectedSkill.name, { verified: true });
                      setSelectedSkill({ ...selectedSkill, verified: true });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20"
                  >
                    Verify & Master
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-emerald-500" />
                Mastered Skills
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500/50 w-48 lg:w-64"
                  />
                  <Terminal className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <select 
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Legendary">Legendary</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedSkill(skill)}
                  className={cn(
                    "p-4 bg-zinc-900 border rounded-xl transition-all cursor-pointer group relative overflow-hidden",
                    skill.verified ? "border-zinc-800 hover:border-emerald-500/50" : "border-orange-500/30 hover:border-orange-500/50"
                  )}
                >
                  {!skill.verified && (
                    <div className="absolute top-0 right-0 px-2 py-1 bg-orange-600 text-[8px] font-bold uppercase tracking-tighter text-white rounded-bl-lg">
                      Pending Verification
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg group-hover:text-emerald-400 transition-colors">{skill.name}</h3>
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-mono",
                      skill.difficulty === "Legendary" ? "text-yellow-500" : "text-zinc-500"
                    )}>{skill.difficulty}</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2 italic">"{skill.viralTakeaway}"</p>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{skill.dateMastered}</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
              {filteredSkills.length === 0 && (
                <div className="col-span-full p-12 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500">
                  {searchQuery || difficultyFilter !== "All" ? "No skills match your filters." : "No skills mastered yet. Ask the hunter to start a hunt!"}
                </div>
              )}
            </div>
          </div>
        );
      case "LEGACY":
        return (
          <div className="p-8 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              The Trophy Room
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-6 prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{memory.legacy}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      case "CHAT":
        return (
          <div className="flex flex-col h-full bg-black">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
                  <div className="space-y-4 opacity-50">
                    <BrainCircuit className="w-16 h-16 text-zinc-700 mx-auto" />
                    <div>
                      <h3 className="text-xl font-bold">The Hunter is Ready</h3>
                      <p className="text-sm">What's the one skill that would make you legendary?</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                    {[
                      "Master React Server Components",
                      "Learn Rust Ownership & Borrowing",
                      "Build a RAG system with local files",
                      "Master CSS Grid & Flexbox"
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInputValue(prompt);
                        }}
                        className="p-3 text-xs font-medium bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 hover:bg-zinc-800/50 transition-all text-zinc-400 hover:text-zinc-200 text-left flex items-center justify-between group"
                      >
                        {prompt}
                        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex flex-col max-w-[85%] space-y-1",
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {msg.thinking && (
                    <div className="text-[10px] font-mono text-zinc-500 mb-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                      <div className="flex items-center gap-1 mb-1 opacity-50">
                        <Cpu className="w-3 h-3" />
                        <span>INTERNAL MONOLOGUE</span>
                      </div>
                      {msg.thinking}
                    </div>
                  )}
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-orange-600 text-white rounded-tr-none" 
                      : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none"
                  )}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono animate-pulse">
                  <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  Hunting for knowledge...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-6 border-t border-zinc-900 bg-zinc-950/50 backdrop-blur-xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a skill to hunt..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-4 pl-6 pr-14 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isThinking || !inputValue.trim()}
                  className="absolute right-2 p-3 bg-orange-600 rounded-full text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-orange-500/30">
      {/* Sidebar */}
      <div className="w-72 border-r border-zinc-900 flex flex-col bg-zinc-950">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg">LEGACY HUNTER</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Featherless Learner v1.0</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem 
            active={currentView === "CHAT"} 
            onClick={() => setCurrentView("CHAT")} 
            icon={<Terminal className="w-4 h-4" />} 
            label="Hunter's Terminal" 
          />
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Memory Files</span>
          </div>
          <NavItem 
            active={currentView === "GOALS"} 
            onClick={() => setCurrentView("GOALS")} 
            icon={<Target className="w-4 h-4" />} 
            label="GOALS.md" 
          />
          <NavItem 
            active={currentView === "LEARNING_PATH"} 
            onClick={() => setCurrentView("LEARNING_PATH")} 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="LEARNING_PATH.md" 
          />
          <NavItem 
            active={currentView === "SKILLS"} 
            onClick={() => setCurrentView("SKILLS")} 
            icon={<BookOpen className="w-4 h-4" />} 
            label="SKILLS/" 
            count={memory.skills.length}
          />
          <NavItem 
            active={currentView === "LEGACY"} 
            onClick={() => setCurrentView("LEGACY")} 
            icon={<Trophy className="w-4 h-4" />} 
            label="LEGACY.md" 
          />
        </nav>

        <div className="p-4 border-t border-zinc-900 space-y-4">
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase">
              <span>System Status</span>
              <span className="text-emerald-500 flex items-center gap-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(memory.skills.length / 10) * 100}%` }}
                  className="h-full bg-orange-600"
                />
              </div>
              <p className="text-[9px] text-zinc-600 font-mono">LEGACY PROGRESS: {memory.skills.length}/10 SKILLS</p>
            </div>
          </div>
          
          <div className="px-2 space-y-1.5">
            <a 
              href="https://harishkotra.me" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-orange-500 transition-colors group"
            >
              <FileText className="w-3 h-3 text-zinc-600 group-hover:text-orange-500" />
              Built By <span className="font-bold">Harish Kotra</span>
            </a>
            <a 
              href="https://dailybuild.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-orange-500 transition-colors group"
            >
              <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-orange-500" />
              Checkout my other builds
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group",
        active 
          ? "bg-zinc-900 text-white font-medium" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("transition-colors", active ? "text-orange-500" : "text-zinc-600 group-hover:text-zinc-400")}>
          {icon}
        </span>
        {label}
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
    </button>
  );
}

function FileEditor({ content, title, icon, onBack }: { content: string; title: string; icon: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-mono text-sm font-medium">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 prose prose-invert max-w-none selection:bg-orange-500/30">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
