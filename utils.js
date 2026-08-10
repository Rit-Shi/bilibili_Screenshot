(function exposeCaptureUtils(root) {
  function calculateCrop(imageWidth, imageHeight, rect, viewport) {
    if (!imageWidth || !imageHeight || !viewport?.width || !viewport?.height) {
      throw new Error('无效的截图或视口尺寸');
    }

    const scaleX = imageWidth / viewport.width;
    const scaleY = imageHeight / viewport.height;
    const sx = Math.max(0, Math.round(rect.x * scaleX));
    const sy = Math.max(0, Math.round(rect.y * scaleY));
    const requestedWidth = Math.max(1, Math.round(rect.width * scaleX));
    const requestedHeight = Math.max(1, Math.round(rect.height * scaleY));

    return {
      sx,
      sy,
      width: Math.max(1, Math.min(requestedWidth, imageWidth - sx)),
      height: Math.max(1, Math.min(requestedHeight, imageHeight - sy))
    };
  }

  function makeScreenshotFilename(title) {
    const cleanTitle = (title || '')
      .replace(/【.*?】/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 80) || 'bilibili';

    return `Bilibili截图/${cleanTitle}.png`;
  }

  root.captureUtils = { calculateCrop, makeScreenshotFilename };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.captureUtils;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
