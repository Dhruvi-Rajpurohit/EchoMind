import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, Send, History, Sparkles, AlertCircle, ThumbsUp, Activity, FileText, Clock, Smile, LogOut, Lock, User } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  
  // Dashboard states
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const fetchHistory = async (currentToken) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/journal/history`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setHistory(result.data.reverse());
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Connectivity issue:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistory(token);
    }
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isSignUp ? 'signup' : 'login';
    const payload = isSignUp 
      ? { email: authEmail, password: authPassword, name: authName }
      : { email: authEmail, password: authPassword };

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (response.ok) {
        if (isSignUp) {
          setIsSignUp(false);
          setError('Signup successful! Please log in.');
        } else {
          localStorage.setItem('token', result.access_token);
          localStorage.setItem('user', JSON.stringify(result.user));
          setToken(result.access_token);
          setUser(result.user);
        }
      } else {
        setError(result.detail || "Authentication failed.");
      }
    } catch (err) {
      setError("Cannot reach backend authentication services.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setHistory([]);
  };

  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/journal/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        setContent('');
        fetchHistory(token);
      } else {
        const result = await response.json();
        setError(result.detail || "Processing encountered an issue.");
      }
    } catch (err) {
      setError("Cannot communicate with FastAPI backend server.");
    } finally {
      setLoading(false);
    }
  };

  // Metric Aggregation Pipeline
  const totalEntries = history.length;
  const avgWordCount = totalEntries > 0 ? Math.round(history.reduce((acc, curr) => acc + (curr.patterns?.word_count || 0), 0) / totalEntries) : 0;

  const peakWritingHour = () => {
    if (totalEntries === 0) return "N/A";
    const hours = history.map(item => item.patterns?.hour_of_day ?? 12);
    const counts = hours.reduce((acc, hr) => ({ ...acc, [hr]: (acc[hr] || 0) + 1 }), {});
    const peak = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "12");
    const hourNum = parseInt(peak, 10);
    return hourNum === 0 ? "12 AM" : hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`;
  };

  const dominantSentiment = () => {
    if (totalEntries === 0) return "N/A";
    const sentiments = history.map(item => item.analysis?.overall_sentiment || "Neutral");
    const counts = sentiments.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "Neutral");
  };

  const chartData = history.map(item => ({
    date: new Date(item.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' }),
    Joy: item.analysis?.emotions?.joy || 0,
    Anxiety: item.analysis?.emotions?.anxiety || 0,
    Serenity: item.analysis?.emotions?.serenity || 0,
  }));

  const getSentimentStyle = (sentiment) => {
    if (sentiment === 'Positive') return { bg: '#dcfce7', text: '#15803d' };
    if (sentiment === 'Negative') return { bg: '#fee2e2', text: '#b91c1c' };
    return { bg: '#e2e8f0', text: '#475569' }; // Styled beautifully for Neutral
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', width: '100%', maxWidth: '420px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#6366f1', padding: '12px', borderRadius: '16px', color: '#ffffff', marginBottom: '16px' }}><Brain size={32} /></div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>{isSignUp ? 'Create Account' : 'Welcome to EchoMind'}</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>AI-Driven Journal Insights</p>
          </div>
          {error && <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isSignUp && (
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                <input type="text" placeholder="Full Name" required value={authName} onChange={e => setAuthName(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
              <input type="email" placeholder="Email Address" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
              <input type="password" placeholder="Password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#6366f1', color: '#ffffff', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b' }}>
            {isSignUp ? "Already have an account? " : "New to EchoMind? "}
            <span onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{ color: '#6366f1', fontWeight: '600', cursor: 'pointer' }}>{isSignUp ? 'Sign In' : 'Create Account'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '40px 20px', color: '#1e293b' }}>
      {/* Dashboard Top Navigation header */}
      <header style={{ maxWidth: '1200px', margin: '0 auto 32px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#6366f1', padding: '12px', borderRadius: '16px', color: '#ffffff' }}><Brain size={28} /></div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>EchoMind</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Hello, {user?.name || 'User'}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', color: '#64748b' }}><LogOut size={16} /> Logout</button>
      </header>

      {/* Pattern highlights decks */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 32px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#e0e7ff', padding: '12px', borderRadius: '12px', color: '#4338ca' }}><Activity size={22} /></div>
          <div><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Dominant Trend</span><h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800' }}>{dominantSentiment()}</h3></div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#fef9c3', padding: '12px', borderRadius: '12px', color: '#a16207' }}><FileText size={22} /></div>
          <div><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Avg Entry Length</span><h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800' }}>{avgWordCount} words</h3></div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '12px', color: '#15803d' }}><Clock size={22} /></div>
          <div><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Peak Habit Hour</span><h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800' }}>{peakWritingHour()}</h3></div>
        </div>
      </section>

      {/* Main Splits Area */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: window.innerWidth > 968 ? '1.1fr 0.9fr' : '1fr', gap: '32px' }}>
        <section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><Sparkles color="#6366f1" size={20} /><h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Log Daily Activity</h2></div>
          <form onSubmit={handleJournalSubmit}>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Pour your thoughts out here..." style={{ width: '100%', height: '220px', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', resize: 'none', boxSizing: 'border-box', fontSize: '15px', outline: 'none', lineHeight: '1.6' }} disabled={loading} />
            <button type="submit" disabled={loading || !content.trim()} style={{ marginTop: '16px', width: '100%', padding: '14px', backgroundColor: loading ? '#cbd5e1' : '#6366f1', color: '#ffffff', borderRadius: '16px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
              {loading ? 'Analyzing patterns...' : 'Save & Analyze Entry'}
            </button>
          </form>
        </section>

        <section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', margin: 0 }}>Fluctuation Spectrum</h2>
          {chartData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}><Smile size={32} /></div>
          ) : (
            <div style={{ width: '100%', flex: 1, minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Joy" stroke="#eab308" strokeWidth={3} />
                  <Line type="monotone" dataKey="Anxiety" stroke="#a855f7" strokeWidth={3} />
                  <Line type="monotone" dataKey="Serenity" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Historical Logs Archive Feed */}
      <section style={{ maxWidth: '1200px', margin: '40px auto 0 auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}><History color="#475569" size={20} /><h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Chronological Reflections Feed</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {history.slice().reverse().map((entry) => {
            const themeStyle = getSentimentStyle(entry.analysis?.overall_sentiment);
            
            // Explicit Indian Standard Time (IST) formatting configuration
            const localDateStr = entry.created_at 
              ? new Date(entry.created_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })
              : 'Unknown Date';

            return (
              <div key={entry._id} style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>{localDateStr}</span>
                  <span style={{ backgroundColor: themeStyle.bg, color: themeStyle.text, fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' }}>
                    {entry.analysis?.overall_sentiment ? entry.analysis.overall_sentiment.toUpperCase() : 'NEUTRAL'}
                  </span>
                </div>
                
                <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: '1.6' }}>"{entry.content}"</p>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                  <ThumbsUp size={14} color="#6366f1" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#4f46e5', fontWeight: '500', lineHeight: '1.4' }}>
                    <b style={{ color: '#475569', fontWeight: '600' }}>AI Summary Reflection ({Math.round((entry.analysis?.confidence_score || 0) * 100)}% Conf):</b> {entry.analysis?.summary || 'No summary available.'}
                  </p>
                </div>

                {entry.analysis?.themes && entry.analysis.themes.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {entry.analysis.themes.map((theme, i) => (
                      <span key={i} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                        #{theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}