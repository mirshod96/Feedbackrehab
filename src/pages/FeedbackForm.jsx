import React, { useState } from 'react';
import { GlassContainer } from '../components/ui/GlassContainer';
import { Button } from '../components/ui/Button';
import { TextInput, DatePicker } from '../components/ui/TextInput';
import { RadioGroup } from '../components/ui/RadioGroup';
import { Checkbox } from '../components/ui/Checkbox';
import { supabase } from '../supabaseClient';
import { CheckCircle } from 'lucide-react';

const QUESTIONS = [
  "Teacher's (Shodiyev Mirshodbek Marufovich) mastery and depth of knowledge in Rehabilitology & Sports Medicine?",
  "Ability to explain complex medical concepts clearly?",
  "Effectiveness in demonstrating practical clinical skills?",
  "Teacher's (Shodiyev Mirshodbek Marufovich) ability to connect theory to real-world medical practice?",
  "Quality and depth of answers provided to student questions?",
  "Teacher's (Shodiyev Mirshodbek Marufovich) ability to stimulate critical thinking and clinical reasoning?",
  "Level of organization and structure during practical sessions?",
  "Punctuality and efficient use of class time?",
  "Teacher's (Shodiyev Mirshodbek Marufovich) approachability and willingness to assist students?",
  "Fairness and objectivity in evaluating student performance?",
  "Integration of modern, evidence-based medical literature into teaching?",
  "Teacher's (Shodiyev Mirshodbek Marufovich) professionalism, adherence to medical ethics, and general conduct?",
  "Ability to maintain student engagement and focus throughout the session?",
  "Clarity of expectations and learning objectives set by Teacher (Shodiyev Mirshodbek Marufovich)?",
  "Overall impact of Teacher (Shodiyev Mirshodbek Marufovich) on your professional and clinical development?"
];

const OPTIONS = [
  { label: "Excellent", value: "Excellent" },
  { label: "Good", value: "Good" },
  { label: "Satisfactory", value: "Satisfactory" },
  { label: "Poor", value: "Poor" }
];

export const FeedbackForm = () => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    group_name: "",
    course_name: "Rehabilitology & Sports Medicine",
    last_class_date: "",
    answers: {},
    photo: null
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAnswerChange = (qIndex, value) => {
    setFormData(prev => ({
      ...prev,
      answers: { ...prev.answers, [qIndex]: value }
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, photo: e.target.files[0] }));
    }
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) return "Full Name is required.";
    if (!formData.group_name.trim()) return "Group is required.";
    if (!formData.last_class_date) return "Date of Last Class is required.";
    
    for (let i = 0; i < QUESTIONS.length; i++) {
      if (!formData.answers[i]) {
        return `Please answer question ${i + 1}.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Log consent
      const { error: consentError } = await supabase
        .from('consent_logs')
        .insert([
          { full_name: formData.full_name, consent_given: true }
        ]);

      if (consentError) throw new Error("Failed to record consent: " + consentError.message);

      // 2. Upload photo if exists
      let photo_url = null;
      if (formData.photo) {
        const fileExt = formData.photo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('feedback_photos')
          .upload(filePath, formData.photo);

        if (uploadError) throw new Error("Failed to upload photo: " + uploadError.message);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('feedback_photos')
          .getPublicUrl(filePath);
          
        photo_url = publicUrl;
      }

      // 3. Save response
      const { error: responseError } = await supabase
        .from('responses')
        .insert([{
          full_name: formData.full_name,
          group_name: formData.group_name,
          course_name: formData.course_name,
          last_class_date: formData.last_class_date,
          answers: formData.answers,
          photo_url: photo_url
        }]);

      if (responseError) throw new Error("Failed to submit feedback: " + responseError.message);

      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <GlassContainer className="text-center" style={{ maxWidth: '500px', width: '100%' }}>
          <CheckCircle size={64} color="var(--color-success)" style={{ margin: '0 auto 1.5rem' }} />
          <h2>Feedback Submitted</h2>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>
            Thank you. Your feedback has been recorded securely.
          </p>
          <Button onClick={() => window.location.reload()} variant="primary" className="btn-full">
            Submit Another
          </Button>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ background: 'linear-gradient(90deg, var(--color-primary), #6e00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Course Feedback
        </h1>
        <p className="text-muted">Rehabilitology & Sports Medicine • 6th Year Medical Students</p>
      </div>

      <GlassContainer className="mb-6">
        <h3 className="mb-4">Access Control</h3>
        <Checkbox 
          id="consent"
          label={<><strong>I confirm</strong> that I am personally completing this feedback form and I consent to the processing of my personal data.</>}
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
        />
      </GlassContainer>

      <form onSubmit={handleSubmit} style={{ opacity: consentGiven ? 1 : 0.5, transition: 'all 0.3s' }}>
        <fieldset disabled={!consentGiven} style={{ border: 'none', padding: 0, margin: 0 }}>
          <GlassContainer className="mb-6">
          <h3 className="mb-4">Student Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <TextInput 
              id="full_name" 
              label="Full Name *" 
              placeholder="e.g. John Doe"
              value={formData.full_name}
              onChange={handleInputChange}
            />
            <TextInput 
              id="group_name" 
              label="Group *" 
              placeholder="e.g. 601A"
              value={formData.group_name}
              onChange={handleInputChange}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <TextInput 
              id="course_name" 
              label="Course Name" 
              value={formData.course_name}
              disabled
            />
            <DatePicker 
              id="last_class_date" 
              label="Date of Last Class *" 
              value={formData.last_class_date}
              onChange={handleInputChange}
            />
          </div>
        </GlassContainer>

        <GlassContainer className="mb-6">
          <h3 className="mb-4">Survey Questions</h3>
          {QUESTIONS.map((q, index) => (
            <RadioGroup 
              key={index}
              label={`${index + 1}. ${q}`}
              name={`question_${index}`}
              options={OPTIONS}
              value={formData.answers[index]}
              onChange={(val) => handleAnswerChange(index, val)}
            />
          ))}
        </GlassContainer>

        <GlassContainer className="mb-6">
          <h3 className="mb-4">Optional Photo Upload</h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Upload a photo from class (optional). Images only.</p>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            style={{ 
              padding: '1rem', 
              border: '2px dashed var(--color-border)', 
              borderRadius: 'var(--radius-md)', 
              width: '100%',
              background: 'rgba(255,255,255,0.5)'
            }} 
          />
        </GlassContainer>

        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--color-error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--color-error)' }}>
            <strong>Error: </strong> {errorMsg}
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="btn-full" style={{ padding: '1rem', fontSize: '1.1rem' }}>
          Submit Feedback
        </Button>
        </fieldset>
      </form>
    </div>
  );
};
