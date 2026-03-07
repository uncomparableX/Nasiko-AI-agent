import React, { useState } from 'react';
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  Upload,
  Brain,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// --- Types ---
interface Candidate {
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  experience: any[];
  education: any[];
  summary?: string;
  score?: number;
  justification?: string;
  recommendation?: string;
  final_justification?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [jobDescription, setJobDescription] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [agentHealth, setAgentHealth] = useState<Record<string, boolean>>({});

  const NASIKO_GATEWAY = "http://localhost:9100/agents";

  // Check platform health periodically
  React.useEffect(() => {
    const agents = [
      'agent-resume-parser',
      'agent-candidate-scoring',
      'agent-shortlisting',
      'agent-interviewer-scheduler'
    ];

    const checkHealth = async () => {
      let allOk = true;
      const healthMap: Record<string, boolean> = {};

      for (const agent of agents) {
        try {
          await axios.get(`http://localhost:9100/agents/${agent}/health`, { timeout: 2000 });
          healthMap[agent] = true;
        } catch (e) {
          healthMap[agent] = false;
          allOk = false;
        }
      }

      setAgentHealth(healthMap);
      setServerStatus(allOk ? 'online' : Object.values(healthMap).some(v => v) ? 'checking' : 'offline');
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsParsing(true);

    const files = Array.from(e.target.files);
    const newCandidates: Candidate[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        // Calling Resume Parser Agent via Nasiko Gateway Proxy
        const response = await axios.post(`${NASIKO_GATEWAY}/agent-resume-parser/parse`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data && response.data.name) {
          newCandidates.push(response.data);
        } else {
          console.error("Invalid response format from agent:", response.data);
          alert(`Failed to parse ${file.name}: Invalid response format.`);
        }
      } catch (error: any) {
        console.error("Error parsing resume:", error);
        alert(`Error parsing ${file.name}: ${error.response?.data?.detail || error.message}`);
      }
    }

    setCandidates([...candidates, ...newCandidates]);
    setIsParsing(false);
    setActiveTab('candidates');
  };

  const scoreCandidates = async () => {
    if (!jobDescription) {
      alert("Please enter a Job Description first.");
      return;
    }
    setIsScoring(true);

    const updatedCandidates = [...candidates];
    for (let i = 0; i < updatedCandidates.length; i++) {
      try {
        const response = await axios.post(`${NASIKO_GATEWAY}/agent-candidate-scoring/score`, {
          candidate_data: updatedCandidates[i],
          job_description: jobDescription
        });
        updatedCandidates[i] = { ...updatedCandidates[i], ...response.data };
      } catch (error) {
        console.error("Error scoring candidate:", error);
      }
    }

    setCandidates(updatedCandidates);
    setIsScoring(false);
  };

  const shortlistCandidates = async () => {
    setIsShortlisting(true);
    try {
      const response = await axios.post(`${NASIKO_GATEWAY}/agent-shortlisting/shortlist`, {
        candidates: candidates.filter(c => c.score !== undefined).map(c => ({
          name: c.name,
          email: c.email,
          score: c.score,
          justification: c.justification
        })),
        job_description: jobDescription
      });

      const shortlist = response.data.shortlist;
      const updatedCandidates = candidates.map(c => {
        const match = shortlist.find((s: any) => s.email === c.email);
        if (match) {
          return { ...c, recommendation: match.recommendation, final_justification: match.final_justification };
        }
        return c;
      });

      setCandidates(updatedCandidates);
      setActiveTab('shortlist');
    } catch (error) {
      console.error("Error shortlisting:", error);
    }
    setIsShortlisting(false);
  };

  const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  const scheduleInterview = async (candidate: Candidate) => {
    setIsScheduling(true);
    try {
      const response = await axios.post(`${NASIKO_GATEWAY}/agent-interviewer-scheduler/schedule`, {
        candidate_name: candidate.name,
        interviewer_name: "Lead Recruiter",
        interviewer_availability: ["2026-03-10 10:00-11:00", "2026-03-11 14:00-15:00"]
      });
      setScheduledInterviews([...scheduledInterviews, { ...response.data, candidate_name: candidate.name }]);
      alert(`Interview proposed for ${candidate.name} at ${response.data.proposed_slots[0].start_time}`);
    } catch (error) {
      console.error("Error scheduling interview:", error);
    }
    setIsScheduling(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Brain size={32} color="var(--primary)" />
          <h2 className="gradient-text">Nasiko Recruit</h2>
        </div>

        <div style={{
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: serverStatus === 'online' ? 'var(--success)' : serverStatus === 'offline' ? 'var(--error)' : 'var(--warning)',
              boxShadow: serverStatus === 'online' ? '0 0 8px var(--success)' : 'none'
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>System Status</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {['Resume Parser', 'Candidate Scorer', 'Shortlisting', 'Scheduler'].map((label, idx) => {
              const agentId = ['agent-resume-parser', 'agent-candidate-scoring', 'agent-shortlisting', 'agent-interviewer-scheduler'][idx];
              const isOk = agentHealth[agentId];
              return (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: isOk ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  <span>{label}</span>
                  <span style={{ color: isOk === undefined ? '...' : isOk ? 'Online' : 'Offline' }}>
                    {isOk === undefined ? '...' : isOk ? 'Online' : 'Offline'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SidebarItem
            icon={<Upload size={20} />}
            label="Upload Resumes"
            active={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
          />
          <SidebarItem
            icon={<Users size={20} />}
            label="Candidates"
            active={activeTab === 'candidates'}
            onClick={() => setActiveTab('candidates')}
          />
          <SidebarItem
            icon={<CheckSquare size={20} />}
            label="Shortlist"
            active={activeTab === 'shortlist'}
            onClick={() => setActiveTab('shortlist')}
          />
          <SidebarItem
            icon={<Calendar size={20} />}
            label="Schedule"
            active={activeTab === 'schedule'}
            onClick={() => setActiveTab('schedule')}
          />
        </nav>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Start Recruitment</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Upload candidate resumes and provide a job description to begin.</p>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} color="var(--primary)" />
                    Job Description
                  </h3>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    style={{
                      width: '100%',
                      height: '300px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      padding: '1rem',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                </div>

                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
                  <Upload size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ marginBottom: '0.5rem' }}>Upload PDF Resumes</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>Select multiple files to batch process</p>
                  <label className="btn-primary">
                    {isParsing ? 'Processing...' : 'Browse Files'}
                    <input type="file" multiple accept=".pdf" hidden onChange={handleFileUpload} disabled={isParsing} />
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'candidates' && (
            <motion.div
              key="candidates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem' }}>Candidate Evaluation</h1>
                <button
                  className="btn-primary"
                  onClick={scoreCandidates}
                  disabled={isScoring || candidates.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isScoring ? 'Scoring...' : <><Brain size={18} /> Score All Candidates</>}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {candidates.map((candidate, idx) => (
                  <div key={idx} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ marginBottom: '0.25rem' }}>{candidate.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{candidate.email}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {candidate.skills.slice(0, 4).map(skill => (
                          <span key={skill} style={{ background: 'var(--glass-bg)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {candidate.score !== undefined ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: candidate.score > 70 ? 'var(--success)' : 'var(--warning)' }}>
                              {candidate.score}%
                            </div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Match</div>
                          </div>
                          <ChevronRight size={20} color="var(--text-secondary)" />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not scored yet</span>
                      )}
                    </div>
                  </div>
                ))}

                {candidates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    No candidates uploaded yet. Go to the Upload tab.
                  </div>
                )}
              </div>

              {candidates.some(c => c.score !== undefined) && (
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={shortlistCandidates} disabled={isShortlisting}>
                    {isShortlisting ? 'Shortlisting...' : 'Review & Shortlist'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'shortlist' && (
            <motion.div
              key="shortlist"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Final Shortlist</h1>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {candidates.filter(c => c.recommendation).map((candidate, idx) => (
                  <div key={idx} className="glass-card" style={{ borderTop: `4px solid ${candidate.recommendation === 'Recommended' ? 'var(--success)' : candidate.recommendation === 'Maybe' ? 'var(--warning)' : 'var(--error)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.25rem' }}>{candidate.name}</h3>
                      <div style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: candidate.recommendation === 'Recommended' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: candidate.recommendation === 'Recommended' ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {candidate.recommendation}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                      {candidate.final_justification}
                    </p>
                    {candidate.recommendation === 'Recommended' && (
                      <button
                        className="btn-primary"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        onClick={() => setActiveTab('schedule')}
                      >
                        Schedule Interview
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Interview Scheduler</h1>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-card">
                  <Clock size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                  <h3>Schedule New Interview</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>
                    Select a recommended candidate to coordinate slots.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {candidates.filter(c => c.recommendation === 'Recommended').map(c => (
                      <button
                        key={c.email}
                        className="btn-secondary"
                        onClick={() => scheduleInterview(c)}
                        disabled={isScheduling}
                        style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span>Schedule with <strong>{c.name}</strong></span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card">
                  <Calendar size={32} color="var(--success)" style={{ marginBottom: '1rem' }} />
                  <h3>Scheduled Interviews</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                    {scheduledInterviews.map((item, idx) => (
                      <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong>{item.candidate_name}</strong>
                          <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>Proposed</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.proposed_slots[0].start_time}</p>
                      </div>
                    ))}
                    {scheduledInterviews.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No interviews scheduled yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Helper Components ---
const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.85rem 1rem',
      borderRadius: '0.75rem',
      border: 'none',
      background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      width: '100%',
      fontWeight: active ? '600' : '400',
      textAlign: 'left'
    }}
  >
    {icon}
    {label}
  </button>
);

export default App;
