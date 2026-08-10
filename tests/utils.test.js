const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateCrop,
  calculateRenderedMediaRect,
  makeScreenshotFilename
} = require('../utils.js');

test('按设备像素比例计算视频裁剪区域', () => {
  assert.deepEqual(
    calculateCrop(
      2880,
      1800,
      { x: 100, y: 50, width: 800, height: 450 },
      { width: 1440, height: 900 }
    ),
    { sx: 200, sy: 100, width: 1600, height: 900 }
  );
});

test('裁剪范围不会超过截图边界', () => {
  assert.deepEqual(
    calculateCrop(
      1000,
      800,
      { x: 900, y: 700, width: 200, height: 200 },
      { width: 1000, height: 800 }
    ),
    { sx: 900, sy: 700, width: 100, height: 100 }
  );
});

test('去除 contain 模式产生的上下黑边', () => {
  assert.deepEqual(
    calculateRenderedMediaRect(
      { left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 },
      1920,
      1080,
      'contain',
      '50% 50%'
    ),
    { left: 0, top: 218.75, right: 1000, bottom: 781.25, width: 1000, height: 562.5 }
  );
});

test('去除 contain 模式产生的左右黑边', () => {
  assert.deepEqual(
    calculateRenderedMediaRect(
      { left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 },
      1440,
      1080,
      'contain',
      '50% 50%'
    ),
    { left: 200, top: 0, right: 1400, bottom: 900, width: 1200, height: 900 }
  );
});

test('cover 模式只返回元素内可见画面', () => {
  assert.deepEqual(
    calculateRenderedMediaRect(
      { left: 10, top: 20, right: 1010, bottom: 1020, width: 1000, height: 1000 },
      1920,
      1080,
      'cover',
      '50% 50%'
    ),
    { left: 10, top: 20, right: 1010, bottom: 1020, width: 1000, height: 1000 }
  );
});

test('清理标题中的标签和非法文件名字符', () => {
  assert.equal(
    makeScreenshotFilename('【4K】测试：第一集:预告_哔哩哔哩'),
    'Bilibili截图/测试：第一集_预告_哔哩哔哩.png'
  );
});

test('空标题回退为 bilibili', () => {
  assert.equal(makeScreenshotFilename('【4K】'), 'Bilibili截图/bilibili.png');
});

test('抖音截图保存到独立目录', () => {
  assert.equal(
    makeScreenshotFilename('测试视频', 'douyin'),
    '抖音截图/测试视频.png'
  );
});
