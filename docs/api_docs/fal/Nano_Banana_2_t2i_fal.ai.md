---
title: "Nano Banana 2 API: AI Image Generation | fal.ai"
url: "https://fal.ai/models/fal-ai/nano-banana-2/api"
captured_at: "2026-03-08T20:07:31.429Z"
---
# Nano Banana 2 文本生成图像模型

- 4× 速度提升、成本更低、质量更好
- 支持商业用途
- 支持 API 调用与 Playground 体验

---

## 1. 安装与调用

```bash
npm install --save @fal-ai/client
```

设置环境变量（推荐）  
```bash
export FAL_KEY="YOUR_API_KEY"
```

快速调用示例  
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana-2", {
  input: {
    prompt: "An action shot of a black lab swimming in an inground suburban swimming pool..."
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
```

---

## 2. 认证方式

- **环境变量**：`FAL_KEY`
- **代码内设置**（不推荐前端使用）：
  ```js
  fal.config({ credentials: "YOUR_FAL_KEY" });
  ```

---

## 3. 队列模式（适合长任务）

提交任务  
```js
const { request_id } = await fal.queue.submit("fal-ai/nano-banana-2", {
  input: { prompt: "..." },
  webhookUrl: "https://optional.webhook.url/for/results",
});
```

查询状态  
```js
const status = await fal.queue.status("fal-ai/nano-banana-2", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
```

获取结果  
```js
const result = await fal.queue.result("fal-ai/nano-banana-2", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b"
});
```

---

## 4. 文件处理

- **Base64 Data URI**：直接嵌入，小文件方便
- **公开 URL**：需保证可外链
- **自动上传**：
  ```js
  const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
  const url = await fal.storage.upload(file);
  ```

---

## 5. 输入模式（Input Schema）

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| prompt | string | *必填* | 文本描述 |
| num_images | integer | 1 | 生成张数 |
| seed | integer | — | 随机种子 |
| aspect_ratio | enum | auto | 21:9 / 16:9 / 3:2 / 4:3 / 5:4 / 1:1 / 4:5 / 3:4 / 2:3 / 9:16 |
| output_format | enum | png | jpeg / png / webp |
| safety_tolerance | enum | 4 | 1(最严)-6(最松)，仅 API |
| resolution | enum | 1K | 0.5K / 1K / 2K / 4K |
| limit_generations | boolean | true | 每轮仅生成 1 张，忽略提示词中数量指令 |
| enable_web_search | boolean | false | 允许联网搜索辅助生成 |

示例 JSON  
```json
{
  "prompt": "An action shot of a black lab swimming...",
  "num_images": 1,
  "aspect_ratio": "auto",
  "output_format": "png",
  "safety_tolerance": 4,
  "resolution": "1K",
  "limit_generations": true
}
```

---

## 6. 输出模式（Output Schema）

```json
{
  "images": [
    {
      "file_name": "nano-banana-2-t2i-output.png",
      "content_type": "image/png",
      "url": "https://storage.googleapis.com/falserverless/example_outputs/nano-banana-2-t2i-output.png",
      "file_size": 123456,
      "width": 1024,
      "height": 1024
    }
  ],
  "description": ""
}
```

---

## 7. 相关链接

- [官方文档](https://docs.fal.ai)
- [API Key 管理](https://fal.ai/dashboard/keys)
- [计费与额度](https://fal.ai/dashboard/billing)