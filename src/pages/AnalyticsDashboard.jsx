import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { GlassContainer } from '../components/ui/GlassContainer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Button } from '../components/ui/Button';
import { useRef } from 'react';

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

// Excellent = 4, Good = 3, Satisfactory = 2, Poor = 1
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
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef(null);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#f5f5f7',
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Academic_Analytics_Report.pdf');
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: responses, error } = await supabase
        .from('responses')
        .select('answers, created_at, photo_url, group_name');

      if (error) throw error;
      setData(responses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 className="btn-spinner" size={32} /></div>;
  if (error) return <div className="app-container"><GlassContainer><div className="error-message">Error loading analytics: {error}</div></GlassContainer></div>;

  const totalResponses = data.length;

  // Process data
  let questionAverages = QUESTIONS.map((q, i) => ({ name: q, avg: 0, total: 0 }));
  let sentimentCount = { Positive: 0, Neutral: 0, Negative: 0 };

  data.forEach(response => {
    const answers = response.answers;
    if (!answers) return;

    Object.keys(answers).forEach(qIndex => {
      const ans = answers[qIndex];
      const score = SCORE_MAP[ans];
      if (score && questionAverages[qIndex]) {
        questionAverages[qIndex].avg += score;
        questionAverages[qIndex].total += 1;
      }
      
      if (ans === "Excellent" || ans === "Good") sentimentCount.Positive++;
      else if (ans === "Satisfactory") sentimentCount.Neutral++;
      else if (ans === "Poor") sentimentCount.Negative++;
    });
  });

  questionAverages = questionAverages.map(q => ({
    name: q.name,
    Score: q.total > 0 ? Number((q.avg / q.total).toFixed(2)) : 0
  }));

  const pieData = [
    { name: 'Positive', value: sentimentCount.Positive },
    { name: 'Neutral', value: sentimentCount.Neutral },
    { name: 'Negative', value: sentimentCount.Negative },
  ];

  const overallAvg = questionAverages.reduce((acc, q) => acc + q.Score, 0) / (questionAverages.length || 1);
  const photosList = data.filter(r => r.photo_url).map(r => ({ url: r.photo_url, group: r.group_name }));

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ background: 'linear-gradient(90deg, #1d1d1f, #86868b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            Analytics Dashboard
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Anonymous Aggregated Feedback • Rehabilitology & Sports Medicine</p>
        </div>
        <Button onClick={handleExportPDF} isLoading={isExporting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}>
          <Download size={18} /> Export PDF Report
        </Button>
      </div>

      <div ref={printRef} style={{ backgroundColor: 'var(--color-bg)', padding: '1rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Responses</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-primary)' }}>{totalResponses}</div>
        </GlassContainer>
        <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Average (Out of 4)</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-success)' }}>{overallAvg ? overallAvg.toFixed(2) : 0}</div>
        </GlassContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <GlassContainer>
          <h3 className="mb-6">Average Score by Question</h3>
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionAverages} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fill: 'var(--color-text-muted)' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} 
                />
                <Bar dataKey="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassContainer>

        <GlassContainer>
          <h3 className="mb-6">Overall Sentiment Analysis</h3>
          <div style={{ height: '350px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            {totalResponses === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {pieData.map((entry, index) => (
               <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index] }}></div>
                 <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{entry.name}: {entry.value}</span>
               </div>
            ))}
          </div>
        </GlassContainer>

        {photosList.length > 0 && (
          <GlassContainer>
            <h3 className="mb-6">Class Photo Album</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
              {photosList.map((photo, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                  <img src={photo.url} alt={`Class group ${photo.group}`} loading="lazy" decoding="async" style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.6rem', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
                    Group: {photo.group}
                  </div>
                </div>
              ))}
            </div>
          </GlassContainer>
        )}
      </div>
      </div>
    </div>
  );
};
