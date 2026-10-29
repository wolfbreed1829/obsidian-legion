// Preserve links shared before the site moved to separate documents.
const legacyPages = { '#manifesto': 'ethos.html', '#collective': 'collective.html', '#build': 'build.html', '#join': 'join.html' };
function redirectLegacyLink() {
  const isHome = location.pathname.endsWith('/') || location.pathname.endsWith('/index.html');
  if (isHome && legacyPages[location.hash]) {
    location.replace(new URL(legacyPages[location.hash] + location.search, location.href));
  }
}
redirectLegacyLink();
window.addEventListener('hashchange', redirectLegacyLink);

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.navigation');
function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

const signupForm = document.querySelector('#legionnaire-form');
if (signupForm) {
  let sending = false;
  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !signupForm.reportValidity()) return;
    sending = true;
    const button = signupForm.querySelector('button[type="submit"]');
    const label = button.querySelector('span');
    const error = document.querySelector('#signup-error');
    button.disabled = true;
    label.textContent = 'Submitting…';
    error.hidden = true;
    try {
      const response = await fetch(signupForm.action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(signupForm))),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'We couldn’t save your application. Please try again.');
      signupForm.hidden = true;
      const success = document.querySelector('#signup-success');
      success.hidden = false;
      success.focus();
    } catch (reason) {
      error.textContent = reason instanceof Error && reason.name !== 'TimeoutError' && reason.name !== 'TypeError'
        ? reason.message : 'We couldn’t confirm submission. Please retry; your email prevents duplicate applications.';
      error.hidden = false;
    } finally {
      sending = false;
      button.disabled = false;
      label.textContent = 'Apply to become a Legionnaire';
    }
  });
}
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  navigation.classList.toggle('is-open', expanded);
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  }
  for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
  if (focus) tab.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab);
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
  });
}
