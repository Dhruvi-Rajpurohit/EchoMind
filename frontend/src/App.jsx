import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, Send, History, Sparkles, AlertCircle, ThumbsUp, Activity, FileText, Clock, Smile } from 'lucide-react';

export default function App() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [userId] = useState('intern_user_1');

  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/journal/history/${userId}`);
      const result = await response.json();
      if (result.status === 'success') {
        // Keep chronological order (Oldest -> Newest) for the Line Chart
        setHistory(result.data.reverse());
      }
    } catch (err) {
      console.error("Backend connectivity issue:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/journal/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content })
      });

      if (response.ok) {
        setContent('');
        fetchHistory();
      } else {
        const result = await response.json();
        setError(result.detail || "Processing encountered an issue.");
      }
    } catch (err) {
      setError("Cannot communicate with FastAPI backend server. Ensure it is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  // Compute metrics from log history
  const totalEntries = history.length;
  
  const avgWordCount = totalEntries > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.patterns?.word_count || 0), 0) / totalEntries)
    : 0;

  const peakWritingHour = () => {
    if (totalEntries === 0) return "N/A";
    const hours = history.map(item => item.patterns?.hour_of_day ?? new Date(item.created_at).getHours());
    const counts = hours.reduce((acc, hr) => ({ ...acc, [hr]: (acc[hr] || 0) + 1 }), {});
    const peak = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "0");
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
    date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Joy: item.analysis?.emotions?.joy || 0,
    Anxiety: item.analysis?.emotions?.anxiety || 0,
    Sadness: item.analysis?.emotions?.sadness || 0,
    Anger: item.analysis?.emotions?.anger || 0,
    Serenity: item.analysis?.emotions?.serenity || 0,
  }));

  const getSentimentStyle = (sentiment) => {
    if (sentiment === 'Positive') return { bg: '#dcfce7', text: '#15803d' };
    if (sentiment === 'Negative') return { bg: '#fee2e2', text: '#b91c1c' };
    return { bg: '#f1f5f9', text: '#475569' };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '40px 20px', color: '#1e293b' }}>
      
      {/* Header */}
      <header style={{ maxWidth: '1200px', margin: '0 auto 32px auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ backgroundColor: '#6366f1', padding: '12px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
          <Brain color="#ffffff" size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.025em', color: '#0f172a', margin: 0 }}>EchoMind</h1>
          <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', margin: '4px 0 0 0' }}>AI Personal Journal Analyzer & Pattern Detection Engine</p>
        </div>
      </header>

      {/* Habits Dashboard Panel */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 32px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#e0e7ff', padding: '12px', borderRadius: '12px', color: '#4338ca' }}><Activity size={22} /></div>
          <div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Dominant Emotion Theme</span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#1e1b4b' }}>{dominantSentiment()}</h3>
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#fef9c3', padding: '12px', borderRadius: '12px', color: '#a16207' }}><FileText size={22} /></div>
          <div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Average Entry Length</span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#1e1b4b' }}>{avgWordCount} words</h3>
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '12px', color: '#15803d' }}><Clock size={22} /></div>
          <div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Peak Reflection Habit</span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#1e1b4b' }}>{peakWritingHour()}</h3>
          </div>
        </div>
      </section>

      {error && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #fee2e2', fontSize: '14px', fontWeight: '500' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form and Graph Column Splits */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: window.innerWidth > 968 ? '1.1fr 0.9fr' : '1fr', gap: '32px' }}>
        
        {/* Entry Textarea Card */}
        <section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Sparkles color="#6366f1" size={20} />
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Log Daily Activity</h2>
          </div>
          
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="How are you genuinely holding up? Analyze how your day went, what goals you crossed off, or any anxieties lingering..."
              style={{ width: '100%', height: '240px', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', resize: 'none', boxSizing: 'border-box', fontSize: '15px', color: '#334155', lineHeight: '1.6', outline: 'none' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !content.trim()}
              style={{ marginTop: '16px', width: '100%', padding: '14px', backgroundColor: loading ? '#cbd5e1' : '#6366f1', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.25)' }}
            >
              <Send size={16} />
              {loading ? 'Analyzing Writing Patterns...' : 'Analyze & Save Entry'}
            </button>
          </form>
        </section>

        {/* Chart Window */}
        <section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '24px', margin: 0 }}>Emotional Trends Matrix</h2>
          
          {chartData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', textAlign: 'center', gap: '12px' }}>
              <Smile size={40} strokeWidth={1.5} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Waiting for dataset logs.<br/>Write an entry to plot your pattern fluctuation chart.</p>
            </div>
          ) : (
            <div style={{ width: '100%', flex: 1, minHeight: '260px' }}>
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#e2e8f0" />
                  <YAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#e2e8f0" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }} />
                  <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '13px', fontWeight: '500' }} iconType="circle" />
                  <Line type="monotone" dataKey="Joy" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Anxiety" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Serenity" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Historical Logs Archive Feed */}
      <section style={{ maxWidth: '1200px', margin: '40px auto 0 auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <History color="#475569" size={20} />
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Chronological Reflections Feed</h2>
        </div>

        {history.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, fontWeight: '500' }}>Historical logs pipeline is currently empty.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {history.slice().reverse().map((entry) => {
              const themeStyle = getSentimentStyle(entry.analysis?.overall_sentiment);
              const wCount = entry.patterns?.word_count || entry.content.split(' ').length;
              return (
                <div key={entry._id} style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>
                      {new Date(entry.created_at).toLocaleString()} | <span style={{ color: '#64748b' }}>📝 {wCount} words</span>
                    </span>
                    <span style={{ backgroundColor: themeStyle.bg, color: themeStyle.text, fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.025em' }}>
                      {entry.analysis?.overall_sentiment ? entry.analysis.overall_sentiment.toUpperCase() : "NEUTRAL"}
                    </span>
                  </div>
                  
                  <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: '1.6' }}>
                    "{entry.content}"
                  </p>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                    <ThumbsUp color="#6366f1" size={14} style={{ marginTop: '3px', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '13px', color: '#4f46e5', fontWeight: '500', lineHeight: '1.4' }}>
                      <b style={{ color: '#475569', fontWeight: '600' }}>AI Summary Reflection:</b> {entry.analysis?.summary}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {entry.analysis?.themes?.map((theme, i) => (
                      <span key={i} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}