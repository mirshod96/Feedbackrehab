import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { GlassContainer } from '../components/ui/GlassContainer';
import { Button } from '../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    let interval;
    if (lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
    }
    if (lockoutTime === 0 && failedAttempts >= 3) {
      setFailedAttempts(0);
      setPinError('');
    }
    return () => clearInterval(interval);
  }, [lockoutTime, failedAttempts]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: responses, error } = await supabase
        .from('responses')
        .select('answers, photo_url, group_name, full_name');

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

  // Filter out system metrics
  const actualData = data.filter(r => r.group_name !== 'SYSTEM_PDF_DOWNLOAD');
  const downloadsCount = data.filter(r => r.group_name === 'SYSTEM_PDF_DOWNLOAD').length;
  const totalResponses = actualData.length;

  // Initialize accumulators
  let questionAverages = QUESTIONS.map((q) => ({ name: q, totalScore: 0, count: 0 }));
  let sentimentCount = { Positive: 0, Neutral: 0, Negative: 0 };

  actualData.forEach(response => {
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
  
  const photosList = actualData.filter(r => r.photo_url).map(r => ({ url: r.photo_url, group: r.group_name || 'Unknown' }));

  const submitPinAndExport = async () => {
    if (lockoutTime > 0) return;

    if (btoa(pinInput) !== 'MjAwMg==') {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setLockoutTime(60);
        setPinError(`Too many attempts! Locked for 60 seconds.`);
      } else {
        setPinError(`Incorrect PIN. Access Denied. (${3 - newAttempts} attempts left)`);
      }
      return;
    }
    
    setPinError('');
    setFailedAttempts(0);
    setIsExporting(true);

    try {
      // Record download metric
      await supabase.from('responses').insert([{
        full_name: 'System',
        group_name: 'SYSTEM_PDF_DOWNLOAD',
        course_name: 'System',
        last_class_date: new Date().toISOString(),
        answers: { "0": "System" }
      }]);
      
      // Update local state metric instantly
      setData(prev => [...prev, { group_name: 'SYSTEM_PDF_DOWNLOAD' }]);

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      const groupsMap = {};
      const individualArr = [];
      actualData.forEach(response => {
        const gName = response.group_name || 'Unknown';
        if (!groupsMap[gName]) {
          groupsMap[gName] = { name: gName, responsesCount: 0, totalScore: 0, questionsCount: 0, pos: 0, neu: 0, neg: 0 };
        }
        
        groupsMap[gName].responsesCount += 1;
        
        // Tracking individual metrics
        let iTotalScore = 0;
        let iQuestions = 0;
        let iPos = 0;
        let iNeu = 0;
        let iNeg = 0;
        
        let answersObj = response.answers;
        if (typeof answersObj === 'string') {
          try { answersObj = JSON.parse(answersObj); } catch(e) {}
        }
        
        if (answersObj && typeof answersObj === 'object') {
          Object.values(answersObj).forEach(ans => {
            const score = SCORE_MAP[ans];
            if (score) {
              groupsMap[gName].totalScore += score;
              groupsMap[gName].questionsCount += 1;
              iTotalScore += score;
              iQuestions += 1;
            }
            if (ans === 'Excellent' || ans === 'Good') { groupsMap[gName].pos += 1; iPos += 1; }
            else if (ans === 'Satisfactory') { groupsMap[gName].neu += 1; iNeu += 1; }
            else if (ans === 'Poor') { groupsMap[gName].neg += 1; iNeg += 1; }
          });
        }

        let primarySentiment = 'Neutral';
        if (iPos > iNeg && iPos > iNeu) primarySentiment = 'Positive';
        else if (iNeg > iPos && iNeg > iNeu) primarySentiment = 'Negative';

        individualArr.push([
          response.full_name || 'Anonymous',
          gName,
          iQuestions > 0 ? (iTotalScore / iQuestions).toFixed(2) : '0.00',
          primarySentiment
        ]);
      });

      const groupsArr = Object.values(groupsMap).map(g => ({
        ...g,
        avgScore: g.questionsCount > 0 ? (g.totalScore / g.questionsCount).toFixed(2) : '0.00'
      })).sort((a, b) => b.responsesCount - a.responsesCount);

      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      doc.text("Feedback Analytics Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
          ['Total Participants', totalResponses.toString()],
          ['Total Unique Groups', groupsArr.length.toString()],
          ['Overall Average Score', (totalResponses === 0 ? "0.00" : overallAvg.toFixed(2)) + ' / 4.00']
        ],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Academic Group', 'Participants', 'Avg Score (Out of 4)', 'Positive', 'Neutral', 'Negative']],
        body: groupsArr.map(g => [
          g.name,
          g.responsesCount.toString(),
          g.avgScore,
          g.pos.toString(),
          g.neu.toString(),
          g.neg.toString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 122, 255] }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Full Name', 'Group', 'Avg Score', 'Overall Sentiment']],
        body: individualArr,
        theme: 'striped',
        headStyles: { fillColor: [80, 80, 100] }
      });

      doc.save(`analytics_report_${new Date().getTime()}.pdf`);
      setShowPinModal(false);
      setPinInput('');
      setFailedAttempts(0);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ background: 'linear-gradient(90deg, #1d1d1f, #86868b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            Public Analytics Dashboard
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Anonymous Aggregated Feedback • Rehabilitology & Sports Medicine</p>
        </div>
        <Button onClick={() => setShowPinModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}>
          <Download size={18} /> Download Excel/PDF Report
        </Button>
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
        <GlassContainer style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid rgba(0, 122, 255, 0.3)' }}>
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#007aff' }}>PDF Downloads</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: '#007aff' }}>{downloadsCount}</div>
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

        {photosList.length > 0 && (
          <GlassContainer>
            <h3 className="mb-6">Class Photo Album</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
              {photosList.map((photo, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', cursor: 'zoom-in', transition: 'transform 0.2s ease' }} onClick={() => setSelectedPhoto(photo.url)} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
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

      {/* Fullscreen Lightbox Modal */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', cursor: 'zoom-out' }}
        >
          <img 
            src={selectedPhoto} 
            alt="Full screen view" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            onClick={() => setSelectedPhoto(null)}
            style={{ position: 'absolute', top: '1.5rem', right: '2rem', background: 'none', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer', padding: '1rem' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* PIN Lock Modal */}
      {showPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <GlassContainer style={{ width: '100%', maxWidth: '350px', position: 'relative', textAlign: 'center', padding: '2.5rem 2rem' }}>
            <button 
              onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >×</button>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Secure Download</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>Please enter the master PIN code to generate the report</p>
            
            <input 
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="----"
              maxLength={4}
              disabled={lockoutTime > 0 || isExporting}
              style={{ width: '100%', padding: '1rem', textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5rem', borderRadius: 'var(--radius-md)', border: `2px solid ${pinError ? 'var(--color-danger)' : 'var(--color-border)'}`, backgroundColor: lockoutTime > 0 ? 'rgba(255,59,48,0.1)' : 'var(--color-bg)', color: 'var(--color-text)', marginBottom: '0.5rem', outline: 'none', transition: 'all 0.3s' }}
              onKeyDown={(e) => e.key === 'Enter' && submitPinAndExport()}
            />
            
            <div style={{ height: '20px', marginBottom: '1.5rem', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
              {lockoutTime > 0 ? `Locked Out. Try again in ${lockoutTime}s.` : pinError}
            </div>
            
            <Button onClick={submitPinAndExport} isLoading={isExporting} disabled={lockoutTime > 0} style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>
              Unlock & Download
            </Button>
          </GlassContainer>
        </div>
      )}
    </div>
  );
};
