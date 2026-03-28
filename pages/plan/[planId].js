import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ADD_ITEM, UPDATE_ITEM, DELETE_ITEM, DELETE_PLAN } from '../../context/actions';
import { generateId } from '../../lib/ids';
import { CATEGORIES } from '../../lib/constants';
import Modal from '../../components/Modal';
import SudsSlider from '../../components/SudsSlider';
import DifficultyStars from '../../components/DifficultyStars';
import ExposureItemCard from '../../components/ExposureItemCard';
import styles from './planDetail.module.css';

export default function PlanDetail() {
  const router = useRouter();
  const { planId } = router.query;
  const { state, dispatch, isHydrated } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sudsEstimate, setSudsEstimate] = useState(5);
  const [difficulty, setDifficulty] = useState(3);
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0]);

  if (!isHydrated || !router.isReady) return null;

  const plan = state.plans[planId];
  if (!plan) {
    return (
      <div className={styles.notFound}>
        <p>Plan nicht gefunden.</p>
        <button onClick={() => router.push('/plan')} className={styles.backBtn}>Zurück</button>
      </div>
    );
  }

  const items = Object.values(state.items)
    .filter((i) => i.planId === planId)
    .sort((a, b) => a.suds_estimate - b.suds_estimate);

  function openAdd() {
    setEditItem(null);
    setTitle('');
    setDescription('');
    setSudsEstimate(5);
    setDifficulty(3);
    setItemCategory(plan.category || CATEGORIES[0]);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setSudsEstimate(item.suds_estimate);
    setDifficulty(item.difficulty);
    setItemCategory(item.category || CATEGORIES[0]);
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    if (editItem) {
      dispatch({
        type: UPDATE_ITEM,
        payload: {
          id: editItem.id,
          title: title.trim(),
          description: description.trim(),
          suds_estimate: sudsEstimate,
          difficulty,
          category: itemCategory,
        },
      });
    } else {
      dispatch({
        type: ADD_ITEM,
        payload: {
          id: generateId(),
          planId,
          title: title.trim(),
          description: description.trim(),
          suds_estimate: sudsEstimate,
          difficulty,
          category: itemCategory,
        },
      });
    }
    setShowModal(false);
  }

  function handleDeleteItem(item) {
    if (confirm(`"${item.title}" wirklich löschen?`)) {
      dispatch({ type: DELETE_ITEM, payload: item.id });
    }
  }

  function handleDeletePlan() {
    if (confirm(`Plan "${plan.name}" und alle Schritte löschen?`)) {
      items.forEach((item) => dispatch({ type: DELETE_ITEM, payload: item.id }));
      dispatch({ type: DELETE_PLAN, payload: plan.id });
      router.push('/plan');
    }
  }

  function handleSchedule(item) {
    router.push(`/calendar?itemId=${item.id}`);
  }

  return (
    <div>
      <Head><title>{plan.name} — Mutig</title></Head>

      <button className={styles.backLink} onClick={() => router.push('/plan')}>← Alle Pläne</button>

      <div className={styles.planHeader}>
        <div>
          <span className={styles.category}>{plan.category}</span>
          <h1 className={styles.planName}>{plan.name}</h1>
          {plan.goal && <p className={styles.planGoal}>{plan.goal}</p>}
        </div>
        <button className={styles.deleteBtn} onClick={handleDeletePlan}>Löschen</button>
      </div>

      <div className={styles.itemsHeader}>
        <h2 className={styles.itemsTitle}>Angstleiter ({items.length} Schritte)</h2>
        <button className={styles.addBtn} onClick={openAdd}>+ Schritt hinzufügen</button>
      </div>

      {items.length === 0 ? (
        <p className={styles.emptyText}>Noch keine Schritte. Füge deinen ersten Expositionsschritt hinzu.</p>
      ) : (
        <div className={styles.ladder}>
          {items.map((item, i) => (
            <div key={item.id} className={styles.ladderStep}>
              <div className={styles.stepNumber}>{i + 1}</div>
              <div className={styles.stepContent}>
                <ExposureItemCard
                  item={item}
                  onEdit={() => openEdit(item)}
                  onSchedule={() => handleSchedule(item)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Schritt bearbeiten' : 'Neuer Schritt'}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.formLabel}>
            Titel
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Alleine Bahn fahren"
              className={styles.formInput}
              autoFocus
            />
          </label>
          <label className={styles.formLabel}>
            Beschreibung
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details zur Exposition..."
              className={styles.formTextarea}
              rows={3}
            />
          </label>
          <SudsSlider value={sudsEstimate} onChange={setSudsEstimate} label="Erwarteter SUDS" />
          <DifficultyStars value={difficulty} onChange={setDifficulty} />
          <label className={styles.formLabel}>
            Kategorie
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              className={styles.formSelect}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>
              {editItem ? 'Speichern' : 'Hinzufügen'}
            </button>
            {editItem && (
              <button
                type="button"
                className={styles.deleteBtnSmall}
                onClick={() => { handleDeleteItem(editItem); setShowModal(false); }}
              >
                Löschen
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
