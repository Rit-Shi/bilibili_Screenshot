importScripts('utils.js');

const OFFSCREEN_DOCUMENT = 'offscreen.html';
let captureInProgress = false;

chrome.action.onClicked.addListener(captureCurrentVideo);
chrome.commands.onCommand.addListener((command) => {
  if (command === 'pause-and-capture') captureCurrentVideo();
});

async function captureCurrentVideo(tab) {
  if (captureInProgress) return;
  captureInProgress = true;
  let activeTab;
  try {
    activeTab = tab?.id
      ? tab
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

    if (!activeTab?.id || !isSupportedUrl(activeTab.url)) {
      throw new Error('请先打开哔哩哔哩或抖音视频、图文页面');
    }

    const frame = await chrome.tabs.sendMessage(activeTab.id, { type: 'PREPARE_CAPTURE' });
    if (!frame?.ok) throw new Error(frame?.error || '没有找到正在显示的视频或图文');

    if (frame.mode === 'direct-download') {
      await chrome.downloads.download({
        url: frame.url,
        filename: captureUtils.makeScreenshotFilename(
          frame.title,
          frame.platform,
          captureUtils.inferImageExtension(frame.url)
        ),
        saveAs: false
      });
      await chrome.tabs.sendMessage(activeTab.id, { type: 'CAPTURE_FINISHED', ok: true });
      return;
    }

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

    await chrome.downloads.download({
      url: result.dataUrl,
      filename: captureUtils.makeScreenshotFilename(frame.title, frame.platform),
      saveAs: false
    });
    await chrome.tabs.sendMessage(activeTab.id, { type: 'CAPTURE_FINISHED', ok: true });
  } catch (error) {
    console.error('[Web Media Capture]', error);
    if (activeTab?.id) {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'CAPTURE_FINISHED',
        ok: false,
        error: error.message
      }).catch(() => {});
    }
  } finally {
    captureInProgress = false;
  }
}

function isSupportedUrl(url = '') {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'www.bilibili.com' || hostname === 'www.douyin.com';
  } catch {
    return false;
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
