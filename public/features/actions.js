import { $, element } from '../ui/dom.js';

export function renderActionCards(actions, completed, filter, onToggle) {
  const container = $('#action-cards');
  container.replaceChildren();
  for (const action of actions.filter((a) => filter === 'all' || a.type === filter)) {
    const card = element('article', 'action-card');
    const top = element('div', 'action-top');
    const icon = element('span', 'action-icon', action.icon);
    icon.setAttribute('aria-hidden', 'true');
    top.append(icon, element('span', 'tag', action.tag));
    const button = element(
      'button',
      '',
      completed.includes(action.id) ? 'Added to my day ✓' : 'Add to my day +',
    );
    button.type = 'button';
    button.id = `action-${action.id}`;
    button.setAttribute('aria-pressed', String(completed.includes(action.id)));
    button.setAttribute(
      'aria-label',
      `${completed.includes(action.id) ? 'Remove' : 'Add'}: ${action.title}`,
    );
    button.addEventListener('click', () => onToggle(action.id));
    card.append(
      top,
      element('h3', '', action.title),
      element('p', '', action.text),
      element('p', 'action-reason', `Why for you: ${action.reason}`),
    );
    const details = element('details', 'action-impact');
    const source = element('a', 'source-link', 'Guidance source ↗');
    source.href = action.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    details.append(
      element('summary', '', `Direct impact · ${action.benefit}`),
      element('p', '', action.impact),
      source,
    );
    card.append(details, button);
    container.append(card);
  }
}

export function renderActionPlan(actions, completed, onToggle) {
  const container = $('#plan-list');
  container.replaceChildren();
  for (const action of actions) {
    const item = element('article', 'plan-item' + (completed.includes(action.id) ? ' done' : ''));
    const check = element('input');
    check.type = 'checkbox';
    check.checked = completed.includes(action.id);
    check.id = `plan-${action.id}`;
    check.addEventListener('change', () => onToggle(action.id));
    const content = element('div');
    const label = element('label', '', action.title);
    label.setAttribute('for', check.id);
    content.append(
      label,
      element('p', '', action.text),
      element('p', '', `Why for you: ${action.reason}`),
      element('p', '', `Direct impact: ${action.impact}`),
    );
    item.append(check, content);
    container.append(item);
  }
}
