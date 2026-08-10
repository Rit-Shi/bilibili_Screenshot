chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen' || message.type !== 'CROP_IMAGE') return;
  cropImage(message).then(
    (dataUrl) => sendResponse({ ok: true, dataUrl }),
    (error) => sendResponse({ ok: false, error: error.message })
  );
  return true;
});

async function cropImage({ dataUrl, rect, viewport }) {
  const image = await loadImage(dataUrl);
  const crop = captureUtils.calculateCrop(
    image.naturalWidth,
    image.naturalHeight,
    rect,
    viewport
  );

  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  // Data URL 随消息传递，不需要维护跨上下文 Blob URL 的生命周期。
  return canvas.toDataURL('image/png');
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取标签页截图'));
    image.src = url;
  });
}
