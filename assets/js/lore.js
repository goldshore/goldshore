document.querySelectorAll('[data-lore]').forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    const page = e.target.getAttribute('data-lore');
    const res = await fetch(`${page}.html`);
    const html = await res.text();
    document.querySelector('#modal-content').innerHTML = html;
    openModal();
  });
});