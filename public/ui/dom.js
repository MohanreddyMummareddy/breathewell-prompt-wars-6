export const $ = (selector) => document.querySelector(selector);

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function setDisclosure(button, expanded) {
  button.setAttribute('aria-expanded', String(expanded));
}
