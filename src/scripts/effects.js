// Services disclosure: supports pointer, touch, and keyboard navigation.
document.querySelectorAll('[data-dropdown]').forEach((dropdown) => {
  const trigger = dropdown.querySelector('.dd-trigger');
  const menu = dropdown.querySelector('.dd-menu');
  if (!trigger || !menu) return;
  const setOpen = (open) => {
    dropdown.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    menu.inert = !open;
  };
  setOpen(false);
  trigger.addEventListener('click', () => {
    setOpen(trigger.getAttribute('aria-expanded') !== 'true');
  });
  dropdown.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setOpen(false);
      trigger.focus();
    }
    if (event.key === 'ArrowDown' && event.target === trigger) {
      event.preventDefault();
      setOpen(true);
      menu.querySelector('a')?.focus();
    }
  });
  dropdown.addEventListener('focusout', (event) => {
    if (!dropdown.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) setOpen(false);
  });
});
