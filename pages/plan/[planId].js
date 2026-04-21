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
import PlanOverview from '../../components/PlanOverview';
import {
  MapPin, Clock, UsersThree, PencilSimple, Plus, X, CalendarPlus, FilePdf,
} from '@phosphor-icons/react';
import { exportPlanPdf } from '../../lib/exports';
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

  // Earliest scheduled date per item — drives chronological order
  const earliestByItem = {};
  Object.values(state.scheduled).forEach((s) => {
    if (!s.itemId) return;
    const key = s.date + 'T' + (s.time || '00:00');
    if (!earliestByItem[s.itemId] || key < earliestByItem[s.itemId]) {
      earliestByItem[s.itemId] = key;
    }
  });

  // Group items by phaseId
  const itemsByPhase = new Map();
  phases.forEach((p) => itemsByPhase.set(p.id, []));
  itemsByPhase.set('__unassigned__', []);
  items.forEach((item) => {
    const key = item.phaseId && itemsByPhase.has(item.phaseId) ? item.phaseId : '__unassigned__';
    itemsByPhase.get(key).push(item);
  });
  // Sort within each phase: scheduled date first, then week/unit as fallback
  const sortByScheduleThenPlan = (a, b) => {
    const sa = earliestByItem[a.id];
    const sb = earliestByItem[b.id];
    if (sa && sb) return sa.localeCompare(sb);
    if (sa && !sb) return -1;
    if (!sa && sb) return 1;
    return (a.week || 0) - (b.week || 0)
      || (a.unit || 0) - (b.unit || 0)
      || (a.suds_estimate || 0) - (b.suds_estimate || 0);
  };
  for (const [, list] of itemsByPhase) {
    list.sort(sortByScheduleThenPlan);
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

      <div className={styles.planHero}>
        <img
          className={styles.planHeroImg}
          src={heroImageFor(plan.category)}
          alt=""
          loading="lazy"
        />
        <div className={styles.planHeroOverlay} />
        <div className={styles.planHeader}>
          <div>
            <span className={styles.category}>{plan.category}</span>
            <h1 className={styles.planName}>{plan.name}</h1>
            {plan.goal && <p className={styles.planGoal}>{plan.goal}</p>}
          </div>
          <div className={styles.heroActions}>
            <button className={styles.pdfBtn} onClick={() => exportPlanPdf(plan, state.phases, state.items, state.scheduled)}>
              <FilePdf size={16} weight="bold" /> PDF
            </button>
            <button className={styles.deleteBtn} onClick={handleDeletePlan}>Plan löschen</button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${view === 'ladder' ? styles.toggleActive : ''}`}
          onClick={() => setView('ladder')}
        >
          Mutleiter
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
              <button className={styles.secondaryBtn} onClick={openAddPhase}>
                <Plus size={14} weight="bold" /> Phase
              </button>
              <button className={styles.addBtn} onClick={() => openAddItem(phases[0]?.id || '')}>
                <Plus size={14} weight="bold" /> Schritt
              </button>
            </div>
          </div>

          {phases.length === 0 && items.length === 0 && (
            <p className={styles.emptyText}>
              Noch keine Schritte. Füge Phasen hinzu, um deine Mutleiter zu strukturieren, oder lege Schritte direkt an.
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
                    <button className={styles.phaseActionBtn} onClick={() => openAddItem(phase.id)} aria-label="Schritt hinzufügen">
                      <Plus size={14} weight="bold" />
                    </button>
                    <button className={styles.phaseActionBtn} onClick={() => openEditPhase(phase)} aria-label="Phase bearbeiten">
                      <PencilSimple size={14} weight="bold" />
                    </button>
                    <button className={styles.phaseActionBtn} onClick={() => handleDeletePhase(phase)} aria-label="Phase löschen">
                      <X size={14} weight="bold" />
                    </button>
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
                        scheduleDate={formatScheduleKey(earliestByItem[item.id])}
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
                    scheduleDate={formatScheduleKey(earliestByItem[item.id])}
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
            label="Erwartete Anspannung (0 = leicht, 10 = max)"
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

function ItemRow({ item, onEdit, onSchedule, scheduleDate }) {
  return (
    <div className={styles.itemRow}>
      <div className={styles.itemMeta}>
        {scheduleDate && (
          <span className={styles.weekUnit}>{scheduleDate}</span>
        )}
        {!scheduleDate && (item.week || item.unit) && (
          <span className={styles.weekUnit}>W{item.week || '?'}·E{item.unit || '?'}</span>
        )}
        <span className={styles.sudsPill} style={{ background: sudsColor(item.suds_estimate) }}>
          {item.suds_estimate}
        </span>
      </div>
      <div className={styles.itemContent}>
        <h4 className={styles.itemTitle}>{item.title}</h4>
        <div className={styles.itemInlineInfo}>
          {item.ort && (
            <span><MapPin size={12} weight="fill" /> {item.ort}</span>
          )}
          {item.dauer && (
            <span><Clock size={12} weight="fill" /> {item.dauer}</span>
          )}
          {item.begleitung && (
            <span><UsersThree size={12} weight="fill" /> {item.begleitung}</span>
          )}
        </div>
        {item.fokus_beiMir && (
          <p className={styles.itemFocus}><strong>Fokus:</strong> {item.fokus_beiMir}</p>
        )}
      </div>
      <div className={styles.itemActions}>
        <button className={styles.btnSmall} onClick={onEdit} aria-label="Bearbeiten">
          <PencilSimple size={14} weight="bold" />
        </button>
        <button className={`${styles.btnSmall} ${styles.btnPrimary}`} onClick={onSchedule}>
          Planen
        </button>
      </div>
    </div>
  );
}

function sudsColor(val) {
  if (val <= 3) return 'var(--color-suds-0)';
  if (val <= 6) return 'var(--color-suds-5)';
  return 'var(--color-suds-10)';
}

function formatScheduleKey(key) {
  if (!key) return null;
  const [dateStr] = key.split('T');
  const d = new Date(dateStr + 'T00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

const HERO_BY_CATEGORY = {
  'Soziale Situationen': 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1600&q=80&auto=format&fit=crop',
  'Höhen & Weite': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80&auto=format&fit=crop',
  'Neue Orte & Räume': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1600&q=80&auto=format&fit=crop',
  'Reisen & Mobilität': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80&auto=format&fit=crop',
  'Spezifische Herausforderung': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80&auto=format&fit=crop',
  'Andere': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop',
};

function heroImageFor(category) {
  return HERO_BY_CATEGORY[category] || HERO_BY_CATEGORY['Andere'];
}
