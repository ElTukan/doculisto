(() => {
  const btn = document.querySelector('.menu-button');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;
  const close = () => {
    btn.setAttribute('aria-expanded', 'false');
    nav.classList.remove('mobile-open');
  };
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = nav.classList.toggle('mobile-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !btn.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
})();
