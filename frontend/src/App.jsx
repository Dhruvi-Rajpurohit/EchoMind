import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { PenTool, Sparkles, Smile, LogOut, MessageSquare, Flame, Calendar, TrendingUp, Key, Mail, User, Send, Sun, Moon, ChevronRight, ChevronDown, FileText, RefreshCw, Cpu, BarChart3, Trash2, Edit3, Check, X, AlertCircle, PieChart } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [darkMode, setDarkMode] = useState(true); 
  
  // View Toggle: 'dashboard' or 'analytics'
  const [activeTab, setActiveTab] = useState('dashboard');

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [chatQuery, setChatQuery] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');

  // Editing states for timeline logs
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedDates, setExpandedDates] = useState({});

  const syncDashboardData = async (currentToken) => {
    if (!currentToken) return;
    setSyncing(true);
    try {
      const historyRes = await fetch(`http://127.0.0.1:8000/api/journal/history`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
      if (historyRes.ok) {
        const hData = await historyRes.json();
        if (hData?.data) setHistory(hData.data);
      }
      const insightsRes = await fetch(`http://127.0.0.1:8000/api/journal/insights`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
      if (insightsRes.ok) setInsights(await insightsRes.json());

      const interventionRes = await fetch(`http://127.0.0.1:8000/api/journal/intervention`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
      if (interventionRes.ok) setIntervention(await interventionRes.json());
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { if (token) syncDashboardData(token); }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isSignUp ? 'signup' : 'login';
    const payload = isSignUp ? { email: authEmail, password: authPassword, name: authName } : { email: authEmail, password: authPassword };
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        if (isSignUp) { setIsSignUp(false); setError('Account created successfully! Please log in.'); }
        else {
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setToken(data.access_token);
          setUser(data.user);
        }
      } else { setError(data.detail || "Authentication failed."); }
    } catch { setError("Cannot connect to backend."); }
  };

  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/journal/analyze', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }, 
        body: JSON.stringify({ content }) 
      });
      
      if (res.ok) {
        setContent(''); 
        await syncDashboardData(token); 
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || `Server error: ${res.status}`);
      }
    } catch (err) {
      setError("Failed to save entry. Is your backend server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleAIChatQuery = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setChatLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/journal/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ question: chatQuery }) });
      if (res.ok) { const data = await res.json(); setChatAnswer(data.answer); }
    } catch { setError("Chat error occurred."); }
    finally { setChatLoading(false); }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Are you sure you want to completely delete this entry? This action cannot be undone.")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/journal/entry/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await syncDashboardData(token);
      } else {
        setError("Failed to delete the entry from backend.");
      }
    } catch {
      setError("Error trying to process entry deletion.");
    }
  };

  const startEditing = (entry) => {
    setEditingLogId(entry.id || entry._id);
    setEditingContent(entry.content);
  };

  const handleUpdateLog = async (logId) => {
    if (!editingContent.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/journal/entry/${logId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ content: editingContent })
      });
      if (res.ok) {
        setEditingLogId(null);
        await syncDashboardData(token);
      } else {
        setError("Failed to update journal entry text content.");
      }
    } catch {
      setError("Network error encountered during entry save.");
    } finally {
      setEditLoading(false);
    }
  };

  // 1. MOOD-BASED ADAPTATION LOGIC ENGINE
  const getMoodAdaptiveStyles = () => {
    if (history.length === 0) {
      return {
        bgGradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
        shadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
        label: 'ACTIVE ENGINE',
        badgeColor: '#4f46e5'
      };
    }
    const latest = history[0]?.analysis?.emotions || {};
    const joy = latest.joy || 0;
    const stress = latest.stress || 0;
    const anxiety = latest.anxiety || 0;
    const confidence = latest.confidence || 0;

    const maxVal = Math.max(joy, stress, anxiety, confidence);

    if (maxVal < 0.25) {
      return {
        bgGradient: 'linear-gradient(135deg, #475569, #64748b)',
        shadow: '0 10px 25px -5px rgba(71, 85, 105, 0.4)',
        label: 'NEUTRAL STATE VECTORS',
        badgeColor: '#475569'
      };
    } else if (maxVal === stress) {
      return {
        bgGradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
        shadow: '0 10px 25px -5px rgba(239, 68, 68, 0.5)',
        label: 'HIGH STRESS RECOVERY ACTIVATED',
        badgeColor: '#b91c1c'
      };
    } else if (maxVal === anxiety) {
      return {
        bgGradient: 'linear-gradient(135deg, #6b21a8, #a855f7)',
        shadow: '0 10px 25px -5px rgba(168, 85, 247, 0.5)',
        label: 'ANXIETY BUFFERING PROFILE',
        badgeColor: '#6b21a8'
      };
    } else if (maxVal === joy) {
      return {
        bgGradient: 'linear-gradient(135deg, #ca8a04, #eab308)',
        shadow: '0 10px 25px -5px rgba(234, 179, 8, 0.5)',
        label: 'ELEVATED JOY SENTIMENT',
        badgeColor: '#ca8a04'
      };
    } else {
      return {
        bgGradient: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
        shadow: '0 10px 25px -5px rgba(14, 165, 233, 0.5)',
        label: 'HIGH FOCUS & CONFIDENCE',
        badgeColor: '#0369a1'
      };
    }
  };

  // SMART AI ROUTINE COACHING GENERATOR
  const getAICoachingAlert = () => {
    if (history.length === 0) return null;
    const recentLogs = history.slice(0, 5);
    
    let checks = { coding: false, exercise: false, reading: false };
    recentLogs.forEach(entry => {
      const list = entry?.analysis?.habits_detected || [];
      if (list.includes('coding')) checks.coding = true;
      if (list.includes('exercise')) checks.exercise = true;
      if (list.includes('reading')) checks.reading = true;
    });

    if (!checks.coding) {
      return {
        target: 'Coding',
        advice: "You haven't logged programming tasks in your recent logs. Re-engaging with daily logic builds triggers a 15% upward push to your average placement confidence curves."
      };
    }
    if (!checks.exercise) {
      return {
        target: 'Exercise',
        advice: "Physical movement metrics have dropped off. Historical analysis shows your cumulative stress scores decrease significantly on days when physical activities are logged."
      };
    }
    if (!checks.reading) {
      return {
        target: 'Reading',
        advice: "Consistent cognitive study inputs appear stalled. Consider reading just 10-15 minutes tonight to balance placement performance anxiety indicators."
      };
    }
    return {
      target: 'Routine Perfected',
      advice: "Your mental inputs and actionable routines are currently fully aligned. Continue maintaining this healthy multi-habit execution lifecycle!"
    };
  };

  const habits = (() => {
    const matrix = { coding: 0, exercise: 0, reading: 0 };
    history.forEach(r => {
      const list = r?.analysis?.habits_detected || [];
      if (list.includes('coding')) matrix.coding++;
      if (list.includes('exercise')) matrix.exercise++;
      if (list.includes('reading')) matrix.reading++;
    });
    return matrix;
  })();

  // ANALYTICS REPORT CORRELATION MATRIX ENGINE
  const computeAnalyticsReport = () => {
    const triggerWords = ['placement', 'exam', 'interview', 'coding', 'project', 'bug', 'sleep', 'family', 'friend'];
    const summaryMatrix = triggerWords.map(word => {
      let count = 0;
      let totalStress = 0;
      let totalJoy = 0;

      history.forEach(entry => {
        if (entry.content?.toLowerCase().includes(word)) {
          count++;
          totalStress += (entry.analysis?.emotions?.stress || 0);
          totalJoy += (entry.analysis?.emotions?.joy || 0);
        }
      });

      return {
        trigger: word.toUpperCase(),
        mentions: count,
        avgStress: count > 0 ? parseFloat((totalStress / count).toFixed(2)) : 0,
        avgJoy: count > 0 ? parseFloat((totalJoy / count).toFixed(2)) : 0,
      };
    }).filter(item => item.mentions > 0);

    return summaryMatrix;
  };

  const chartData = [...history].reverse().map(item => ({
    date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
    Joy: item.analysis?.emotions?.joy || 0,
    Anxiety: item.analysis?.emotions?.anxiety || 0,
    Stress: item.analysis?.emotions?.stress || 0,
    Confidence: item.analysis?.emotions?.confidence || 0,
  }));

  const getGroupedTimeline = () => {
    const monthsGroup = {};
    history.forEach(entry => {
      if (!entry.created_at) return;
      const dateObj = new Date(entry.created_at);
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const dateLabel = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      if (!monthsGroup[monthLabel]) monthsGroup[monthLabel] = {};
      if (!monthsGroup[monthLabel][dateLabel]) monthsGroup[monthLabel][dateLabel] = [];
      monthsGroup[monthLabel][dateLabel].push(entry);
    });
    return monthsGroup;
  };

  const toggleMonth = (m) => setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));
  const toggleDate = (d) => setExpandedDates(prev => ({ ...prev, [d]: !prev[d] }));

  const adaptiveStyles = getMoodAdaptiveStyles();
  const coachingAlert = getAICoachingAlert();
  const correlationReport = computeAnalyticsReport();

  const colors = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    sidebar: darkMode ? '#1e293b' : '#ffffff',
    card: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f8fafc' : '#0f172a',
    textMuted: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    inputBg: darkMode ? '#334155' : '#f1f5f9',
    inputBorder: darkMode ? '#475569' : '#cbd5e1',
    accent: '#6366f1',
    accentLight: 'rgba(99, 102, 241, 0.15)',
    treeHeader: darkMode ? '#334155' : '#f1f5f9'
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid #334155', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '14px', borderRadius: '20px', color: '#fff', marginBottom: '16px' }}>
              <PenTool size={32} />
            </div>
            <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: '800', margin: 0 }}>EchoMind AI</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '6px 0 0 0' }}>Your Intelligent Everyday Companion</p>
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isSignUp && (
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                <input type="text" placeholder="Your Name" required value={authName} onChange={e => setAuthName(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', background: '#334155', border: '1px solid #475569', borderRadius: '12px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
              <input type="email" placeholder="Email Address" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', background: '#334155', border: '1px solid #475569', borderRadius: '12px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
              <input type="password" placeholder="Password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', background: '#334155', border: '1px solid #475569', borderRadius: '12px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
              {isSignUp ? 'Create Account' : 'Log In'}
            </button>
          </form>
          <p onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{ textAlign: 'center', marginTop: '24px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
            {isSignUp ? 'Already have an account? Sign In' : 'New here? Create an account'}
          </p>
        </div>
      </div>
    );
  }

  const timelineTree = getGroupedTimeline();

  return (
    <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: colors.bg, color: colors.text, fontFamily: 'sans-serif', display: 'flex', transition: 'background-color 0.2s, color 0.2s', margin: 0, padding: 0, overflowX: 'hidden' }}>
      
      
      <aside style={{ width: '280px', minWidth: '280px', backgroundColor: colors.sidebar, borderRight: `1px solid ${colors.border}`, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '10px', borderRadius: '12px', color: '#fff' }}><PenTool size={22} /></div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: colors.text }}>EchoMind</h1>
            <span style={{ fontSize: '11px', color: colors.accent, fontWeight: '700' }}>AI DIARY RUNTIME</span>
          </div>
        </div>

        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: activeTab === 'dashboard' ? colors.accentLight : 'transparent', color: activeTab === 'dashboard' ? colors.accent : colors.text, border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
          >
            <Cpu size={18} /> Dashboard Mode
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: activeTab === 'analytics' ? colors.accentLight : 'transparent', color: activeTab === 'analytics' ? colors.accent : colors.text, border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
          >
            <PieChart size={18} /> Analytics Report Mode
          </button>
        </nav>

        <button onClick={() => setDarkMode(!darkMode)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', background: darkMode ? '#334155' : '#e2e8f0', color: colors.text, border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
          {darkMode ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#475569" />}
          {darkMode ? 'Light Theme' : 'Dark Theme'}
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ background: darkMode ? '#334155' : '#f1f5f9', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: colors.text }}>👋 Active: <b style={{ color: colors.accent }}>{user?.name || 'User'}</b></div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ width: '100%', background: darkMode ? '#475569' : '#e2e8f0', color: colors.text, border: 'none', padding: '10px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}><LogOut size={14} /> Log Out</button>
        </div>
      </aside>

      {/* DASHBOARD CONTAINER */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', color: colors.text }}>
              {activeTab === 'dashboard' ? 'Journal Engine Workspace' : 'Advanced Analytics Report'}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: colors.textMuted, fontSize: '14px' }}>
              {activeTab === 'dashboard' ? 'Log thoughts and perform dynamic deep-learning structural validation analysis.' : 'Identify underlying environmental trigger word correlations against stress matrices.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => syncDashboardData(token)} 
              disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: colors.card, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
            >
              <RefreshCw size={15} style={{ transform: syncing ? 'rotate(360deg)' : 'none', transition: syncing ? 'transform 1s linear infinite' : 'none' }} />
              {syncing ? 'Syncing...' : 'Refresh Logs'}
            </button>
            <div style={{ background: colors.card, padding: '14px 22px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '700' }}>ENTRIES RECORDED</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: colors.accent }}>{history.length} Logs</div>
            </div>
          </div>
        </header>

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '16px', borderRadius: '16px', width: '100%', boxSizing: 'border-box' }}>⚠️ {error}</div>}

        <section style={{ background: adaptiveStyles.bgGradient, padding: '28px', borderRadius: '24px', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: adaptiveStyles.shadow, transition: 'all 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '14px' }}><Cpu size={24} /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' }}>AI-Powered Personal Journal Analyzer</h3>
                <p style={{ margin: '2px 0 0 0', opacity: 0.85, fontSize: '13px' }}>Dynamic background vectors adaptively calculating profiles via deep sentiment matching cycles.</p>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '800', background: '#ffffff', color: adaptiveStyles.badgeColor, padding: '6px 14px', borderRadius: '30px', letterSpacing: '0.5px', transition: 'color 0.4s' }}>
              {adaptiveStyles.label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '4px' }}>
            {/* Live Diagnostics Block */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', opacity: 0.75, letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Smile size={14} /> LIVE AI ASSISTANT DIAGNOSTIC</div>
              {intervention && history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14.5px', fontStyle: 'italic', lineHeight: '1.5' }}>"{intervention.quote}"</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px' }}>🧘 {intervention.exercise}</span>
                    <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px' }}>⚡ {intervention.tip}</span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13.5px', opacity: 0.9 }}>Awaiting log generation to parse localized vector updates.</p>
              )}
            </div>

            {/* Live Forecasting Block */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', opacity: 0.75, letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} /> PATTERN FORECASTING STATUS</div>
              {history.length < 2 ? (
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>Requires 2 distinct logs to launch trends forecasting analytics.</p>
              ) : insights && (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', background: '#ffffff', color: '#10b981', display: 'inline-block', padding: '4px 12px', borderRadius: '8px', marginBottom: '6px' }}>
                    {insights.trend_prediction?.toUpperCase()}
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', opacity: 0.9, lineHeight: '1.4' }}>{insights.executive_summary}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {coachingAlert && history.length > 0 && (
          <div style={{ background: darkMode ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)', border: `1px solid ${colors.border}`, borderLeft: `5px solid ${colors.accent}`, padding: '20px 24px', borderRadius: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <AlertCircle size={22} color={colors.accent} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: colors.accent, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                🤖 INTELLIGENT ROUTINE COACHING WARNING: {coachingAlert.target.toUpperCase()}
              </span>
              <p style={{ margin: 0, fontSize: '14px', color: colors.text, lineHeight: '1.5' }}>{coachingAlert.advice}</p>
            </div>
          </div>
        )}

        {/* CONDITIONALLY SWITCH WORKSPACE VIEWS */}
        {activeTab === 'dashboard' ? (
          <>
            {/* WORKSPACE VIEW: MAIN SPLIT GRID (Editor & Graph) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ background: colors.card, border: `1px solid ${colors.border}`, padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: colors.accent }}><Sparkles size={20} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>Create New Diary Entry</h3></div>
                  <form onSubmit={handleJournalSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="How was your day? Write about your coding achievements, placement concerns, or general thoughts..." style={{ width: '100%', height: '160px', padding: '20px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '16px', color: colors.text, fontSize: '14px', lineHeight: '1.6', resize: 'none', outline: 'none', boxSizing: 'border-box' }} disabled={loading} />
                    <button type="submit" disabled={loading || !content.trim()} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                      {loading ? 'Processing Content Vectors...' : 'Save & Analyze Entry'}
                    </button>
                  </form>
                </div>

                <div style={{ background: colors.card, border: `1px solid ${colors.border}`, padding: '32px', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0ea5e9' }}><MessageSquare size={20} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>Semantic History Search Engine</h3></div>
                  <form onSubmit={handleAIChatQuery} style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" value={chatQuery} onChange={e => setChatQuery(e.target.value)} placeholder="Ask AI: What usually makes me feel stressed out?" style={{ flex: 1, padding: '14px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: '12px', color: colors.text, fontSize: '13px', outline: 'none' }} />
                    <button type="submit" style={{ padding: '0 24px', background: colors.text, color: colors.sidebar, border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={16} /></button>
                  </form>
                  {chatLoading && <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '12px' }}>Querying archive...</div>}
                  {chatAnswer && <div style={{ marginTop: '20px', background: darkMode ? 'rgba(14,165,233,0.1)' : '#f0f9ff', border: '1px solid rgba(14,165,233,0.2)', padding: '20px', borderRadius: '16px', fontSize: '13px', lineHeight: '1.6', color: colors.text }}><b>AI Insights Answer:</b> {chatAnswer}</div>}
                </div>
              </div>

              <div style={{ background: colors.card, border: `1px solid ${colors.border}`, padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}><BarChart3 size={18} color={colors.accent} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>Emotion Trajectory Curve</h3></div>
                {history.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '13px' }}>Save an entry above to automatically populate this graph.</div>
                ) : (
                  <div style={{ width: '100%', flex: 1, minHeight: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ left: -25, right: 10 }}>
                        <CartesianGrid stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: colors.textMuted, fontSize: 11 }} />
                        <YAxis domain={[0, 1]} tick={{ fill: colors.textMuted, fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, color: colors.text }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                        <Line type="monotone" dataKey="Joy" stroke="#eab308" strokeWidth={3} dot={true} />
                        <Line type="monotone" dataKey="Stress" stroke="#ef4444" strokeWidth={3} dot={true} />
                        <Line type="monotone" dataKey="Anxiety" stroke="#a855f7" strokeWidth={3} dot={true} />
                        <Line type="monotone" dataKey="Confidence" stroke="#0ea5e9" strokeWidth={3} dot={true} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* HABIT TRACKER DISPLAY VISUAL COUNTERS */}
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Flame size={22} color="#ef4444" style={{ flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: colors.text, letterSpacing: '-0.3px' }}>Automatic Habit Counter Tracker</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: colors.inputBg, borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: colors.text }}><span>💻</span><b>Coding & Programming Mentions</b></div>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: colors.accent, background: colors.accentLight, padding: '6px 14px', borderRadius: '10px' }}>{habits.coding} logs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', padding: '16px 20px', background: colors.inputBg, borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: colors.text }}><span>🏃</span><b>Sports, Gym, & Exercise Mentions</b></div>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '6px 14px', borderRadius: '10px' }}>{habits.exercise} logs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: colors.inputBg, borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: colors.text }}><span>📚</span><b>Reading & Studying Mentions</b></div>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '6px 14px', borderRadius: '10px' }}>{habits.reading} logs</span>
                </div>
              </div>
            </div>
          </>
        ) : (
         
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, padding: '32px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <PieChart size={22} color={colors.accent} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: colors.text }}>Core Environmental Trigger Correlation Matrix</h3>
              </div>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: colors.textMuted, lineHeight: '1.5' }}>
                This data table tracks critical subconscious triggers inside your entries, determining correlation weights across localized Stress vs. Joy indices.
              </p>

              {correlationReport.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', background: colors.inputBg, borderRadius: '16px' }}>
                  No primary indicator keywords (e.g., "placement", "exam", "coding", "sleep") detected inside your repository history yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  {/* Table Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {correlationReport.map((row, index) => (
                      <div key={index} style={{ padding: '16px 20px', background: colors.inputBg, borderRadius: '14px', border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: colors.text, display: 'block' }}>🔍 {row.trigger}</span>
                          <span style={{ fontSize: '12px', color: colors.textMuted }}>Found in {row.mentions} distinct entries</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', display: 'block' }}>AVG STRESS</span>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: '#ef4444' }}>{(row.avgStress * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#ca8a04', display: 'block' }}>AVG JOY</span>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: '#ca8a04' }}>{(row.avgJoy * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                
                  <div style={{ background: colors.inputBg, borderRadius: '16px', padding: '24px', minHeight: '300px', border: `1px solid ${colors.border}` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={correlationReport}>
                        <CartesianGrid stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="3 3" />
                        <XAxis dataKey="trigger" tick={{ fill: colors.textMuted, fontSize: 11 }} />
                        <YAxis domain={[0, 1]} tick={{ fill: colors.textMuted, fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, color: colors.text }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="avgStress" name="Correlation Base Stress" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avgJoy" name="Correlation Base Joy" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

     
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, padding: '32px', borderRadius: '24px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
            <Calendar size={22} color={colors.textMuted} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: colors.text }}>Chronological Diary Tree Folder</h3>
          </div>

          {Object.keys(timelineTree).length === 0 ? (
            <div style={{ padding: '10px 0', color: colors.textMuted, fontSize: '13px', fontStyle: 'italic' }}>Your history is completely empty. Start writing to structure your timeline folders.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.keys(timelineTree).map(month => {
                const isMonthOpen = !!expandedMonths[month];
                const datesInMonth = timelineTree[month];

                return (
                  <div key={month} style={{ border: `1px solid ${colors.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                    <div 
                      onClick={() => toggleMonth(month)} 
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', background: colors.treeHeader, cursor: 'pointer', userSelect: 'none', fontWeight: '700', fontSize: '15px', color: colors.text }}
                    >
                      {isMonthOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span>📅 {month}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: colors.textMuted, background: colors.bg, padding: '2px 10px', borderRadius: '20px' }}>
                        {Object.values(datesInMonth).flat().length} entries
                      </span>
                    </div>

                    {isMonthOpen && (
                      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px', background: colors.card }}>
                        {Object.keys(datesInMonth).map(dateStr => {
                          const isDateOpen = !!expandedDates[dateStr];
                          const logs = datesInMonth[dateStr];

                          return (
                            <div key={dateStr} style={{ borderLeft: `2px solid ${colors.border}`, paddingLeft: '14px', marginLeft: '6px' }}>
                              <div 
                                onClick={() => toggleDate(dateStr)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer', userSelect: 'none', color: isDateOpen ? colors.accent : colors.text, fontSize: '14px', fontWeight: '600' }}
                              >
                                {isDateOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <span>📄 {dateStr}</span>
                                <span style={{ fontSize: '11px', color: colors.textMuted, marginLeft: '4px' }}>({logs.length} logged)</span>
                              </div>

                              {isDateOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px', paddingLeft: '14px' }}>
                                  {logs.map((entry, idx) => {
                                    const score = entry?.analysis?.overall_sentiment;
                                    const entryId = entry.id || entry._id;
                                    const isCurrentlyEditing = editingLogId === entryId;

                                    const badgeColor = score === 'Positive' ? '#10b981' : score === 'Negative' ? '#ef4444' : '#6b7280';
                                    const badgeBg = score === 'Positive' ? 'rgba(16,185,129,0.15)' : score === 'Negative' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)';
                                    
                                    return (
                                      <div key={entryId || idx} style={{ padding: '16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FileText size={12} /> Log Entry #{idx + 1}
                                          </span>
                                          
                                          {/* INTERACTIVE CONTROLS FOR MODIFICATIONS */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ background: badgeBg, padding: '2px 8px', borderRadius: '6px', color: badgeColor, fontSize: '10px', fontWeight: '800' }}>
                                              {score?.toUpperCase()}
                                            </span>
                                            
                                            {!isCurrentlyEditing ? (
                                              <>
                                                <button title="Edit Text content" onClick={() => startEditing(entry)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 2 }}><Edit3 size={13} /></button>
                                                <button title="Delete log permanently" onClick={() => handleDeleteLog(entryId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
                                              </>
                                            ) : (
                                              <div style={{ display: 'flex', gap: '6px' }}>
                                                <button disabled={editLoading} title="Confirm update" onClick={() => handleUpdateLog(entryId)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><Check size={14} /></button>
                                                <button disabled={editLoading} title="Cancel" onClick={() => setEditingLogId(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* LOG EDITOR TEXTAREA CONTENT BOX */}
                                        {isCurrentlyEditing ? (
                                          <textarea 
                                            value={editingContent} 
                                            onChange={e => setEditingContent(e.target.value)}
                                            style={{ width: '100%', minHeight: '80px', padding: '10px', background: colors.card, border: `1px solid ${colors.accent}`, borderRadius: '8px', color: colors.text, fontSize: '13.5px', outline: 'none', resize: 'vertical', fontFamily: 'sans-serif', margin: '4px 0 10px 0', boxSizing: 'border-box' }}
                                          />
                                        ) : (
                                          <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', lineHeight: '1.5', fontStyle: 'italic', color: colors.text }}>"{entry.content}"</p>
                                        )}

                                        <div style={{ fontSize: '12px', color: colors.accent, fontWeight: '500', borderTop: `1px solid ${colors.border}`, paddingTop: '8px' }}>
                                          ✨ <b>AI Diagnostic Note:</b> {entry.analysis?.summary}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}