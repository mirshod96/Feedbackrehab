import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { GlassContainer } from '../components/ui/GlassContainer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Download, ShieldCheck, Mail, Key } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';

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
  
  // Export & Security State
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [modalErr, setModalErr] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const handleExportClick = () => {
    if (isVerified) {
      handleExportPDF();
    } else {
      setShowModal(true);
    }
  };

  const handleSendCode = () => {
    if (!email.includes('@')) {
      setModalErr('Please enter a valid institution email address.');
      return;
    }
    setModalErr('');
    setIsSending(true);
    // Simulate secure OTP delivery for demonstration
    setTimeout(() => {
      setIsSending(false);
      setStep(2);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 4) {
      setModalErr('Please enter the 4-digit code (Use any 4 digits for demo).');
      return;
    }
    setModalErr('');
    setIsVerified(true);
    setShowModal(false);
    setTimeout(() => {
      handleExportPDF(); // Autostart after closing modal
    }, 300);
  };

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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 className="btn-spinner" size={32} /></div>;
  if (error) return <div className="app-container"><GlassContainer><div className="error-message">Error loading analytics: {error}</div></GlassContainer></div>;

  const totalResponses = data.length;

  // --- Complex Data Aggregation ---
  const groupMap = {};
  let overallSentiment = { Positive: 0, Neutral: 0, Negative: 0 };
  let overallQAvgs = QUESTIONS.map((q) => ({ name: q, avg: 0, total: 0 }));

  data.forEach(response => {
    const gn = response.group_name && response.group_name.trim() !== '' ? response.group_name.trim() : 'Unknown';
    if (!groupMap[gn]) {
      groupMap[gn] = {
        name: gn,
        total: 0,
        sentiment: { Excellent: 0, Good: 0, Satisfactory: 0, Poor: 0 },
        qAvgs: QUESTIONS.map(q => ({ name: q, scoreSum: 0, count: 0 }))
      };
    }
    
    groupMap[gn].total += 1;
    const answers = response.answers;
    
    if (answers) {
      Object.keys(answers).forEach(qIndex => {
        const ans = answers[qIndex];
        const score = SCORE_MAP[ans];
        
        if (ans && groupMap[gn].sentiment[ans] !== undefined) {
          groupMap[gn].sentiment[ans]++;
        }
        
        if (score && groupMap[gn].qAvgs[qIndex]) {
          groupMap[gn].qAvgs[qIndex].scoreSum += score;
          groupMap[gn].qAvgs[qIndex].count += 1;
          
          overallQAvgs[qIndex].avg += score;
          overallQAvgs[qIndex].total += 1;
        }

        if (ans === "Excellent" || ans === "Good") overallSentiment.Positive++;
        else if (ans === "Satisfactory") overallSentiment.Neutral++;
        else if (ans === "Poor") overallSentiment.Negative++;
      });
    }
  });

  const groupDataArray = Object.values(groupMap).map(g => {
    return {
      name: g.name,
      total: g.total,
      ratings: g.sentiment,
      averageScore: g.qAvgs.reduce((acc, q) => acc + (q.count > 0 ? q.scoreSum / q.count : 0), 0) / (g.qAvgs.length || 1)
    };
  }).sort((a,b) => b.total - a.total);

  const processedOverallQAvgs = overallQAvgs.map(q => ({
    name: q.name,
    Score: q.total > 0 ? Number((q.avg / q.total).toFixed(2)) : 0
  }));

  const pieData = [
    { name: 'Positive', value: overallSentiment.Positive },
    { name: 'Neutral', value: overallSentiment.Neutral },
    { name: 'Negative', value: overallSentiment.Negative },
  ];

  const overallAvg = processedOverallQAvgs.reduce((acc, q) => acc + q.Score, 0) / (processedOverallQAvgs.length || 1);
  const totalGroups = groupDataArray.length;
  const photosList = data.filter(r => r.photo_url).map(r => ({ url: r.photo_url, group: r.group_name }));

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ background: 'linear-gradient(90deg, #1d1d1f, #86868b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            Academic Analytics Report
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Anonymous Aggregated Feedback • Rehabilitology & Sports Medicine</p>
        </div>
        <Button onClick={handleExportClick} isLoading={isExporting || isVerified && showModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}>
          {isVerified ? <ShieldCheck size={18} /> : <Download size={18} />} 
          {isVerified ? 'Download Secure Report' : 'Export PDF Report'}
        </Button>
      </div>

      <div ref={printRef} style={{ backgroundColor: 'var(--color-bg)', padding: '1rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Responses</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-primary)' }}>{totalResponses}</div>
          </GlassContainer>
          <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Groups Participated</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#007aff' }}>{totalGroups}</div>
          </GlassContainer>
          <GlassContainer style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Average (4)</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-success)' }}>{overallAvg ? overallAvg.toFixed(2) : 0}</div>
          </GlassContainer>
        </div>

        {/* Detailed Breakdown Table */}
        {groupDataArray.length > 0 && (
          <GlassContainer style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h3 className="mb-6">Academic Breakdown by Group</h3>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Group Number</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Participants</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#34c759' }}>Excellent</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#ffcc00' }}>Good</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#ff9500' }}>Satisfactory</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#ff3b30' }}>Poor</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {groupDataArray.map((g, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s', ':hover': { backgroundColor: 'var(--color-surface)' } }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>Group {g.name}</td>
                      <td style={{ padding: '1rem' }}>{g.total}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{g.ratings.Excellent}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{g.ratings.Good}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{g.ratings.Satisfactory}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{g.ratings.Poor}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: g.averageScore >= 3.5 ? '#34c759' : g.averageScore >= 2.5 ? '#ffcc00' : '#ff3b30' }}>
                        {g.averageScore ? g.averageScore.toFixed(2) : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassContainer>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <GlassContainer>
            <h3 className="mb-6">Average Score Comparison by Group</h3>
            <div style={{ height: '350px', width: '100%' }}>
              {groupDataArray.length === 0 ? <div className="text-muted">No data</div> :
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupDataArray} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                    <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fill: 'var(--color-text-muted)' }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                    <Bar dataKey="averageScore" fill="#007aff" radius={[4, 4, 0, 0]} name="Group Avg" />
                  </BarChart>
                </ResponsiveContainer>
              }
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
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
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
        </div>

        <GlassContainer style={{ marginBottom: '2rem' }}>
          <h3 className="mb-6">Global Average Score by Question</h3>
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedOverallQAvgs} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fill: 'var(--color-text-muted)' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

      {/* Security Authorization Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <GlassContainer style={{ width: '100%', maxWidth: '450px', padding: '2.5rem 2rem', position: 'relative' }}>
            
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >×</button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(0, 122, 255, 0.1)', borderRadius: '50%', color: '#007aff', marginBottom: '1rem' }}>
                <ShieldCheck size={32} />
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>Security Verification</h2>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Protecting academic integrity limits download access to authorized emails.</p>
            </div>

            {modalErr && <div style={{ color: '#ff3b30', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500, textAlign: 'center' }}>{modalErr}</div>}

            {step === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} /> Admin Email Address
                </label>
                <TextInput 
                  type="email" 
                  placeholder="admin@university.edu" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
                <Button onClick={handleSendCode} isLoading={isSending} style={{ marginTop: '1rem', width: '100%' }}>
                  Verify Email
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Key size={16} /> Enter Verification PIN
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '-0.5rem 0 0.5rem 0' }}>
                  A verification code has been sent to <strong>{email}</strong>. <br/>(Demo Mode: Type any 4 digits to proceed)
                </p>
                <TextInput 
                  type="text" 
                  placeholder="----" 
                  maxLength={4}
                  style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                />
                <Button onClick={handleVerifyOtp} style={{ marginTop: '1rem', width: '100%', backgroundColor: 'var(--color-success)', color: 'white' }}>
                  Confirm & Download
                </Button>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                    Change Email
                  </button>
                </div>
              </div>
            )}
          </GlassContainer>
        </div>
      )}
    </div>
  );
};
