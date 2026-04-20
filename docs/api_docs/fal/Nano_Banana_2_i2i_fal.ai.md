---
title: "Nano Banana 2 Edit API: AI Image Editing | fal.ai"
url: "https://fal.ai/models/fal-ai/nano-banana-2/edit/api"
captured_at: "2026-03-08T20:36:07.869Z"
---
# Nano Banana 2 图像编辑模型使用指南

## 快速概览
- **4× 更快**、**成本更低**、**质量更好**  
- 支持 **文本驱动的图像编辑**（image-to-image）  
- 由 Google 提供，托管在 fal 平台  

---

## 1. 安装与配置

### 安装客户端
```bash
npm install --save @fal-ai/client
```

### 设置 API Key
```bash
export FAL_KEY="YOUR_API_KEY"
```

---

## 2. 最小可运行示例

```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
  input: {
    prompt: "make a photo of the man driving the car down the california coastline",
    image_urls: [
      "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png",
      "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input-2.png"
    ]
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});

console.log(result.data);      // 编辑后的图片数组
console.log(result.requestId); // 请求 ID
```

---

## 3. 队列模式（长任务）

### 提交任务
```js
const { request_id } = await fal.queue.submit("fal-ai/nano-banana-2/edit", {
  input: { /* 同上 */ },
  webhookUrl: "https://optional.webhook.url/for/results",
});
```

### 查询状态
```js
const status = await fal.queue.status("fal-ai/nano-banana-2/edit", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
```

### 获取结果
```js
const result = await fal.queue.result("fal-ai/nano-banana-2/edit", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b"
});
```

---

## 4. 文件上传支持

- **Data URI（Base64）**：小文件可直接内嵌  
- **公开 URL**：需保证可跨域访问  
- **自动上传**：传入 `File` 或 `Data` 对象即可自动上传并返回 URL  

```js
const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
```

---

## 5. 输入模式（Input Schema）

| 字段 | 类型 | 默认值 | 说明 |
| ---- | ---- | -------- | ---- |
| prompt | string | *必填* | 编辑提示词 |
| image_urls | list<string> | *必填* | 原图 URL 列表 |
| num_images | integer | 1 | 生成图片数量 |
| aspect_ratio | enum | auto | 21:9 / 16:9 / 3:2 / 4:3 / 5:4 / 1:1 / 4:5 / 3:4 / 2:3 / 9:16 |
| output_format | enum | png | jpeg / png / webp |
| resolution | enum | 1K | 0.5K / 1K / 2K / 4K |
| safety_tolerance | enum | 4 | 1（最严）~ 6（最松） |
| limit_generations | boolean | true | 每轮仅生成 1 张图 |
| enable_web_search | boolean | false | 允许联网搜索参考 |

---

## 6. 输出模式（Output Schema）

```json
{
  "images": [
    {
      "url": "https://...",
      "content_type": "image/png",
      "file_name": "nano-banana-2-edit-output.png",
      "file_size": 123456,
      "width": 1024,
      "height": 1024
    }
  ],
  "description": ""
}
```

---

## 7. 注意事项
1. **客户端安全**：浏览器或移动端切勿暴露 `FAL_KEY`，应通过后端代理。  
2. **长任务**：建议使用队列 + Webhook，避免阻塞。  
3. **文件大小**：Base64 内嵌大文件会影响性能，优先使用 URL 或 fal 存储。