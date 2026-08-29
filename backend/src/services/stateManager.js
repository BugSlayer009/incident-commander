// in-memory incident state — swap for Postgres later, this is enough for demo/MVP
let state = {
  facts: [],
  hypotheses: [],
  decisions: [],
  actions: [],
  conflicts: [],
  timeline: []
};

export function getState() {
  return state;
}

export function resetState() {
  state = { facts: [], hypotheses: [], decisions: [], actions: [], conflicts: [], timeline: [] };
}

export function addTimelineEvent(event) {
  state.timeline.push({ ...event, timestamp: new Date().toISOString() });
}

export function addClassifiedItem(item) {
  // item: { type: 'fact'|'hypothesis'|'decision'|'action'|'conflict', speaker, role, text, owner?, dueBy? }
  const entry = { id: Date.now() + Math.random(), ...item, timestamp: new Date().toISOString() };

  switch (item.type) {
    case "fact":
      // conflict check against existing facts
      const conflict = state.facts.find(f => f.contradicts && f.contradicts === item.text);
      state.facts.push(entry);
      break;
    case "hypothesis":
      state.hypotheses.push(entry);
      break;
    case "decision":
      state.decisions.push(entry);
      break;
    case "action":
      entry.status = "open";
      state.actions.push(entry);
      break;
    case "conflict":
      state.conflicts.push(entry);
      break;
  }

  addTimelineEvent({ type: item.type, text: item.text, speaker: item.speaker });
  return entry;
}

export function updateActionStatus(actionId, status) {
  const action = state.actions.find(a => a.id == actionId);
  if (action) action.status = status;
  return action;
}