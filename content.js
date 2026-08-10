let toastTimer;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PREPARE_CAPTURE') {
    prepareCapture().then(sendResponse);
    return true;
  }

  if (message.type === 'CAPTURE_FINISHED') {
    restoreControls();
    showToast(message.ok ? '截图已保存' : (message.error || '截图失败'), !message.ok);
  }
});

async function prepareCapture() {
  const mediaCandidates = collectMediaCandidates();
  const selected = mediaCandidates[0];
  if (!selected) return { ok: false, error: '没有找到可见的视频或图文' };

  const { element, style } = selected;
  const elementRect = element.getBoundingClientRect();
  const isVideo = element instanceof HTMLVideoElement;
  const rect = captureUtils.calculateRenderedMediaRect(
    elementRect,
    isVideo ? element.videoWidth : element.naturalWidth,
    isVideo ? element.videoHeight : element.naturalHeight,
    style.objectFit,
    style.objectPosition
  );
  const clipped = {
    left: Math.max(0, rect.left),
    top: Math.max(0, rect.top),
    right: Math.min(innerWidth, rect.right),
    bottom: Math.min(innerHeight, rect.bottom)
  };

  if (clipped.right <= clipped.left || clipped.bottom <= clipped.top) {
    return { ok: false, error: `${isVideo ? '视频' : '图文'}不在当前可见区域内` };
  }

  document.documentElement.dataset.videoCapture = 'true';
  ensureCaptureStyle();
  hideOverlays(element, clipped);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  return {
    ok: true,
    rect: {
      x: clipped.left,
      y: clipped.top,
      width: clipped.right - clipped.left,
      height: clipped.bottom - clipped.top
    },
    viewport: { width: innerWidth, height: innerHeight },
    title: cleanPageTitle(document.title),
    platform: location.hostname === 'www.douyin.com' ? 'douyin' : 'bilibili'
  };
}

function collectMediaCandidates() {
  const viewport = { width: innerWidth, height: innerHeight };
  const elements = [...document.querySelectorAll('video')];

  const isDouyinImagePage =
    location.hostname === 'www.douyin.com' &&
    (new URLSearchParams(location.search).has('modal_id') || location.pathname.startsWith('/note/'));
  if (isDouyinImagePage) {
    elements.push(...document.querySelectorAll('img'));
  }

  return elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visibleArea = captureUtils.calculateVisibleArea(
        rect,
        viewport
      );
      const isVideo = element instanceof HTMLVideoElement;
      const intrinsicWidth = isVideo ? element.videoWidth : element.naturalWidth;
      const intrinsicHeight = isVideo ? element.videoHeight : element.naturalHeight;
      const isPlaying = isVideo && !element.paused && !element.ended;
      const isLoginAsset = !isVideo && Boolean(element.closest('#douyin-login-new-id'));
      const score = visibleArea * (isPlaying ? 1.5 : style.objectFit === 'contain' ? 1.2 : 1);

      return {
        element,
        rect,
        style,
        visibleArea,
        intrinsicWidth,
        intrinsicHeight,
        isLoginAsset,
        score
      };
    })
    .filter(({ rect, style, visibleArea, intrinsicWidth, intrinsicHeight, isLoginAsset }) =>
      rect.width > 100 &&
      rect.height > 100 &&
      visibleArea > 10_000 &&
      intrinsicWidth > 200 &&
      intrinsicHeight > 200 &&
      !isLoginAsset &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    )
    .sort((a, b) => b.score - a.score);
}

function hideOverlays(media, rect) {
  const fractions = [0.1, 0.5, 0.9];
  for (const xFraction of fractions) {
    for (const yFraction of fractions) {
      const x = rect.left + (rect.right - rect.left) * xFraction;
      const y = rect.top + (rect.bottom - rect.top) * yFraction;
      for (const element of document.elementsFromPoint(x, y)) {
        if (element === media) break;
        if (element.contains(media) || media.contains(element)) continue;
        element.classList.add('web-media-capture-overlay');
      }
    }
  }
}

function ensureCaptureStyle() {
  if (document.getElementById('bili-capture-style')) return;
  const style = document.createElement('style');
  style.id = 'bili-capture-style';
  style.textContent = `
    html[data-video-capture="true"] .bpx-player-control-wrap,
    html[data-video-capture="true"] .bpx-player-video-info,
    html[data-video-capture="true"] .bpx-player-toast-wrap,
    html[data-video-capture="true"] .bilibili-player-video-control-wrap,
    html[data-video-capture="true"] .bilibili-player-video-toast-wrp,
    html[data-video-capture="true"] .bili-danmaku-x-guide,
    html[data-video-capture="true"] .bpx-player-dm-tip-wrap,
    html[data-video-capture="true"] [data-e2e="player-container"] .xg-center-grid,
    html[data-video-capture="true"] [data-e2e="player-container"] xg-controls,
    html[data-video-capture="true"] [data-e2e="player-container"] .xgplayer-controls,
    html[data-video-capture="true"] [data-e2e="player-container"] .xgplayer-playswitch,
    html[data-video-capture="true"] [data-e2e="player-container"] .player-position-box-bottom,
    html[data-video-capture="true"] [data-e2e="player-container"] .xgplayer-prompt,
    html[data-video-capture="true"] [data-e2e="player-container"] .xgplayer-start,
    html[data-video-capture="true"] [data-e2e="player-container"] .xgplayer-loading,
    html[data-video-capture="true"] .web-media-capture-overlay {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function restoreControls() {
  delete document.documentElement.dataset.videoCapture;
  document.querySelectorAll('.web-media-capture-overlay').forEach((element) => {
    element.classList.remove('web-media-capture-overlay');
  });
}

function cleanPageTitle(title) {
  return title
    .replace(/_哔哩哔哩_bilibili$/i, '')
    .replace(/\s*-\s*抖音$/i, '')
    .trim();
}

function showToast(message, isError = false) {
  let toast = document.getElementById('bili-capture-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bili-capture-toast';
    Object.assign(toast.style, {
      position: 'fixed', right: '24px', top: '24px', zIndex: '2147483647',
      padding: '10px 16px', borderRadius: '8px', color: '#fff',
      font: '14px/1.4 system-ui, sans-serif', boxShadow: '0 4px 16px #0004',
      transition: 'opacity .2s'
    });
    document.documentElement.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = isError ? '#d9363e' : '#00aeec';
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1800);
}
