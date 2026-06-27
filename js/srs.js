// Owl's Academy — Spaced Repetition (SM-2 algorithm)
// Quality: 0=blackout, 1=wrong, 2=wrong+hint, 3=hard, 4=good, 5=easy

window.OWL = window.OWL || {};

OWL.SRS = (() => {
  function calc(card, quality) {
    // card: {interval, easeFactor, reps, nextReview}
    const q = Math.max(0, Math.min(5, quality));
    let { interval = 1, easeFactor = 2.5, reps = 0 } = card;

    if (q < 3) {
      reps = 0;
      interval = 1;
    } else {
      if (reps === 0)      interval = 1;
      else if (reps === 1) interval = 6;
      else                 interval = Math.round(interval * easeFactor);
      reps++;
    }

    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      interval,
      easeFactor: Math.round(easeFactor * 100) / 100,
      reps,
      nextReview: nextReview.toISOString().slice(0, 10),
      lastQuality: q
    };
  }

  function isDue(card) {
    if (!card || !card.nextReview) return true;
    return card.nextReview <= new Date().toISOString().slice(0, 10);
  }

  function isNew(card) {
    return !card || card.reps === undefined || card.reps === 0;
  }

  function dueLabel(card) {
    if (!card || !card.nextReview) return 'Nowe';
    const today = new Date().toISOString().slice(0, 10);
    if (card.nextReview <= today) return 'Do powtórki';
    const days = Math.round((new Date(card.nextReview) - new Date()) / 86400000);
    return `Za ${days} ${days === 1 ? 'dzień' : 'dni'}`;
  }

  return { calc, isDue, isNew, dueLabel };
})();
