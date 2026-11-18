import { guidance } from '../domain/guidance.js';
import { assistantContext } from '../domain/profile.js';
import { $, element, setDisclosure } from '../ui/dom.js';

export function initializeAssistant(getProfile) {
  let busy = false;
  const controls = [$('#chat-toggle'), $('#ask-open')];
  const open = () => {
    $('#chat').classList.remove('hidden');
    controls.forEach((button) => setDisclosure(button, true));
    $('#question').focus();
  };
  const close = () => {
    $('#chat').classList.add('hidden');
    controls.forEach((button) => setDisclosure(button, false));
    $('#chat-toggle').focus();
  };
  function message(text, type) {
    const node = element('div', `message ${type}`, text);
    $('#messages').append(node);
    node.scrollIntoView({ block: 'nearest' });
    return node;
  }
  async function ask(question) {
    const clean = question.trim();
    if (busy || !clean) return;
    const profile = assistantContext(getProfile());
    busy = true;
    message(clean, 'user');
    const pending = message('Thinking through your day…', 'bot');
    $('#chat-form button').disabled = true;
    $('#chat-form').setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, question: clean }),
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || 'Assistant request failed. Please retry.');
      if (typeof result.answer !== 'string')
        throw new Error('Assistant returned an invalid response.');
      pending.textContent = result.answer;
      if (result.diagnostic) {
        const { code, httpStatus, model, message: explanation } = result.diagnostic;
        message(
          `Gemini ${code}${httpStatus ? ' (HTTP ' + httpStatus + ')' : ''}: ${explanation}${model ? ' Model: ' + model : ''}`,
          'bot',
        );
      }
      $('#chat-mode').textContent = `${result.mode} · General guidance, not medical advice`;
    } catch (error) {
      pending.textContent = guidance(profile, clean);
      message(
        error.name === 'TimeoutError'
          ? 'Assistant request timed out. Please retry.'
          : error.message,
        'bot',
      );
      $('#chat-mode').textContent = 'Local guidance · Assistant request unavailable';
    } finally {
      busy = false;
      $('#chat-form button').disabled = false;
      $('#chat-form').setAttribute('aria-busy', 'false');
    }
  }
  controls.forEach((button) => {
    button.setAttribute('aria-controls', 'chat');
    setDisclosure(button, false);
    button.addEventListener('click', open);
  });
  $('#chat-close').addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#chat').classList.contains('hidden')) close();
  });
  $('#chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const q = $('#question').value;
    $('#question').value = '';
    void ask(q);
  });
  document.querySelectorAll('[data-question]').forEach((button) =>
    button.addEventListener('click', () => {
      open();
      void ask(button.dataset.question);
    }),
  );
}
