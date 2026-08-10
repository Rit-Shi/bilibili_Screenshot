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

  function makeScreenshotFilename(title, platform = 'bilibili') {
    const cleanTitle = (title || '')
      .replace(/【.*?】/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 80) || 'bilibili';

    const folder = platform === 'douyin' ? '抖音截图' : 'Bilibili截图';
    return `${folder}/${cleanTitle}.png`;
  }

  function calculateRenderedMediaRect(
    elementRect,
    intrinsicWidth,
    intrinsicHeight,
    objectFit = 'fill',
    objectPosition = '50% 50%'
  ) {
    if (!intrinsicWidth || !intrinsicHeight || !elementRect.width || !elementRect.height) {
      return {
        left: elementRect.left,
        top: elementRect.top,
        right: elementRect.right,
        bottom: elementRect.bottom,
        width: elementRect.width,
        height: elementRect.height
      };
    }

    let scaleX = elementRect.width / intrinsicWidth;
    let scaleY = elementRect.height / intrinsicHeight;

    if (objectFit === 'contain') {
      scaleX = scaleY = Math.min(scaleX, scaleY);
    } else if (objectFit === 'cover') {
      scaleX = scaleY = Math.max(scaleX, scaleY);
    } else if (objectFit === 'none') {
      scaleX = scaleY = 1;
    } else if (objectFit === 'scale-down') {
      scaleX = scaleY = Math.min(1, scaleX, scaleY);
    }

    const renderedWidth = intrinsicWidth * scaleX;
    const renderedHeight = intrinsicHeight * scaleY;
    const [positionX, positionY] = parseObjectPosition(objectPosition);
    const renderedLeft = elementRect.left + (elementRect.width - renderedWidth) * positionX;
    const renderedTop = elementRect.top + (elementRect.height - renderedHeight) * positionY;

    const left = Math.max(elementRect.left, renderedLeft);
    const top = Math.max(elementRect.top, renderedTop);
    const right = Math.min(elementRect.right, renderedLeft + renderedWidth);
    const bottom = Math.min(elementRect.bottom, renderedTop + renderedHeight);

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  }

  function parseObjectPosition(value) {
    const keywords = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
    const parts = String(value || '50% 50%').trim().split(/\s+/);
    if (parts.length === 1) parts.push('50%');

    return parts.slice(0, 2).map((part) => {
      if (part in keywords) return keywords[part];
      if (part.endsWith('%')) {
        const percentage = Number.parseFloat(part);
        if (Number.isFinite(percentage)) return percentage / 100;
      }
      return 0.5;
    });
  }

  root.captureUtils = {
    calculateCrop,
    calculateRenderedMediaRect,
    makeScreenshotFilename
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.captureUtils;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
