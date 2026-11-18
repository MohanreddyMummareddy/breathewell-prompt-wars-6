import { guidance } from '../../public/domain/guidance.js';
import { assistantContext } from '../../public/domain/profile.js';
import { isUrgent } from '../../public/domain/safety.js';
import { generateGuidance, GeminiError } from '../gemini.mjs';
import { HttpError } from '../http.mjs';

export function validateChatInput(input) {
  const p = input?.profile;
  if (
    !p ||
    typeof p !== 'object' ||
    Array.isArray(p) ||
    typeof input.question !== 'string' ||
    !input.question.trim() ||
    input.question.length > 2000 ||
    typeof p.city !== 'string' ||
    !p.city.trim() ||
    p.city.length > 200 ||
    !(p.aqi === null || (Number.isFinite(p.aqi) && p.aqi >= 0 && p.aqi <= 500)) ||
    !Number.isFinite(p.commute) ||
    p.commute < 0 ||
    p.commute > 200 ||
    !['low', 'flexible'].includes(p.budget) ||
    typeof p.sensitive !== 'boolean' ||
    (p.travelMode !== undefined &&
      !['unknown', 'car', 'two-wheeler', 'public', 'active', 'remote'].includes(p.travelMode)) ||
    (p.cooking !== undefined && !['gas', 'electric', 'mixed'].includes(p.cooking)) ||
    (p.purifier !== undefined && typeof p.purifier !== 'boolean')
  ) {
    throw new HttpError(400, 'INVALID_INPUT', 'Check your question and household preferences.');
  }
  return { profile: assistantContext(p), question: input.question.trim() };
}

export function createChatService({
  generate = generateGuidance,
  readConfig = () => ({
    apiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim(),
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  }),
  logger = console,
} = {}) {
  return async (input) => {
    const { profile, question } = validateChatInput(input);
    const fallback = { answer: guidance(profile, question), mode: 'Local guidance' };
    if (isUrgent(question)) return { ...fallback, mode: 'Urgent safety guidance' };
    const config = readConfig();
    if (!config.apiKey)
      return {
        ...fallback,
        diagnostic: { code: 'NOT_CONFIGURED', message: 'Gemini is not configured on this server.' },
      };
    try {
      const answer = await generate({ ...config, profile, question });
      return { answer, mode: 'Gemini-generated guidance' };
    } catch (error) {
      // Only typed provider errors are safe to expose. Never log arbitrary exception text.
      const diagnostic =
        error instanceof GeminiError
          ? {
              code: error.code,
              httpStatus: error.httpStatus,
              model: /^[\w.-]{1,100}$/.test(error.model || '') ? error.model : undefined,
              message: error.message,
            }
          : {
              code: 'INVALID_RESPONSE',
              message: 'Gemini returned an invalid response. Please retry.',
            };
      logger.error('Gemini request failed', JSON.stringify(diagnostic));
      return { ...fallback, mode: 'Local guidance · Gemini unavailable', diagnostic };
    }
  };
}
