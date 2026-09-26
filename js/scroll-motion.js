/** このサイト専用のスクロール制御。位置と履歴はブラウザに任せる。 */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  // 入力距離を70%に抑え、150msの応答で目標位置に追いつく。
  const settings = { wheelMultiplier: .7, responseMs: 150 };
  let destination = scrollY, position = scrollY, frame = 0, previousTime = 0, lastWritten = scrollY;
  const limit = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clamp = value => Math.max(0, Math.min(limit(), value));
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    destination = position = lastWritten = scrollY;
  }
  function tick(time) {
    const elapsed = previousTime ? Math.min(50, time - previousTime) : 16.67;
    previousTime = time;
    destination = clamp(destination);
    const distance = destination - position;
    // 小数位置を保持し、整数に丸めるブラウザでも終端で止まらないようにする。
    position = Math.abs(distance) < 1 ? destination : position + distance * (1 - Math.exp(-elapsed / settings.responseMs));
    const next = position;
    window.scrollTo({ top: next, behavior: 'instant' });
    lastWritten = scrollY;
    if (Math.abs(destination - scrollY) <= 1) {
      window.scrollTo({ top: destination, behavior: 'instant' });
      stop();
      return;
    }
    if (Math.abs(next - scrollY) > 2) {
      stop();
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function nativeRegion(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('dialog, input, textarea, select, [contenteditable="true"], [data-native-scroll]')) return true;
    // 埋め込まれたスクロール領域を奪わない（端まで来た場合もブラウザに任せる）。
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) return true;
    }
    return false;
  }
  addEventListener('wheel', event => {
    if (!desktop.matches || reduce.matches || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY || nativeRegion(event.target) || document.querySelector('dialog[open]')) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const delta = event.deltaY * unit * settings.wheelMultiplier;
    if (!limit()) return;
    event.preventDefault();
    if (document.querySelector('.site-opening')) { stop(); return; }
    if (!frame) destination = position = scrollY;
    destination = clamp(destination + delta);
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: false });
  // キーボード・タッチ・スクロールバー・フォーカス移動が始まったら慣性を止める。
  addEventListener('keydown', event => {
    if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Enter','Escape'].includes(event.key)) stop();
  });
  ['pointerdown','touchstart','focusin','pagehide','pageshow','resize','portfolio:modal-open','portfolio:opening-open'].forEach(type => addEventListener(type, stop, { passive: true }));
  document.addEventListener('visibilitychange', stop);
  reduce.addEventListener('change', stop);
  desktop.addEventListener('change', stop);
  addEventListener('scroll', () => {
    // 履歴復帰、アンカー、ブラウザによるスクロールを上書きしない。
    if (frame && Math.abs(scrollY - lastWritten) > 2) stop();
  }, { passive: true });

  // スクロール位置に同期する演出。カード外枠を計測し、内側だけを動かす。
  const hero = document.querySelector('.hero');
  const background = hero?.querySelector('.hero__background');
  const cards = Array.from(document.querySelectorAll('.expertise__card'), wrapper => ({ wrapper, body: wrapper.querySelector('.expertise__card-body') }));
  let motionFrame = 0;
  function renderMotion() {
    motionFrame = 0;
    const heroBounds = hero?.getBoundingClientRect();
    const positions = cards.map(card => card.wrapper.getBoundingClientRect().top);
    if (background) background.style.translate = reduce.matches ? '' : `0 ${Math.max(0, Math.min(heroBounds.height, -heroBounds.top)) * .12}px`;
    cards.forEach((card, index) => {
      if (!card.body) return;
      if (reduce.matches) { card.body.style.transform = ''; card.body.style.opacity = ''; return; }
      const progress = Math.max(0, Math.min(1, (innerHeight * .9 - positions[index]) / (innerHeight * .55)));
      const remaining = 1 - progress;
      const travel = desktop.matches ? 64 : 24;
      const angle = desktop.matches ? remaining * (index % 2 ? -2 : 2) : 0;
      card.body.style.transform = `translateY(${remaining * travel}px) rotate(${angle}deg) scale(${1 - remaining * .04})`;
      card.body.style.opacity = String(.35 + progress * .65);
    });
  }
  const scheduleMotion = () => { if (!motionFrame) motionFrame = requestAnimationFrame(renderMotion); };
  ['scroll','resize','pageshow'].forEach(type => addEventListener(type, scheduleMotion, { passive: true }));
  reduce.addEventListener('change', scheduleMotion);
  desktop.addEventListener('change', scheduleMotion);
  renderMotion();
})();
