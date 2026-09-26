/** Takahiro Yoshino: browser-native interaction layer, no external runtime. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  function play(element, keyframes, options) {
    if (reduce.matches || !element.animate) return Promise.resolve();
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  reduce.addEventListener('change', () => {
    if (reduce.matches) animations.forEach(animation => animation.finish());
  });

  // トップへ戻るリンクに、その遷移でだけ使う目印を付ける。
  // file:// でHTMLを直接開き、参照元やストレージを共有できない場合にも対応。
  const homeURL = new URL('../index.html', document.currentScript.src);
  const homeDirectory = new URL('./', homeURL);
  document.querySelectorAll('a[href]').forEach(link => {
    const target = new URL(link.href);
    if (target.origin !== homeURL.origin || ![homeURL.pathname, homeDirectory.pathname].includes(target.pathname)) return;
    target.searchParams.set('_portfolio_return', '1');
    link.href = target.href;
  });

  // 通常のブラウザ履歴とリンク遷移を利用。データの差し替え・独自ルーターは不要。
  const section = document.querySelector('[data-page-root]')?.dataset.page || 'home';
  document.querySelectorAll('.site-header [data-nav]').forEach(item => {
    const link = item.querySelector('a');
    if (item.dataset.nav === (section === 'work' ? 'selected' : section)) link?.setAttribute('aria-current', 'page');
  });
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  let frame = 0;
  function updateHeader() {
    frame = 0;
    header?.classList.toggle('is-over-hero', !!hero && hero.getBoundingClientRect().bottom > header.offsetHeight);
  }
  const scheduleHeader = () => { if (!frame) frame = requestAnimationFrame(updateHeader); };
  addEventListener('scroll', scheduleHeader, { passive: true });
  addEventListener('resize', scheduleHeader);
  addEventListener('pageshow', scheduleHeader);
  updateHeader();

  function revealContent() {
    const targets = document.querySelectorAll('.hero__layout, .featured-work__intro, .work-card, .profile-content__item, .portfolio-case-text');
    if (!('IntersectionObserver' in window) || reduce.matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        play(entry.target, [
          { opacity: .1, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
    }, { threshold: .12 });
    targets.forEach(element => observer.observe(element));
  }

  const diagramObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: .15 });
  document.querySelectorAll('.service-motion').forEach(diagram => diagramObserver.observe(diagram));

  const footer = document.querySelector('.site-footer');
  const word = footer?.querySelector('.site-footer__wordmark');
  if (word) {
    const text = word.textContent.trim();
    word.setAttribute('aria-label', text);
    word.replaceChildren(...Array.from(text, character => {
      const letter = document.createElement('span');
      letter.className = 'footer-letter'; letter.textContent = character;
      letter.setAttribute('aria-hidden', 'true'); return letter;
    }));
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      Array.from(word.children).forEach((letter, index) => play(letter, [
        { opacity: 0, transform: 'translateY(110%) rotate(7deg)' },
        { opacity: 1, transform: 'translateY(0) rotate(0deg)' }
      ], { duration: 1250, delay: index * 65, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' }));
    }, { threshold: .15 });
    observer.observe(word);
    footer.addEventListener('pointermove', event => {
      if (reduce.matches || event.pointerType !== 'mouse') return;
      const rect = footer.getBoundingClientRect();
      footer.style.setProperty('--footer-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
      footer.style.setProperty('--footer-y', `${(event.clientY - rect.top) / rect.height * 100}%`);
    });
  }
  // 水滴は独立した、このサイト専用のWebGL描画を使用。
  window.portfolioRootURL = new URL('../', document.currentScript.src).href;
  try { window.startRippleHero?.(); }
  catch (error) {
    document.querySelector('#water-surface')?.replaceChildren();
    console.warn('水面の描画を背景画像に切り替えました。', error);
  }
  Promise.resolve(window.playPortfolioOpening?.()).finally(revealContent);
})();
/* 制作資料をページ内で拡大。同じページ内の画像でダイアログを再利用。 */
(() => {
  let dialog, preview, caption, closeButton, opener, closing = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function closePreview() {
    if (!dialog?.open || closing) return;
    closing = true;
    if (reducedMotion.matches) {
      dialog.close();
      return;
    }
    const exit = dialog.animate([
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(12px) scale(.985)' }
    ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    exit.finished.then(() => { dialog.close(); exit.cancel(); });
  }

  function createPreview() {
    dialog = document.createElement('dialog');
    dialog.className = 'image-preview';
    dialog.setAttribute('aria-labelledby', 'image-preview-title');
    const toolbar = document.createElement('div');
    toolbar.className = 'image-preview__toolbar';
    caption = document.createElement('p');
    caption.id = 'image-preview-title';
    caption.className = 'image-preview__title';
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'image-preview__close';
    closeButton.textContent = '閉じる ×';
    closeButton.setAttribute('aria-label', '拡大画像を閉じる');
    preview = document.createElement('img');
    preview.className = 'image-preview__image';
    toolbar.append(caption, closeButton);
    dialog.append(toolbar, preview);
    document.body.append(dialog);
    closeButton.addEventListener('click', closePreview);
    dialog.addEventListener('cancel', event => { event.preventDefault(); closePreview(); });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom)) closePreview();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('has-image-preview');
      closing = false;
      preview.removeAttribute('src');
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    });
  }

  // 制作資料の通常リンクをモーダル表示へ拡張。
  document.addEventListener('click', event => {
    const link = event.target.closest?.('.portfolio-case-figure a[href]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!('HTMLDialogElement' in window)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!dialog) createPreview();
    if (dialog.open) return;
    const source = link.querySelector('img');
    if (!source) return;
    opener = link;
    preview.src = link.href;
    preview.alt = source.alt;
    caption.textContent = link.closest('figure').querySelector('figcaption')?.firstChild?.textContent.trim() || '制作資料';
    document.documentElement.classList.add('has-image-preview');
    window.dispatchEvent(new Event('portfolio:modal-open'));
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
    if (!reducedMotion.matches) dialog.animate([
      { opacity: 0, transform: 'translateY(20px) scale(.97)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
  }, true);
})();
