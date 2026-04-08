import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';
import { useData } from '../../context/DataContext';
import {
  ADD_ITEM, UPDATE_ITEM, DELETE_ITEM, DELETE_PLAN,
  ADD_PHASE, UPDATE_PHASE, DELETE_PHASE,
} from '../../context/actions';
import { generateId } from '../../lib/ids';
import { CATEGORIES } from '../../lib/constants';
import Modal from '../../components/Modal';
import SudsSlider from '../../components/SudsSlider';
import ExposureItemCard from '../../components/ExposureItemCard';
import PlanOverview from '../../components/PlanOverview';
import styles from './planDetail.module.css';

const EMPTY_ITEM = {
  title: '',
  description: '',
  suds_estimate: 5,
  difficulty: 3,
  category: '',
  phaseId: '',
  week: 1,
  unit: 1,
  ort: '',
  dauer: '',
  begleitung: '',
  fokus_beiMir: '',
  fokus_freude: '',
  anspruch: '',
  atemuebung: false,
  notiz: '',
};

export default function PlanDetail() {
  const router = useRouter();
  const { planId } = router.query;
  const { state, dispatch, isHydrated } = useData();
  const [view, setView] = useState('ladder'); // 'ladder' | 'overview'
  const [showItemModal, setShowItemModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editPhase, setEditPhase] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [phaseName, setPhaseName] = useState('');

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

  const phases = Object.values(state.phases)
    .filter((p) => p.planId === planId)
    .sort((a, b) => a.order - b.order);
  const items = Object.values(state.items).filter((i) => i.planId === planId);

  // Group items by phaseId
  const itemsByPhase = new Map();
  phases.forEach((p) => itemsByPhase.set(p.id, []));
  itemsByPhase.set('__unassigned__', []);
  items.forEach((item) => {
    const key = item.phaseId && itemsByPhase.has(item.phaseId) ? item.phaseId : '__unassigned__';
    itemsByPhase.get(key).push(item);
  });
  // Sort within each phase: week, unit, then suds
  for (const [, list] of itemsByPhase) {
    list.sort((a, b) => (a.week || 0) - (b.week || 0)
      || (a.unit || 0) - (b.unit || 0)
      || (a.suds_estimate || 0) - (b.suds_estimate || 0));
  }

  function openAddItem(phaseId = '') {
    setEditItem(null);
    setForm({ ...EMPTY_ITEM, phaseId, category: plan.category || '' });
    setShowItemModal(true);
  }

  function openEditItem(item) {
    setEditItem(item);
    setForm({
      ...EMPTY_ITEM,
      ...item,
    });
    setShowItemModal(true);
  }

  function handleItemSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      phaseId: form.phaseId || null,
      week: Number(form.week) || 1,
      unit: Number(form.unit) || 1,
      ort: form.ort.trim(),
      dauer: form.dauer.trim(),
      begleitung: form.begleitung.trim(),
      fokus_beiMir: form.fokus_beiMir.trim(),
      fokus_freude: form.fokus_freude.trim(),
      anspruch: form.anspruch.trim(),
      notiz: form.notiz.trim(),
      atemuebung: !!form.atemuebung,
    };

    if (editItem) {
      dispatch({ type: UPDATE_ITEM, payload: { ...payload, id: editItem.id } });
    } else {
      dispatch({ type: ADD_ITEM, payload: { ...payload, id: generateId(), planId } });
    }
    setShowItemModal(false);
  }

  function handleDeleteItem(item) {
    if (confirm(`"${item.title}" wirklich löschen?`)) {
      dispatch({ type: DELETE_ITEM, payload: item.id });
    }
  }

  function handleDeletePlan() {
    if (confirm(`Plan "${plan.name}" und alle Schritte löschen?`)) {
      items.forEach((item) => dispatch({ type: DELETE_ITEM, payload: item.id }));
      phases.forEach((p) => dispatch({ type: DELETE_PHASE, payload: p.id }));
      dispatch({ type: DELETE_PLAN, payload: plan.id });
      router.push('/plan');
    }
  }

  function openAddPhase() {
    setEditPhase(null);
    setPhaseName('');
    setShowPhaseModal(true);
  }

  function openEditPhase(phase) {
    setEditPhase(phase);
    setPhaseName(phase.name);
    setShowPhaseModal(true);
  }

  function handlePhaseSubmit(e) {
    e.preventDefault();
    if (!phaseName.trim()) return;
    if (editPhase) {
      dispatch({ type: UPDATE_PHASE, payload: { id: editPhase.id, name: phaseName.trim() } });
    } else {
      dispatch({
        type: ADD_PHASE,
        payload: {
          id: generateId(),
          planId,
          name: phaseName.trim(),
          order: phases.length,
        },
      });
    }
    setShowPhaseModal(false);
  }

  function handleDeletePhase(phase) {
    const phaseItems = items.filter((i) => i.phaseId === phase.id);
    if (phaseItems.length > 0) {
      if (!confirm(`Phase "${phase.name}" hat ${phaseItems.length} Schritte. Schritte werden nicht gelöscht, aber der Phase-Zuweisung entfernt. Fortfahren?`)) return;
      phaseItems.forEach((i) =>
        dispatch({ type: UPDATE_ITEM, payload: { id: i.id, phaseId: null } })
      );
    }
    dispatch({ type: DELETE_PHASE, payload: phase.id });
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
        <button className={styles.deleteBtn} onClick={handleDeletePlan}>Plan löschen</button>
      </div>

      {/* View Toggle */}
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${view === 'ladder' ? styles.toggleActive : ''}`}
          onClick={() => setView('ladder')}
        >
          Angstleiter
        </button>
        <button
          className={`${styles.toggleBtn} ${view === 'overview' ? styles.toggleActive : ''}`}
          onClick={() => setView('overview')}
        >
          Übersicht &amp; Auswertung
        </button>
      </div>

      {view === 'overview' ? (
        <PlanOverview
          planId={planId}
          phases={phases}
          items={items}
          scheduled={state.scheduled}
          logs={state.logs}
          journals={state.journals}
          onEditItem={openEditItem}
        />
      ) : (
        <>
          <div className={styles.itemsHeader}>
            <h2 className={styles.itemsTitle}>
              {phases.length > 0 ? `${phases.length} Phasen · ${items.length} Schritte` : `${items.length} Schritte`}
            </h2>
            <div className={styles.headerActions}>
              <button className={styles.secondaryBtn} onClick={openAddPhase}>+ Phase</button>
              <button className={styles.addBtn} onClick={() => openAddItem(phases[0]?.id || '')}>
                + Schritt
              </button>
            </div>
          </div>

          {phases.length === 0 && items.length === 0 && (
            <p className={styles.emptyText}>
              Noch keine Schritte. Füge Phasen hinzu um deine Angstleiter zu strukturieren oder Schritte direkt anzulegen.
            </p>
          )}

          {phases.map((phase) => {
            const phaseItems = itemsByPhase.get(phase.id) || [];
            return (
              <section key={phase.id} className={styles.phaseSection}>
                <header className={styles.phaseHeader}>
                  <h3 className={styles.phaseName}>{phase.name}</h3>
                  <div className={styles.phaseActions}>
                    <span className={styles.phaseCount}>{phaseItems.length} Schritte</span>
                    <button className={styles.phaseActionBtn} onClick={() => openAddItem(phase.id)}>+</button>
                    <button className={styles.phaseActionBtn} onClick={() => openEditPhase(phase)}>✎</button>
                    <button className={styles.phaseActionBtn} onClick={() => handleDeletePhase(phase)}>×</button>
                  </div>
                </header>
                {phaseItems.length === 0 ? (
                  <p className={styles.phaseEmpty}>Noch keine Schritte in dieser Phase.</p>
                ) : (
                  <div className={styles.phaseList}>
                    {phaseItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onEdit={() => openEditItem(item)}
                        onSchedule={() => handleSchedule(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {(itemsByPhase.get('__unassigned__') || []).length > 0 && (
            <section className={styles.phaseSection}>
              <header className={styles.phaseHeader}>
                <h3 className={styles.phaseName}>Ohne Phase</h3>
                <span className={styles.phaseCount}>
                  {itemsByPhase.get('__unassigned__').length} Schritte
                </span>
              </header>
              <div className={styles.phaseList}>
                {itemsByPhase.get('__unassigned__').map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onEdit={() => openEditItem(item)}
                    onSchedule={() => handleSchedule(item)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Phase Modal */}
      <Modal
        isOpen={showPhaseModal}
        onClose={() => setShowPhaseModal(false)}
        title={editPhase ? 'Phase bearbeiten' : 'Neue Phase'}
      >
        <form onSubmit={handlePhaseSubmit} className={styles.form}>
          <label className={styles.formLabel}>
            Name der Phase
            <input
              type="text"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              placeholder="z.B. Phase 3 — Ruhige Begleitung"
              className={styles.formInput}
              autoFocus
            />
          </label>
          <button type="submit" className={styles.submitBtn}>
            {editPhase ? 'Speichern' : 'Phase anlegen'}
          </button>
        </form>
      </Modal>

      {/* Item Modal — extended */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editItem ? 'Schritt bearbeiten' : 'Neuer Schritt'}
      >
        <form onSubmit={handleItemSubmit} className={styles.form}>
          <label className={styles.formLabel}>
            Situation / Übung
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="z.B. Café 45 Min — zu zweit, normales Gespräch"
              className={styles.formInput}
              autoFocus
            />
          </label>

          <label className={styles.formLabel}>
            Beschreibung
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details zur Übung..."
              className={styles.formTextarea}
              rows={2}
            />
          </label>

          <div className={styles.formRow}>
            <label className={styles.formLabelSmall}>
              Phase
              <select
                value={form.phaseId || ''}
                onChange={(e) => setForm({ ...form, phaseId: e.target.value })}
                className={styles.formSelect}
              >
                <option value="">— keine —</option>
                {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className={styles.formLabelSmall}>
              Woche
              <input
                type="number"
                min={1}
                value={form.week}
                onChange={(e) => setForm({ ...form, week: e.target.value })}
                className={styles.formInput}
              />
            </label>
            <label className={styles.formLabelSmall}>
              Einheit
              <input
                type="number"
                min={1}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={styles.formInput}
              />
            </label>
          </div>

          <SudsSlider
            value={form.suds_estimate}
            onChange={(v) => setForm({ ...form, suds_estimate: v })}
            label="Erwartete Schwierigkeit (0-10)"
          />

          <div className={styles.formRow}>
            <label className={styles.formLabelSmall}>
              Ort
              <input
                type="text"
                value={form.ort}
                onChange={(e) => setForm({ ...form, ort: e.target.value })}
                placeholder="z.B. Café"
                className={styles.formInput}
              />
            </label>
            <label className={styles.formLabelSmall}>
              Dauer
              <input
                type="text"
                value={form.dauer}
                onChange={(e) => setForm({ ...form, dauer: e.target.value })}
                placeholder="z.B. 45 Min"
                className={styles.formInput}
              />
            </label>
          </div>

          <label className={styles.formLabel}>
            Begleitung
            <input
              type="text"
              value={form.begleitung}
              onChange={(e) => setForm({ ...form, begleitung: e.target.value })}
              placeholder="z.B. 1 Person (ruhig)"
              className={styles.formInput}
            />
          </label>

          <label className={styles.formLabel}>
            Fokus: Bei mir bleiben
            <input
              type="text"
              value={form.fokus_beiMir}
              onChange={(e) => setForm({ ...form, fokus_beiMir: e.target.value })}
              placeholder="Worauf achtest du während der Übung?"
              className={styles.formInput}
            />
          </label>

          <label className={styles.formLabel}>
            Fokus: Freude zulassen
            <input
              type="text"
              value={form.fokus_freude}
              onChange={(e) => setForm({ ...form, fokus_freude: e.target.value })}
              placeholder="Was darfst du genießen?"
              className={styles.formInput}
            />
          </label>

          <label className={styles.formLabel}>
            Mein Anspruch an diese Übung
            <input
              type="text"
              value={form.anspruch}
              onChange={(e) => setForm({ ...form, anspruch: e.target.value })}
              placeholder='z.B. "KEINER. Da sein reicht."'
              className={styles.formInput}
            />
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!!form.atemuebung}
              onChange={(e) => setForm({ ...form, atemuebung: e.target.checked })}
            />
            Atemübung vorher?
          </label>

          <label className={styles.formLabel}>
            Eigene Notiz
            <textarea
              value={form.notiz}
              onChange={(e) => setForm({ ...form, notiz: e.target.value })}
              placeholder="Anweisungen oder Erinnerungen für dich selbst..."
              className={styles.formTextarea}
              rows={2}
            />
          </label>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>
              {editItem ? 'Speichern' : 'Hinzufügen'}
            </button>
            {editItem && (
              <button
                type="button"
                className={styles.deleteBtnSmall}
                onClick={() => { handleDeleteItem(editItem); setShowItemModal(false); }}
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

function ItemRow({ item, onEdit, onSchedule }) {
  return (
    <div className={styles.itemRow}>
      <div className={styles.itemMeta}>
        {(item.week || item.unit) && (
          <span className={styles.weekUnit}>W{item.week || '?'}·E{item.unit || '?'}</span>
        )}
        <span className={styles.sudsPill} style={{ background: sudsColor(item.suds_estimate) }}>
          {item.suds_estimate}
        </span>
      </div>
      <div className={styles.itemContent}>
        <h4 className={styles.itemTitle}>{item.title}</h4>
        <div className={styles.itemInlineInfo}>
          {item.ort && <span>📍 {item.ort}</span>}
          {item.dauer && <span>⏱ {item.dauer}</span>}
          {item.begleitung && <span>👤 {item.begleitung}</span>}
        </div>
        {item.fokus_beiMir && (
          <p className={styles.itemFocus}><strong>Fokus:</strong> {item.fokus_beiMir}</p>
        )}
      </div>
      <div className={styles.itemActions}>
        <button className={styles.btnSmall} onClick={onEdit}>✎</button>
        <button className={`${styles.btnSmall} ${styles.btnPrimary}`} onClick={onSchedule}>Planen</button>
      </div>
    </div>
  );
}

function sudsColor(val) {
  if (val <= 3) return 'var(--color-suds-0)';
  if (val <= 6) return 'var(--color-suds-5)';
  return 'var(--color-suds-10)';
}
