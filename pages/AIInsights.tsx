import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppState } from '../App';
import { 
  Sparkles, 
  BrainCircuit, 
  Lightbulb, 
  Rocket, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  Send, 
  User, 
  Bot, 
  TrendingUp, 
  Calendar, 
  ArrowRight,
  Target,
  FileText
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const AIInsights = () => {
  const { transactions, investments, budgets, settings, formatMoney, accounts } = useAppState();
  
  // UI Panels toggle tab
  const [activeTab, setActiveTab] = useState<'insights' | 'chat' | 'predictions'>('insights');

  // Insights Tab states
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsData, setInsightsData] = useState<any[]>([]);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Chat Tab states
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Hello ${settings.name || 'Investor'}! I am Finance AI, your personal financial advisor. I have loaded your real-time ledger containing ${transactions.length} transactions, ${accounts.length} bank assets, and ${investments.length} investment holdings. Ask me anything about your dividends, stock yields, active SIP status, or general budget savings!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Predictions Tab states
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsData, setPredictionsData] = useState<any[]>([]);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);

  // Auto-scroll chat history
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  // Aggregate financial metrics summary payload
  const localSummaryPayload = useMemo(() => {
    return {
      userName: settings.name || 'User',
      currency: settings.currency || 'INR',
      accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance })),
      totalCashBalance: accounts.reduce((s, a) => s + a.balance, 0),
      transactionsCount: transactions.length,
      recentLedger: transactions.slice(0, 15).map(t => ({ 
        amount: t.amount, 
        type: t.type, 
        category: t.category, 
        desc: t.description,
        date: t.date
      })),
      investmentsCount: investments.length,
      totalInvestedCost: investments.reduce((acc, i) => acc + (i.quantity * i.buyPrice), 0),
      portfolioCurrentValue: investments.reduce((acc, i) => acc + (i.quantity * i.currentPrice), 0),
      holdings: investments.map(i => ({
        name: i.name,
        symbol: i.symbol,
        type: i.type,
        qty: i.quantity,
        buyPrice: i.buyPrice,
        currentPrice: i.currentPrice,
        isSIP: i.isSIP,
        sipAmount: i.sipAmount,
        goalName: i.goalName,
        goalTarget: i.goalTarget
      })),
      monthlyBudgets: budgets.map(b => b.categories.map(c => ({ category: c.category, limit: c.budgetAmount }))).flat()
    };
  }, [transactions, investments, budgets, settings, accounts]);

  // Securely query /api/gemini/insights
  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: localSummaryPayload })
      });
      if (!res.ok) throw new Error('Failed to generate insights from secure server route.');
      const data = await res.json();
      setInsightsData(data);
    } catch (err: any) {
      console.error(err);
      setInsightsError(err.message || 'Server connection timed out. Please check your config keys.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // Chat message submit handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userText = chatMessage;
    setChatMessage('');
    
    // Append User item to UI Chat logs
    const msgId = Math.random().toString();
    const newUserMsg: ChatMessage = {
      id: msgId,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          fullContext: localSummaryPayload
        })
      });

      if (!res.ok) throw new Error('Connection to secure chat failed.');
      const data = await res.json();
      
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'bot',
        text: data.reply || "I couldn't calculate that. Please try rephrasing.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errBotMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'bot',
        text: "I apologize, but I am experiencing temporary model latency. Please ensure your GEMINI_API_KEY environment config holds a valid payload.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, errBotMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Securely query /api/gemini/predictions
  const compilePredictions = async () => {
    setPredictionsLoading(true);
    setPredictionsError(null);
    try {
      const res = await fetch('/api/gemini/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSummary: localSummaryPayload })
      });
      if (!res.ok) throw new Error('Compiling forecast failed.');
      const data = await res.json();
      setPredictionsData(data);
    } catch (err: any) {
      console.error(err);
      setPredictionsError(err.message || 'Forecast compilation engine failed to communicate.');
    } finally {
      setPredictionsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'saving': return <Lightbulb className="text-amber-500" />;
      case 'investing': return <Rocket className="text-indigo-500" />;
      case 'alert': return <AlertCircle className="text-red-500" />;
      case 'growth': return <BrainCircuit className="text-emerald-500" />;
      default: return <Sparkles className="text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Premium Gradient Banner */}
      <div className="bg-primary-gradient p-6 rounded-3xl text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-md">
            WealthFlow Co-Pilot AI
          </span>
          <h2 className="text-3xl font-black tracking-tight">Meet Finance AI Assistant</h2>
          <p className="text-xs text-indigo-150 max-w-xl">
            A secure Gemini-run financial brain. Discover investment leakages, auto-calculate SIP compound goals, and get real predictive reports.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent flex items-center justify-end pr-6">
          <BrainCircuit size={84} className="opacity-20 animate-pulse text-indigo-100" />
        </div>
      </div>

      {/* Modern Material 3 Rounded Tab Controllers */}
      <div className="flex bg-neutral-100 dark:bg-slate-900 p-1 rounded-2xl border dark:border-slate-800 gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'insights' ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
        >
          <Lightbulb size={15} />
          <span>Smart Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'chat' ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
        >
          <Bot size={15} />
          <span>Chatbot Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'predictions' ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
        >
          <TrendingUp size={15} />
          <span>Smart Predictions</span>
        </button>
      </div>

      {/* ======================= VIEW SYSTEM ======================= */}

      {/* VIEW: INSIGHTS GENERATOR */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4.5 rounded-2xl border dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Intelligent Portfolio Analysis</h3>
              <p className="text-[10px] text-slate-400 font-medium">Auto-scrapes manual transaction ledger and mutual funds listings</p>
            </div>
            <button
              onClick={generateInsights}
              disabled={insightsLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black p-2.5 px-4 rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
            >
              {insightsLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{insightsLoading ? 'Analyzing...' : 'Generate Insights'}</span>
            </button>
          </div>

          {insightsError && (
            <div className="bg-red-50 text-red-650 p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-xs font-bold font-mono">
              <AlertCircle size={18} />
              <span>{insightsError}</span>
            </div>
          )}

          {insightsData.length === 0 && !insightsLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border dark:border-slate-800 max-w-xl mx-auto flex flex-col items-center gap-4">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-full flex items-center justify-center">
                <BrainCircuit size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">No Smart Advice compiled yet</h4>
                <p className="text-xs text-slate-400 mt-1">Tap the Generate button above. Our AI advisor will review your active portfolios, liquid assets, and budget spending to construct custom advice points.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightsData.map((item, index) => (
                <div key={index} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-slate-50 dark:bg-slate-950/50 rounded-xl border dark:border-slate-850 flex items-center justify-center shrink-0">
                      {getIcon(item.iconType)}
                    </div>
                    <div className="space-y-1 text-left">
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white leading-tight">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: INTERACTIVE CHATBOT */}
      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-slate-905 border dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[520px] shadow-sm">
          {/* Conversation log head */}
          <div className="p-4 px-5 border-b dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/20">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <div>
              <h3 className="font-bold text-xs text-slate-950 dark:text-white">Finance AI Assistant</h3>
              <p className="text-[9px] text-slate-400">Secure Live Connection established • Context loaded</p>
            </div>
          </div>

          {/* Dialog bubble scroller */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-left">
            {chatHistory.map(msg => {
              const bot = msg.sender === 'bot';
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${bot ? 'self-start' : 'ml-auto flex-row-reverse text-right'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bot ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                    {bot ? <Bot size={14} /> : <User size={14} />}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold block">{msg.time}</span>
                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${bot ? 'bg-neutral-50 dark:bg-slate-900 border dark:border-slate-800/80 text-slate-850 dark:text-slate-100 rounded-tl-none whitespace-pre-wrap' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] text-slate-400 font-bold block">Analyzing data...</span>
                  <div className="p-3.5 bg-neutral-50 dark:bg-slate-900 rounded-2xl text-xs rounded-tl-none text-slate-450 italic flex items-center gap-2">
                    <RefreshCw size={11} className="animate-spin text-indigo-500" />
                    <span>Thinking... reviewing manual transaction ledgers</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Send Input Bar Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-t dark:border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Ask Finance AI... e.g., 'What is my current mutual fund gain percent?'"
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 text-xs border dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 text-slate-850 dark:text-white"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* VIEW: PREDICTIONS & COMPOUND TIMELINES */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4.5 rounded-2xl border dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Forward Compound Predictions</h3>
              <p className="text-[10px] text-slate-400 font-medium">Auto-projects 12-month metrics using constant linear & exponential compounding</p>
            </div>
            <button
              onClick={compilePredictions}
              disabled={predictionsLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black p-2.5 px-4 rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
            >
              {predictionsLoading ? <RefreshCw size={13} className="animate-spin" /> : <TrendingUp size={13} />}
              <span>{predictionsLoading ? 'Forecasting...' : 'Compile Predictions'}</span>
            </button>
          </div>

          {predictionsError && (
            <div className="bg-red-50 text-red-650 p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-xs font-bold font-mono">
              <AlertCircle size={18} />
              <span>{predictionsError}</span>
            </div>
          )}

          {predictionsData.length === 0 && !predictionsLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border dark:border-slate-800 max-w-xl mx-auto flex flex-col items-center gap-4">
              <div className="w-14 h-14 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-full flex items-center justify-center">
                <Target size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">No Forecast compiled yet</h4>
                <p className="text-xs text-slate-400 mt-1">Tap the Forecasting button above. Our AI advisor model will calculate cashflow velocity bounds and compile 6-12 month savings and portfolio compounding projections.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictionsData.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-all text-left">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                          {item.title}
                        </span>
                        <span className="text-[10px] bg-neutral-100 dark:bg-slate-800 text-slate-650 px-2 py-0.5 rounded-full font-bold">
                          Rate: {item.rate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra static compound guide card */}
              <div className="bg-purple-900 text-white p-5 rounded-2xl space-y-2 relative overflow-hidden text-left shadow-lg">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-purple-200">Compounding Rule of 72 Strategy</h4>
                <p className="text-[11px] text-purple-100/90 leading-normal max-w-lg font-sans">
                  Based on your holdings, compounding returns is critical. At an estimated XIRR yield of 12%, your wealth will double in value every 6 years. Set goal values inside the asset registration drawer to visualize target tracks automatically.
                </p>
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/10 to-transparent"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;
