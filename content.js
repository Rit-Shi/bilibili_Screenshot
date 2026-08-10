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
  const videos = [...document.querySelectorAll('video')]
    .filter((video) => {
      const rect = video.getBoundingClientRect();
      const style = getComputedStyle(video);
      return rect.width > 100 && rect.height > 100 && style.display !== 'none' && style.visibility !== 'hidden';
    })
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.width * br.height - ar.width * ar.height;
    });

  const video = videos[0];
  if (!video) return { ok: false, error: '没有找到可见的视频播放器' };

  video.pause();
  const elementRect = video.getBoundingClientRect();
  const videoStyle = getComputedStyle(video);
  const rect = captureUtils.calculateRenderedMediaRect(
    elementRect,
    video.videoWidth,
    video.videoHeight,
    videoStyle.objectFit,
    videoStyle.objectPosition
  );
  const clipped = {
    left: Math.max(0, rect.left),
    top: Math.max(0, rect.top),
    right: Math.min(innerWidth, rect.right),
    bottom: Math.min(innerHeight, rect.bottom)
  };

  if (clipped.right <= clipped.left || clipped.bottom <= clipped.top) {
    return { ok: false, error: '视频不在当前可见区域内' };
  }

  document.documentElement.dataset.biliCapture = 'true';
  ensureCaptureStyle();
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
    title: document.title.replace(/_哔哩哔哩_bilibili$/i, '').trim()
  };
}

function ensureCaptureStyle() {
  if (document.getElementById('bili-capture-style')) return;
  const style = document.createElement('style');
  style.id = 'bili-capture-style';
  style.textContent = `
    html[data-bili-capture="true"] .bpx-player-control-wrap,
    html[data-bili-capture="true"] .bpx-player-video-info,
    html[data-bili-capture="true"] .bpx-player-toast-wrap,
    html[data-bili-capture="true"] .bilibili-player-video-control-wrap,
    html[data-bili-capture="true"] .bilibili-player-video-toast-wrp,
    html[data-bili-capture="true"] .bili-danmaku-x-guide,
    html[data-bili-capture="true"] .bpx-player-dm-tip-wrap {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function restoreControls() {
  delete document.documentElement.dataset.biliCapture;
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
