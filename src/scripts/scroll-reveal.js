// Elements rise into place the first time they scroll into view. Without
// IntersectionObserver, or when the visitor asks for reduced motion, nothing
// is hidden in the first place.
const DURATION = 700;

export function revealOnScroll(selector, { stagger = 80 } = {}) {
  if (!('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.filter(entry => entry.isIntersecting).forEach(({ target }, i) => {
      const delay = i * stagger;
      target.style.transitionDelay = `${delay}ms`;
      target.classList.add('is-revealed');
      observer.unobserve(target);
      // Hand the element back to its own hover transitions once it has settled.
      setTimeout(() => {
        target.classList.remove('reveal', 'is-revealed');
        target.style.transitionDelay = '';
      }, delay + DURATION + 50);
    });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll(selector).forEach((element) => {
    element.classList.add('reveal');
    observer.observe(element);
  });
}
