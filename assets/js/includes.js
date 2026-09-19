/* Injects [data-include] partials (header/footer). Needs a local server (e.g. VS Code Live Server), not file:// */
(() => {
  const load = async (el) => {
    try {
      const res = await fetch(el.dataset.include);
      if (!res.ok) throw new Error(res.status);
      el.innerHTML = await res.text();
    } catch (err) {
      console.warn('Include failed: ' + el.dataset.include + ' — run the site through a local server, not file://', err);
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([...document.querySelectorAll('[data-include]')].map(load));

    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.wb-nav .nav-link').forEach((a) => {
      if (a.getAttribute('href') === page) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
    document.querySelectorAll('[data-year]').forEach((s) => (s.textContent = new Date().getFullYear()));
    document.dispatchEvent(new Event('includes:loaded'));
  });
})();