import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { GlassContainer } from '../components/ui/GlassContainer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const QUESTIONS = [
  "Knowledge Depth",
  "Clarity of Concepts",
  "Clinical Skills",
  "Practical Relevance",
  "Answering Questions",
  "Critical Thinking",
  "Session Structure",
  "Time Management",
  "Approachability",
  "Evaluation Fairness",
  "Evidence-Based",
  "Professionalism",
  "Student Engagement",
  "Clear Expectations",
  "Overall Impact"
];

const SCORE_MAP = {
  "Excellent": 4,
  "Good": 3,
  "Satisfactory": 2,
  "Poor": 1
};

const COLORS = ['#34c759', '#ffcc00', '#ff3b30'];

export const AnalyticsDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: responses, error } = await supabase
        .from('responses')
        .select('answers');

      if (error) throw error;
      setData(responses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 className="btn-spinner" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <GlassContainer>
          <div className="error-message">Error loading analytics: {error}</div>
        </GlassContainer>
      </div>
    );
  }

  const totalResponses = data.length;

  // Initialize accumulators
  let questionAverages = QUESTIONS.map((q) => ({ name: q, totalScore: 0, count: 0 }));
  let sentimentCount = { Positive: 0, Neutral: 0, Negative: 0 };

  data.forEach(response => {
    try {
      // Very defensive parsing
      let answersObj = response.answers;
      if (typeof answersObj === 'string') {
        answersObj = JSON.parse(answersObj);
      }
      
      if (!answersObj || typeof answersObj !== 'object') return;

      Object.keys(answersObj).forEach(key => {
        const index = parseInt(key, 10);
        const ans = answersObj[key];
        
        // Safety check index bounds
        if (!isNaN(index) && index >= 0 && index < questionAverages.length) {
          const score = SCORE_MAP[ans];
          if (score) {
            questionAverages[index].totalScore += score;
            questionAverages[index].count += 1;
          }
        }

        // Sentiment stats
        if (ans === "Excellent" || ans === "Good") sentimentCount.Positive += 1;
        else if (ans === "Satisfactory") sentimentCount.Neutral += 1;
        else if (ans === "Poor") sentimentCount.Negative += 1;
      });
    } catch (e) {
      // Silently ignore corrupted data entries
    }
  });

  // Calculate final averages
  const chartData = questionAverages.map(q => ({
    name: q.name,
    Score: q.count > 0 ? Number((q.totalScore / q.count).toFixed(2)) : 0
  }));

  const pieData = [
    { name: 'Positive', value: sentimentCount.Positive },
    { name: 'Neutral', value: sentimentCount.Neutral },
    { name: 'Negative', value: sentimentCount.Negative },
  ]; // Always show all sentiments, even if 0

  const totalScoresSum = chartData.reduce((acc, q) => acc + q.Score, 0);
  const validQuestionsCount = chartData.filter(q => q.Score > 0).length || 1;
  const overallAvg = totalScoresSum / validQuestionsCount;

  return (
    <div className="app-container">
      <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 style={{ background: 'linear-gradient(90deg, #1d1d1f, #86868b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Public Analytics Dashboard
        </h1>
        <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Anonymous Aggregated Feedback • Rehabilitology & Sports Medicine</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Responses</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-primary)' }}>{totalResponses}</div>
        </GlassContainer>
        <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Average (Out of 4)</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-success)' }}>{totalResponses === 0 ? "0.00" : overallAvg.toFixed(2)}</div>
        </GlassContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <GlassContainer>
          <h3 className="mb-6">Average Score by Question</h3>
          <div style={{ width: '100%' }}>
            {totalResponses === 0 ? (
              <div style={{ display: 'flex', height: '400px', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fill: 'var(--color-text-muted)' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Bar dataKey="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassContainer>

        <GlassContainer>
          <h3 className="mb-6">Overall Sentiment Analysis</h3>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {pieData.length === 0 ? (
              <div style={{ display: 'flex', height: '350px', alignItems: 'center', color: 'var(--color-text-muted)' }}>No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => {
                      const colorIndex = ['Positive', 'Neutral', 'Negative'].indexOf(entry.name);
                      return <Cell key={`cell-${index}`} fill={COLORS[colorIndex >= 0 ? colorIndex : index]} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {pieData.map((entry, index) => {
               const colorIndex = ['Positive', 'Neutral', 'Negative'].indexOf(entry.name);
               return (
                 <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[colorIndex >= 0 ? colorIndex : index] }}></div>
                   <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{entry.name}: {entry.value}</span>
                 </div>
               );
            })}
          </div>
        </GlassContainer>
      </div>
    </div>
  );
};
