import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ADD_PLAN } from '../../context/actions';
import { generateId } from '../../lib/ids';
import { CATEGORIES } from '../../lib/constants';
import Modal from '../../components/Modal';
import styles from './index.module.css';

export default function PlanList() {
  const { state, dispatch, isHydrated } = useData();
  const [showModal, setShowModal] = useState(false);
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

  const itemCountFor = (planId) =>
    Object.values(state.items).filter((i) => i.planId === planId).length;

  return (
    <div>
      <Head><title>Pläne — Mutig</title></Head>
      <div className={styles.header}>
        <h1 className={styles.title}>Angstleitern</h1>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          + Neuer Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Noch keine Pläne erstellt.</p>
          <p className={styles.emptyHint}>Erstelle deinen ersten Expositionsplan, um loszulegen.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {plans.map((plan) => (
            <Link key={plan.id} href={`/plan/${plan.id}`} className={styles.card}>
              <span className={styles.cardCategory}>{plan.category}</span>
              <h2 className={styles.cardName}>{plan.name}</h2>
              {plan.goal && <p className={styles.cardGoal}>{plan.goal}</p>}
              <span className={styles.cardMeta}>
                {itemCountFor(plan.id)} Schritte
              </span>
            </Link>
          ))}
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
    </div>
  );
}
