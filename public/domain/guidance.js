import { buildPlan } from './recommendations.js';
import { isUrgent, URGENT_GUIDANCE } from './safety.js';

export function guidance(profile, question = '') {
  if (isUrgent(question)) return URGENT_GUIDANCE;
  const q = question.toLowerCase();
  if (/plant/.test(q))
    return 'Houseplants are not a substitute for particle filtration. Reduce indoor smoke sources and use a properly sized, ozone-free particle filter if available.';
  if (/window|ventilat/.test(q))
    return 'When outdoor particle pollution is high, keep windows closed if you can remain comfortably cool and safe. Ventilate when outdoor air improves. Never block required gas-appliance ventilation or compromise carbon-monoxide safety.';
  if (/child|school|kid/.test(q))
    return 'Children are more sensitive to air pollution. During polluted conditions, coordinate cleaner indoor activities with school, follow official advisories, and discuss individual needs with a clinician. Respirator fit and suitability for children require individual guidance.';
  const plan = buildPlan(profile);
  const item = /commut|travel|metro|car/.test(q)
    ? plan.find((a) => a.id === 'commute')
    : /indoor|budget|filter|home|cook/.test(q)
      ? plan.find((a) => a.id === 'room')
      : null;
  if (item)
    return `For your household in ${profile.city}: ${item.text} ${item.reason} ${item.impact}`;
  return `For your household in ${profile.city}: ${plan[0].text} ${plan[0].reason} ${profile.sensitive ? 'Prioritize children, older adults, and anyone with heart or lung conditions. ' : ''}${profile.budget === 'low' ? 'Start with no-cost source reduction. ' : ''}${plan[1].text} These steps may reduce exposure but cannot guarantee a health outcome.`;
}
