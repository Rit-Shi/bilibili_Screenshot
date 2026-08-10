const OFFSCREEN_DOCUMENT = 'offscreen.html';

chrome.action.onClicked.addListener(captureCurrentVideo);
chrome.commands.onCommand.addListener((command) => {
  if (command === 'pause-and-capture') captureCurrentVideo();
});

async function captureCurrentVideo(tab) {
  let activeTab;
  try {
    activeTab = tab?.id
      ? tab
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

    if (!activeTab?.id || !activeTab.url?.startsWith('https://www.bilibili.com/')) {
      throw new Error('请先打开哔哩哔哩视频页面');
    }

    const frame = await chrome.tabs.sendMessage(activeTab.id, { type: 'PREPARE_CAPTURE' });
    if (!frame?.ok) throw new Error(frame?.error || '没有找到正在显示的视频');

    // 等两帧，让播放器控件在截图前完成隐藏。
    await new Promise((resolve) => setTimeout(resolve, 80));
    const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });

    await ensureOffscreenDocument();
    const result = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'CROP_IMAGE',
      dataUrl,
      rect: frame.rect,
      viewport: frame.viewport
    });

    if (!result?.ok) throw new Error(result?.error || '截图处理失败');

    const cleanTitle = (frame.title || 'bilibili')
      .replace(/【.*?】/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 80);

    const response = await fetch(result.dataUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    await chrome.downloads.download({
      url: blobUrl,
      filename: `Bilibili截图/${cleanTitle}.png`,
      saveAs: false
    });
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    await chrome.tabs.sendMessage(activeTab.id, { type: 'CAPTURE_FINISHED', ok: true });
  } catch (error) {
    console.error('[Bilibili Capture]', error);
    if (activeTab?.id) {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'CAPTURE_FINISHED',
        ok: false,
        error: error.message
      }).catch(() => {});
    }
  }
}

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  if (contexts.length) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT,
    reasons: ['BLOBS'],
    justification: '裁剪当前标签页截图并生成 PNG 图片'
  });
}
