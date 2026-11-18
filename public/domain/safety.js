const URGENT_SYMPTOMS =
  /\b(severe breathlessness|difficulty breathing|cannot breathe|chest pain|emergency)\b/i;
export const URGENT_GUIDANCE =
  "If you have severe breathlessness, chest pain, confusion, or rapidly worsening symptoms, seek urgent local medical help. Follow your clinician's existing care plan. I cannot diagnose symptoms.";
export function isUrgent(question) {
  return URGENT_SYMPTOMS.test(question);
}
