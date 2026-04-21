import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ADD_PLAN, IMPORT_PLAN } from '../../context/actions';
import { generateId } from '../../lib/ids';
import { CATEGORIES } from '../../lib/constants';
import { autoScheduleItems } from '../../lib/scheduling';
import Modal from '../../components/Modal';
import PlanInterviewModal from '../../components/PlanInterviewModal';
import { Sparkle, Plus } from '@phosphor-icons/react';
import styles from './index.module.css';

export default function PlanList() {
  const router = useRouter();
  const { state, dispatch, isHydrated } = useData();
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  if (!isHydrated) return null;

  const plans = Object.values(state.plans).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({
      type: ADD_PLAN,
      payload: {
        id: generateId(),
        name: name.trim(),
        goal: goal.trim(),
        category,
        created_at: new Date().toISOString(),
      },
    });
    setName('');
    setGoal('');
    setCategory(CATEGORIES[0]);
    setShowModal(false);
  }

  function handleAIPlan(aiPlan) {
    // Transform AI response into normalized state shape
    const planId = generateId();
    const newPlan = {
      id: planId,
      name: aiPlan.plan?.name || 'KI-generierter Plan',
      goal: aiPlan.plan?.goal || '',
      category: aiPlan.plan?.category || 'Andere',
      created_at: new Date().toISOString(),
    };

    const phases = {};
    const items = {};

    (aiPlan.phases || []).forEach((phase, phaseIdx) => {
      const phaseId = generateId();
      phases[phaseId] = {
        id: phaseId,
        planId,
        name: phase.name || `Phase ${phaseIdx + 1}`,
        order: phase.order ?? phaseIdx,
      };
      (phase.items || []).forEach((item) => {
        const itemId = generateId();
        items[itemId] = {
          id: itemId,
          planId,
          phaseId,
          title: item.title || '',
          description: item.description || '',
          suds_estimate: Number(item.suds_estimate) || 5,
          difficulty: 3,
          category: newPlan.category,
          week: Number(item.week) || 1,
          unit: Number(item.unit) || 1,
          ort: item.ort || '',
          dauer: item.dauer || '',
          begleitung: item.begleitung || '',
          fokus_beiMir: item.fokus_beiMir || '',
          fokus_freude: item.fokus_freude || '',
          anspruch: item.anspruch || '',
          atemuebung: !!item.atemuebung,
          notiz: item.notiz || '',
        };
      });
    });

    // Auto-distribute items across upcoming weeks so the user lands
    // in a pre-populated calendar instead of an empty one.
    const scheduled = autoScheduleItems(items);

    dispatch({ type: IMPORT_PLAN, payload: { plan: newPlan, phases, items, scheduled } });
    router.push(`/plan/${planId}`);
  }

  const itemCountFor = (planId) =>
    Object.values(state.items).filter((i) => i.planId === planId).length;

  const phaseCountFor = (planId) =>
    Object.values(state.phases).filter((p) => p.planId === planId).length;

  return (
    <div>
      <Head><title>Pläne — Mutig</title></Head>

      <div className={styles.hero}>
        <img
          className={styles.heroImg}
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80&auto=format&fit=crop"
          alt=""
          loading="lazy"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>Trainingspläne</span>
          <h1 className={styles.heroTitle}>Schritt für Schritt. Auf deinen eigenen Berg.</h1>
          <p className={styles.heroSub}>
            Lass dir von der KI einen persönlichen Plan zusammenstellen — oder beginne mit einem leeren Grundgerüst.
          </p>
        </div>
      </div>

      <div className={styles.header}>
        <h2 className={styles.title}>Deine Pläne</h2>
        <div className={styles.headerActions}>
          <button className={styles.aiBtn} onClick={() => setShowAIModal(true)}>
            <Sparkle size={18} weight="fill" />
            <span>Mit KI erstellen</span>
          </button>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>
            <Plus size={18} weight="bold" />
            <span>Leerer Plan</span>
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Noch keine Pläne erstellt.</p>
          <p className={styles.emptyHint}>
            Lass dir von der KI einen persönlichen Plan erstellen — oder starte mit einem leeren Plan.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {plans.map((plan, idx) => {
            const phases = phaseCountFor(plan.id);
            return (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}`}
                className={styles.card}
                style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
              >
                <span className={styles.cardCategory}>{plan.category}</span>
                <h2 className={styles.cardName}>{plan.name}</h2>
                {plan.goal && <p className={styles.cardGoal}>{plan.goal}</p>}
                <span className={styles.cardMeta}>
                  {phases > 0 && `${phases} Phasen · `}{itemCountFor(plan.id)} Schritte
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Neuen Plan erstellen">
        <form onSubmit={handleCreate} className={styles.form}>
          <label className={styles.formLabel}>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Kurzreisen"
              className={styles.formInput}
              autoFocus
            />
          </label>
          <label className={styles.formLabel}>
            Ziel
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Was möchtest du erreichen?"
              className={styles.formTextarea}
              rows={3}
            />
          </label>
          <label className={styles.formLabel}>
            Kategorie
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.formSelect}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" className={styles.submitBtn}>Plan erstellen</button>
        </form>
      </Modal>

      <PlanInterviewModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onPlanGenerated={handleAIPlan}
      />
    </div>
  );
}
