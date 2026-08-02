# Portfolio Gallery Site

一个用于展示图片和视频作品的静态网站框架。页面包含：

- 左上角头像与个人标识
- 中央图片和视频叠卡
- 拖动顶部媒体卡片，将它移到整组卡片的底层
- 中央区域不显示翻页按钮或分页圆点
- 可使用鼠标拖动、滚轮、触摸或键盘浏览的循环项目画廊
- 项目卡片沿轻微弧线排列，并带有惯性缓动与自动吸附
- 点击项目卡片后切换对应媒体组
- 明暗主题、移动端布局与减少动态效果支持

## 添加内容

在 `app.js` 顶部的 `projects` 数组中填写项目数据：

```js
{
  id: "project-name",
  title: "项目名称",
  cover: "./assets/cover.jpg",
  media: [
    { type: "image", src: "./assets/image.jpg", alt: "图片说明" },
    { type: "video", src: "./assets/video.mp4", poster: "./assets/poster.jpg", alt: "视频说明" },
  ],
}
```

使用本地静态服务器打开 `index.html` 即可预览。
