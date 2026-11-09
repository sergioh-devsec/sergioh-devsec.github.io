const checkout = document.querySelector('#premium-checkout');

if (typeof checkout?.showModal === 'function') {
  const title = checkout.querySelector('[data-checkout-item]');
  const confirm = checkout.querySelector('[data-checkout-confirm]');
  const cancel = checkout.querySelector('[data-checkout-cancel]');
  let activeCard = null;

  for (const card of document.querySelectorAll('[data-premium-card]')) {
    const trigger = card.querySelector('[data-premium-trigger]');
    trigger.disabled = false;
    trigger.addEventListener('click', () => {
      activeCard = card;
      title.textContent = card.querySelector('[data-premium-title]').textContent;
      checkout.showModal();
    });
  }

  confirm.addEventListener('click', () => {
    if (!activeCard) return;
    activeCard.dataset.unlocked = '';
    activeCard.querySelector('[data-premium-trigger]').hidden = true;
    activeCard.querySelector('[data-premium-result]').hidden = false;
    checkout.close();
  });

  cancel.addEventListener('click', () => checkout.close());

  checkout.addEventListener('close', () => {
    if (!activeCard) return;
    const target = activeCard.hasAttribute('data-unlocked')
      ? '[data-premium-result]'
      : '[data-premium-trigger]';
    activeCard.querySelector(target).focus({ preventScroll: true });
    activeCard = null;
  });
}
