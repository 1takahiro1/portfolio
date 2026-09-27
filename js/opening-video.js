/** 添付映像をそのまま再生する、トップページ専用のオープニング。 */
(() => {
  const siteRoot = new URL('../', document.currentScript.src);
  const mediaRoot = new URL('media/opening/', siteRoot);
  function isReturningWithinSite() {
    const arrival = new URL(location.href);
    const internalLink = arrival.searchParams.get('_portfolio_return') === '1';
    if (internalLink) {
      // 到着したら目印を消す。リロード・ブックマークからの再訪に引き継がない。
      arrival.searchParams.delete('_portfolio_return');
      try { history.replaceState(history.state, '', arrival.href); } catch {}
    }
    const navigation = performance.getEntriesByType('navigation')[0];
    // リロードでは、直前に下層ページから来ていても必ず再生する。
    if (navigation?.type === 'reload') return false;
    // 戻る・進むや、サイト内リンクでトップへ戻った場合だけ省略する。
    if (internalLink || navigation?.type === 'back_forward') return true;
    return !!document.referrer && document.referrer.startsWith(siteRoot.href);
  }
  window.playPortfolioOpening = function () {
    if (document.querySelector('[data-page-root]')?.dataset.page !== 'home') return Promise.resolve();
    if (isReturningWithinSite()) return Promise.resolve();
    return new Promise(resolve => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)');
      const previousFocus = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'site-opening';
      dialog.setAttribute('aria-label', 'ポートフォリオのオープニング映像');
      dialog.innerHTML = `
        <video class="site-opening__video" playsinline preload="auto" aria-label="UIデザインを形にするオープニング映像"></video>
        <div class="site-opening__toolbar">
          <div class="site-opening__playback">
            <button type="button" data-intro-resume hidden>再生</button>
            <button type="button" class="site-opening__sound" data-intro-mute aria-label="BGMをオンにする" aria-pressed="false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>
              <span>音をオン</span>
            </button>
          </div>
          <button type="button" data-intro-skip>スキップ <span aria-hidden="true">↗</span></button>
        </div>
        <p class="site-opening__status" role="status" aria-live="polite"></p>
        <div class="site-opening__progress" aria-hidden="true"><span></span></div>`;
      const video = dialog.querySelector('video');
      const resumeButton = dialog.querySelector('[data-intro-resume]');
      const muteButton = dialog.querySelector('[data-intro-mute]');
      const status = dialog.querySelector('.site-opening__status');
      const progress = dialog.querySelector('.site-opening__progress span');
      let closing = false, started = false, pending = false, slowTimer;
      // 再生中のリサイズではソースを切り替えず、映像・BGMの頭出しを防ぐ。
      video.src = new URL(matchMedia('(max-width: 767px) and (orientation: portrait)').matches ? 'mobile.mp4' : 'desktop.mp4', mediaRoot).href;
      video.muted = true;
      const syncControls = () => {
        resumeButton.hidden = !video.paused || pending || closing;
        resumeButton.textContent = started ? '再生を続ける' : '再生';
        muteButton.querySelector('span').textContent = video.muted ? '音をオン' : '音をオフ';
        muteButton.setAttribute('aria-pressed', String(!video.muted));
        muteButton.setAttribute('aria-label', video.muted ? 'BGMをオンにする' : 'BGMをオフにする');
      };
      const clearSlowTimer = () => { clearTimeout(slowTimer); };
      const showWaiting = () => {
        clearSlowTimer();
        status.textContent = '映像を読み込んでいます…';
        slowTimer = setTimeout(() => {
          if (!closing) status.textContent = '読み込みに時間がかかっています。スキップしてサイトをご覧いただけます。';
        }, 12000);
      };
      const removeOpening = () => {
        clearSlowTimer();
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onPageHide);
        if (dialog.open) dialog.close();
        dialog.remove();
        document.documentElement.classList.remove('has-site-opening');
        video.removeAttribute('src'); video.load();
        const target = previousFocus instanceof HTMLElement && previousFocus !== document.body ? previousFocus : document.querySelector('.site-header__logo a, a.site-header__logo');
        target?.focus({ preventScroll: true });
        resolve();
      };
      function finish(immediate = false) {
        if (closing) return;
        closing = true;
        clearSlowTimer();
        video.muted = true;
        video.pause();
        if (immediate || reduce.matches || !dialog.animate) { removeOpening(); return; }
        const fade = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
        fade.finished.catch(() => {}).finally(removeOpening);
      }
      function onVisibility() {
        // 他のタブに移ったら音も映像も停止。戻った後は明示的に再開する。
        if (document.hidden && started && !closing) video.pause();
      }
      function onPageHide() { finish(true); }
      async function start(withSound, allowMutedFallback = false) {
        if (pending || closing) return;
        pending = true;
        video.muted = !withSound;
        syncControls();
        showWaiting();
        try {
          // 音声付きの自動再生を優先し、ブラウザに拒否された場合だけ無音で再試行。
          // autoplay属性との二重起動を避け、再生開始はこの処理にまとめる。
          try {
            await video.play();
          } catch (error) {
            if (closing || !allowMutedFallback || !withSound || error.name !== 'NotAllowedError' || video.error) throw error;
            video.muted = true;
            syncControls();
            await video.play();
          }
          if (closing) { video.pause(); return; }
          started = true;
          dialog.classList.add('is-playing');
          syncControls();
        } catch (error) {
          if (!closing) {
            clearSlowTimer();
            status.textContent = video.error ? '映像を読み込めませんでした。スキップしてサイトをご覧ください。' : '自動再生できませんでした。「再生」を押してください。';
          }
        } finally { pending = false; if (!closing) syncControls(); }
      }
      resumeButton.addEventListener('click', () => start(!video.muted));
      muteButton.addEventListener('click', () => { video.muted = !video.muted; syncControls(); });
      dialog.querySelector('[data-intro-skip]').addEventListener('click', () => finish());
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
      video.addEventListener('ended', () => finish());
      video.addEventListener('playing', () => { clearSlowTimer(); status.textContent = ''; syncControls(); });
      video.addEventListener('pause', () => { clearSlowTimer(); if (!closing) { status.textContent = ''; syncControls(); } });
      video.addEventListener('waiting', () => { if (!closing && !video.paused) showWaiting(); });
      video.addEventListener('timeupdate', () => {
        progress.style.transform = `scaleX(${video.duration ? Math.min(1, video.currentTime / video.duration) : 0})`;
      });
      video.addEventListener('error', () => {
        if (closing) return;
        clearSlowTimer();
        status.textContent = '映像を読み込めませんでした。スキップしてサイトをご覧ください。';
        resumeButton.disabled = true;
      });
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onPageHide);
      document.body.append(dialog);
      window.dispatchEvent(new Event('portfolio:opening-open'));
      document.documentElement.classList.add('has-site-opening');
      try { dialog.showModal(); start(true, true); }
      catch { finish(true); }
    });
  };
})();
