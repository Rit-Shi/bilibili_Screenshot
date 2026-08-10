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
  const scaleX = image.naturalWidth / viewport.width;
  const scaleY = image.naturalHeight / viewport.height;
  const sx = Math.round(rect.x * scaleX);
  const sy = Math.round(rect.y * scaleY);
  const sw = Math.max(1, Math.round(rect.width * scaleX));
  const sh = Math.max(1, Math.round(rect.height * scaleY));

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(sw, image.naturalWidth - sx);
  canvas.height = Math.min(sh, image.naturalHeight - sy);
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(image, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const blobUrl = URL.createObjectURL(blob);
  return blobUrl;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取标签页截图'));
    image.src = url;
  });
}
