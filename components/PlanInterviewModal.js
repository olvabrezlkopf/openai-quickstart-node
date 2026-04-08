import { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import styles from './PlanInterviewModal.module.css';

export default function PlanInterviewModal({ isOpen, onClose, onPlanGenerated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('interview'); // 'interview' | 'generating' | 'done'
  const [questionInfo, setQuestionInfo] = useState({ current: 0, max: 10 });
  const scrollRef = useRef(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput('');
      setError(null);
      setPhase('interview');
      setQuestionInfo({ current: 0, max: 10 });
      // Fetch the first question automatically
      fetchNextQuestion([]);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function fetchNextQuestion(history) {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/plan-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'interview', messages: history }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'API-Fehler');
      setMessages([...history, { role: 'assistant', content: data.question }]);
      setQuestionInfo({ current: data.questionNumber, max: data.maxQuestions });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');

    // Check if this was the last answer
    const userAnswers = updated.filter((m) => m.role === 'user').length;
    if (userAnswers >= questionInfo.max) {
      // Don't fetch another question — let user click "Plan erstellen"
      setPhase('done');
      return;
    }
    await fetchNextQuestion(updated);
  }

  async function handleGeneratePlan() {
    setLoading(true);
    setError(null);
    setPhase('generating');
    try {
      const resp = await fetch('/api/plan-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', messages }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Plan-Generierung fehlgeschlagen');
      onPlanGenerated(data.plan);
      onClose();
    } catch (e) {
      setError(e.message);
      setPhase('done'); // Allow retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plan mit KI erstellen">
      <div className={styles.wrapper}>
        <div className={styles.progress}>
          Frage {Math.min(questionInfo.current, questionInfo.max)} von {questionInfo.max}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(Math.min(questionInfo.current, questionInfo.max) / questionInfo.max) * 100}%` }}
            />
          </div>
        </div>

        <div className={styles.chat} ref={scrollRef}>
          {messages.length === 0 && loading && (
            <div className={styles.systemMsg}>Starte Interview...</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}>
              {msg.content}
            </div>
          ))}
          {loading && messages.length > 0 && (
            <div className={styles.assistantMsg}>
              <span className={styles.typing}>
                <span></span><span></span><span></span>
              </span>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>Fehler: {error}</div>}

        {phase === 'interview' && (
          <form onSubmit={handleSend} className={styles.form}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Deine Antwort..."
              className={styles.textarea}
              rows={2}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={loading || !input.trim()}
            >
              Senden
            </button>
          </form>
        )}

        {phase === 'done' && (
          <div className={styles.doneActions}>
            <p className={styles.doneText}>
              Alle Fragen beantwortet. Bereit für deinen personalisierten Plan?
            </p>
            <button
              onClick={handleGeneratePlan}
              className={styles.generateBtn}
              disabled={loading}
            >
              {loading ? 'Plan wird erstellt...' : 'Plan jetzt erstellen'}
            </button>
          </div>
        )}

        {phase === 'generating' && (
          <div className={styles.generating}>
            <span className={styles.typing}>
              <span></span><span></span><span></span>
            </span>
            <p>Plan wird generiert...</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
