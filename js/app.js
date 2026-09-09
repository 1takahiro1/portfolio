/**
 * HTMLの見出しを文字単位のアニメーションに変換します。
 * 見出しを変更するときは HTML 内の文字列だけを書き換えてください。
 * animation-runtime.js は参照サイトの配信済みアニメーションとライブラリです。
 */
(() => {
  window.portfolioRootURL = new URL('../', document.currentScript.src).href;
  // 埋め込み画像は file:// でもWebGLのテクスチャとして読み込めます。
  window.portfolioTextureURL = path => window.portfolioFlowerTextures?.[path]
    ?? new URL(path, window.portfolioRootURL).href;
  // ヘッダーは画面遷移後も残るため、現在の階層に左右されないURLへ変換。
  document.querySelectorAll('.l-header a[href]').forEach(link => {
    link.href = new URL(link.getAttribute('href'), document.baseURI).href;
  });
  // file:// ではHTMLのfetchが制限されるため、ページ移動は通常リンクを使用。
  // 波紋のWebGLアニメーションは埋め込み画像で両方の開き方に対応。
  if (location.protocol === 'file:') {
    document.documentElement.classList.add('is-file-preview');
    document.querySelectorAll('a').forEach(link => {
      link.setAttribute('data-barba-prevent', '');
    });
  }
  const selector = '[data-page-title], [data-page-title02], [data-footer-type]';

  function prepareTitles(root = document) {
    const elements = [...root.querySelectorAll(selector)];
    if (root.matches?.(selector)) elements.unshift(root);
    for (const element of elements) {
      if (element.querySelector('.hide')) continue;
      const text = element.textContent.trim();
      const fragment = document.createDocumentFragment();
      for (const character of [...text]) {
        const mask = document.createElement('span');
        mask.className = character === ' ' ? 'hide u-space' : 'hide';
        const letter = document.createElement('span');
        letter.className = 'show';
        letter.textContent = character === ' ' ? '' : character;
        mask.append(letter);
        fragment.append(mask);
      }
      element.replaceChildren(fragment);
    }
  }

  function updateNavigation() {
    const path = new URL(location.href).pathname;
    const section = path.includes('/selected/') ? 'selected' : path.includes('/about/') ? 'about' : '';
    document.querySelectorAll('.l-header [data-nav]').forEach(item => {
      const current = item.dataset.nav === section;
      item.classList.toggle('is-current', current);
      const link = item.querySelector('a');
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  updateNavigation();
  window.addEventListener('popstate', updateNavigation);
  prepareTitles();
  // ページ遷移で読み込まれたHTMLにも、同じ見出し処理を適用します。
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          prepareTitles(node);
          if (node.matches('[data-barba="container"]') || node.querySelector('[data-barba="container"]')) updateNavigation();
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
})();

/* FVとグレーの本文の境界がヘッダーに届いたら、背景と文字色を切り替える。 */
(() => {
  const header = document.querySelector('.l-header');
  if (!header) return;
  let frame = 0;
  function update() {
    frame = 0;
    // Barbaの遷移中は新旧のページがあるため、新しく追加されたページを見る。
    const pages = document.querySelectorAll('[data-barba="container"]');
    const hero = pages[pages.length - 1]?.querySelector('.p-home-mv');
    header.classList.toggle('is-over-hero', !!hero && hero.getBoundingClientRect().bottom > header.getBoundingClientRect().height);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  // ページ内部のスクロールと通常のwindowスクロールの両方に対応。
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
      node.nodeType === Node.ELEMENT_NODE && (node.matches('[data-barba="container"]') || node.querySelector('[data-barba="container"]'))
    ))) schedule();
  }).observe(document.body, { childList: true, subtree: true });
  update();
})();

/* 対応領域の図解アニメーション。画面内だけ再生し、ページ遷移時に監視を更新。 */
(() => {
  let observer;
  window.initServiceMotion = () => {
    observer?.disconnect();
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('is-visible', entry.isIntersecting);
    }, { threshold: 0.15 });
    document.querySelectorAll('.service-motion').forEach(stage => observer.observe(stage));
  };
})();

/* 開幕だけを多層化。挨拶の文字アニメーションは従来のタイミングを維持。 */
window.playPortfolioOpening = gsap => {
  const overlay = document.querySelector('.c-loading');
  if (!overlay) return;
  const top = overlay.querySelector('.c-loading__top');
  const bottom = overlay.querySelector('.c-loading__bottom');
  const widths = [8, 5, 12, 7, 18, 18, 7, 12, 5, 8];
  overlay.classList.add('c-loading--layered');
  for (const parent of [top, bottom]) {
    parent.replaceChildren(...widths.map(width => {
      const panel = document.createElement('div');
      panel.className = 'c-loading__line';
      panel.style.width = `${width}%`;
      return panel;
    }));
  }
  const rear = ['top', 'bottom'].map(side => {
    const layer = document.createElement('div');
    layer.className = `c-loading-depth c-loading-depth--${side}`;
    layer.setAttribute('aria-hidden', 'true');
    overlay.prepend(layer);
    return layer;
  });
  const panelsTop = [...top.children], panelsBottom = [...bottom.children];
  const letters = overlay.querySelectorAll('.c-loading__text span');
  const even = overlay.querySelectorAll('.c-loading__text span:nth-of-type(2n)');
  const odd = overlay.querySelectorAll('.c-loading__text span:nth-of-type(2n+1)');
  const centerDelay = index => Math.abs(index - 4.5) * .075;
  const timeline = gsap.timeline({ onComplete: () => { window.loading = true; } });
  timeline.to(letters, { y: '0%', duration: 1.8, ease: 'power4.inOut', stagger: { from: 'center', each: .02 } })
    .to(even, { y: '-100%', delay: .25, duration: 1.4, ease: 'power4.inOut', stagger: { from: 'center', each: .02 } })
    .to(odd, { y: '100%', duration: 1.4, ease: 'power4.inOut', stagger: { from: 'center', each: .02 } }, '<')
    .addLabel('opening', '<0.6')
    .call(() => overlay.classList.add('is-opening'), [], 'opening')
    // まず浅い段差を作り、細いスリットと奥の幕を見せる。
    .to(panelsTop, { yPercent: index => -(5 + (index % 3) * 5), duration: .5, ease: 'power3.inOut', stagger: centerDelay }, 'opening')
    .to(panelsBottom, { yPercent: index => 5 + ((index + 1) % 3) * 5, duration: .5, ease: 'power3.inOut', stagger: centerDelay }, 'opening+=0.06')
    // 中央から外側へ、上下で位相をずらしてパネルを引き抜く。
    .to(panelsTop, { yPercent: -101, duration: 1.15, ease: 'expo.inOut', stagger: index => centerDelay(index) + (index % 2) * .06 }, 'opening+=0.55')
    .to(panelsBottom, { yPercent: 101, duration: 1.2, ease: 'expo.inOut', stagger: index => centerDelay(index) + ((index + 1) % 2) * .06 }, 'opening+=0.64')
    .to(rear[0], { yPercent: -101, duration: 1.25, ease: 'power4.inOut' }, 'opening+=0.77')
    .to(rear[1], { yPercent: 101, duration: 1.25, ease: 'power4.inOut' }, 'opening+=0.84')
    .set(overlay, { pointerEvents: 'none' }, 'opening+=0.85')
    .set(overlay, { visibility: 'hidden' });
};

/* フッター文字は通常表示を基本とし、実際に画面に入った際だけ登場演出。 */
(() => {
  if (!('IntersectionObserver' in window)) return;
  const prepared = new WeakSet();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (motion.matches || !entry.target.animate) continue;
      entry.target.querySelectorAll('.footer-letter').forEach((letter, index) => {
        const animation = letter.animate([
          { opacity: 0, transform: 'translateY(110%) rotate(7deg)' },
          { opacity: 1, transform: 'translateY(0) rotate(0deg)' }
        ], { duration: 1250, delay: index * 65, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' });
        active.add(animation);
        animation.onfinish = animation.oncancel = () => active.delete(animation);
      });
    }
  }, { threshold: .15 });
  const words = root => [
    ...(root.matches?.('.l-footer__big-type') ? [root] : []),
    ...root.querySelectorAll('.l-footer__big-type')
  ];
  function prepare(root) {
    for (const word of words(root)) {
      if (prepared.has(word)) continue;
      prepared.add(word);
      const label = word.textContent.trim();
      word.setAttribute('aria-label', label);
      word.replaceChildren(...Array.from(label, character => {
        const letter = document.createElement('span');
        letter.className = 'footer-letter';
        letter.textContent = character;
        letter.setAttribute('aria-hidden', 'true');
        return letter;
      }));
      const footer = word.closest('.l-footer');
      footer?.addEventListener('pointermove', event => {
        if (motion.matches || event.pointerType !== 'mouse') return;
        const rect = footer.getBoundingClientRect();
        footer.style.setProperty('--footer-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
        footer.style.setProperty('--footer-y', `${(event.clientY - rect.top) / rect.height * 100}%`);
      });
      observer.observe(word);
    }
  }
  prepare(document);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) words(node).forEach(word => observer.unobserve(word));
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) prepare(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
  motion.addEventListener('change', () => {
    if (motion.matches) [...active].forEach(animation => animation.cancel());
  });
})();
