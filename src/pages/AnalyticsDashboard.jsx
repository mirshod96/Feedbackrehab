import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { GlassContainer } from '../components/ui/GlassContainer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Download, ShieldCheck, Mail, Key } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  
  // Real Verification State
  const [isExporting, setIsExporting] = useState(false);
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
      generateAcademicPDF(data);
    } else {
      setShowModal(true);
    }
  };

  // Real Supabase OTP - Send Code
  const handleSendCode = async () => {
    if (!email.includes('@')) {
      setModalErr('Please enter a valid email address.');
      return;
    }
    setModalErr('');
    setIsSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
    });

    if (error) {
      setModalErr('Failed to send code: ' + error.message);
      setIsSending(false);
      return;
    }

    setIsSending(false);
    setStep(2);
  };

  // Real Supabase OTP - Verify Code
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setModalErr('Please enter the verification code.');
      return;
    }
    setModalErr('');
    setIsSending(true);

    const { data: sessionData, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    });

    if (error || !sessionData.session) {
      setIsSending(false);
      setModalErr('Invalid or expired code.');
      return;
    }

    // Success
    setIsSending(false);
    setShowModal(false);
    setIsVerified(true);
    generateAcademicPDF(data);
  };

  // Programmatic PDF Generation
  const generateAcademicPDF = (reportData) => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFontSize(20);
      doc.setTextColor(30, 30, 30);
      doc.text("Academic Analytics Report", 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Rehabilitology & Sports Medicine", 14, 30);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

      // Data Processing for PDF
      const groupMap = {};
      reportData.forEach(r => {
        const gn = r.group_name && r.group_name.trim() !== '' ? r.group_name.trim() : 'Unknown';
        if (!groupMap[gn]) {
          groupMap[gn] = {
            name: gn,
            total: 0,
            ratings: { Excellent: 0, Good: 0, Satisfactory: 0, Poor: 0 },
            qAvgs: QUESTIONS.map(q => ({ scoreSum: 0, count: 0 }))
          };
        }
        
        groupMap[gn].total += 1;
        const answers = r.answers;
        if (answers) {
          Object.values(answers).forEach((ans, i) => {
            const score = SCORE_MAP[ans];
            if (ans && groupMap[gn].ratings[ans] !== undefined) {
              groupMap[gn].ratings[ans]++;
            }
            if (score && groupMap[gn].qAvgs[i]) {
              groupMap[gn].qAvgs[i].scoreSum += score;
              groupMap[gn].qAvgs[i].count += 1;
            }
          });
        }
      });

      const groupDataArray = Object.values(groupMap).map(g => ({
        name: g.name,
        total: g.total,
        ratings: g.ratings,
        averageScore: g.qAvgs.reduce((acc, q) => acc + (q.count > 0 ? q.scoreSum / q.count : 0), 0) / (g.qAvgs.length || 1)
      })).sort((a,b) => b.total - a.total);

      // Summary Metrics
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Executive Summary", 14, 50);
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(`Total Student Responses: ${reportData.length}`, 14, 58);
      doc.text(`Total Participating Groups: ${groupDataArray.length}`, 14, 64);

      // Table Generation
      const tableData = groupDataArray.map(g => [
        `Group ${g.name}`,
        g.total.toString(),
        g.ratings.Excellent.toString(),
        g.ratings.Good.toString(),
        g.ratings.Satisfactory.toString(),
        g.ratings.Poor.toString(),
        g.averageScore ? g.averageScore.toFixed(2) : "0.00"
      ]);

      autoTable(doc, {
        startY: 72,
        head: [['Group Name', 'Participants', 'Excellent (4)', 'Good (3)', 'Satisfactory (2)', 'Poor (1)', 'Avg Score']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [249, 249, 249] }
      });

      doc.save('Professional_Academic_Report.pdf');
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Original UI Data Processing
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 className="btn-spinner" size={32} /></div>;
  if (error) return <div className="app-container"><GlassContainer><div className="error-message">Error loading analytics: {error}</div></GlassContainer></div>;

  const totalResponses = data.length;
  let questionAverages = QUESTIONS.map((q) => ({ name: q, avg: 0, total: 0 }));
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
        <Button onClick={handleExportClick} isLoading={isExporting || isVerified && showModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}>
          {isVerified ? <ShieldCheck size={18} /> : <Download size={18} />} 
          {isVerified ? 'Download Professional Report' : 'Export PDF Report'}
        </Button>
      </div>

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
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
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
              <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Protecting academic integrity. Download is locked by secure email verification.</p>
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
                  Send Verification Code
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Key size={16} /> Enter Verification Code
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '-0.5rem 0 0.5rem 0' }}>
                  A secure verification code has been sent to <strong>{email}</strong>. Please check your inbox.
                </p>
                <TextInput 
                  type="text" 
                  placeholder="--------" 
                  maxLength={8}
                  style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                />
                <Button onClick={handleVerifyOtp} isLoading={isSending} style={{ marginTop: '1rem', width: '100%', backgroundColor: 'var(--color-success)', color: 'white' }}>
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
