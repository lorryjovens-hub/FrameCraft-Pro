---
title: "Google Nano Banana 2: State-of-the-Art Image Generation | fal.ai"
url: "https://fal.ai/models/fal-ai/nano-banana-pro/api"
captured_at: "2026-03-08T22:27:13.391Z"
---
# Nano Banana Pro 使用指南

## 1. 安装与初始化

```bash
npm install --save @fal-ai/client
```

设置环境变量（推荐）  
```bash
export FAL_KEY="YOUR_API_KEY"
```

或在代码中手动配置  
```js
import { fal } from "@fal-ai/client";
fal.config({ credentials: "YOUR_FAL_KEY" });
```

## 2. 快速调用（同步阻塞）

```js
const result = await fal.subscribe("fal-ai/nano-banana-pro", {
  input: {
    prompt: "一只黑色拉布拉多在郊区泳池游泳的动态特写，相机与水面齐平，上下各一半画面，狗嘴叼着网球，水下可见划水的爪子。",
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);        // 生成的图片信息
console.log(result.requestId);   // 请求 ID
```

## 3. 队列模式（适合长任务）

提交任务  
```js
const { request_id } = await fal.queue.submit("fal-ai/nano-banana-pro", {
  input: { prompt: "..." },
  webhookUrl: "https://optional.webhook.url/for/results",
});
```

查询状态  
```js
const status = await fal.queue.status("fal-ai/nano-banana-pro", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
```

获取结果  
```js
const result = await fal.queue.result("fal-ai/nano-banana-pro", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
});
```

## 4. 文件处理

- **Data URI（Base64）**：直接嵌入，小文件可用。  
- **公开 URL**：确保可跨域访问。  
- **自动上传**：  
```js
const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
```

## 5. 输入参数（Input Schema）

| 字段 | 类型 | 默认值 | 说明 |
|----|----|----|----|
| prompt | string | *必填* | 文本描述 |
| num_images | integer | 1 | 生成图片数量 |
| seed | integer | — | 随机种子 |
| aspect_ratio | enum | 1:1 | 宽高比，可选 auto、21:9、16:9、3:2、4:3、5:4、1:1、4:5、3:4、2:3、9:16 |
| output_format | enum | png | 输出格式：jpeg、png、webp |
| safety_tolerance | enum | 4 | 内容安全级别，1 最严格，6 最宽松（仅 API） |
| sync_mode | boolean | false | true 时返回 data URI，且结果不进入历史记录 |
| resolution | enum | 1K | 分辨率：1K、2K、4K |
| limit_generations | boolean | false | 实验参数，每轮仅生成 1 张图 |
| enable_web_search | boolean | false | 允许模型联网搜索最新信息 |

示例  
```json
{
  "prompt": "一只黑色拉布拉多在郊区泳池游泳的动态特写……",
  "num_images": 1,
  "aspect_ratio": "1:1",
  "output_format": "png",
  "safety_tolerance": "4",
  "resolution": "1K"
}
```

## 6. 输出参数（Output Schema）

```json
{
  "images": [
    {
      "file_name": "nano-banana-pro-t2i-output.png",
      "content_type": "image/png",
      "url": "https://storage.googleapis.com/falserverless/example_outputs/nano-banana-pro-t2i-output.png"
    }
  ],
  "description": ""
}
```

ImageFile 字段：url（必填）、content_type、file_name、file_size、width、height。