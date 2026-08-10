const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCrop, makeScreenshotFilename } = require('../utils.js');

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

test('清理标题中的标签和非法文件名字符', () => {
  assert.equal(
    makeScreenshotFilename('【4K】测试：第一集:预告_哔哩哔哩'),
    'Bilibili截图/测试：第一集_预告_哔哩哔哩.png'
  );
});

test('空标题回退为 bilibili', () => {
  assert.equal(makeScreenshotFilename('【4K】'), 'Bilibili截图/bilibili.png');
});
