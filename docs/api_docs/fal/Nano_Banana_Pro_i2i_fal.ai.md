---
title: "Google Nano Banana 2 API [image edit]: AI Image Editor | fal.ai"
url: "https://fal.ai/models/fal-ai/nano-banana-pro/edit/api"
captured_at: "2026-03-08T22:27:25.052Z"
---
# Nano Banana 2 发布 🍌  
速度提升 4 倍，成本更低，质量更好  

---

## fal-ai / nano-banana-pro / edit  
**图像编辑**  
Nano Banana Pro 是 Google 最新的 SOTA 图像生成与编辑模型。  

---

### 1. 调用 API  

#### 安装客户端  
```bash
npm install --save @fal-ai/client
```

#### 设置 API Key  
```bash
export FAL_KEY="YOUR_API_KEY"
```

#### 提交请求  
```js
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
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
console.log(result.data);
console.log(result.requestId);
```

---

### 2. 认证  
- 推荐通过环境变量 `FAL_KEY` 设置。  
- 也可手动配置：  
```js
fal.config({ credentials: "YOUR_FAL_KEY" });
```
> 前端切勿暴露密钥，应通过服务端代理。

---

### 3. 队列（长时任务）  

#### 提交  
```js
const { request_id } = await fal.queue.submit("fal-ai/nano-banana-pro/edit", {
  input: { ... },
  webhookUrl: "https://optional.webhook.url/for/results",
});
```

#### 查询状态  
```js
const status = await fal.queue.status("fal-ai/nano-banana-pro/edit", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
```

#### 获取结果  
```js
const result = await fal.queue.result("fal-ai/nano-banana-pro/edit", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b"
});
console.log(result.data);
```

---

### 4. 文件处理  

- 支持 Base64 Data URI  
- 支持公开可访问的 URL  
- 自动上传：  
```js
const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
```

---

### 5. Schema  

#### Input  
| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| prompt | string | *必填* | 编辑提示词 |
| num_images | integer | 1 | 生成图片数量 |
| seed | integer | — | 随机种子 |
| aspect_ratio | enum | auto | 见下方枚举 |
| output_format | enum | png | jpeg / png / webp |
| safety_tolerance | enum | 4 | 1(最严)-6(最松) |
| image_urls | list<string> | *必填* | 原图 URL |
| resolution | enum | 1K | 1K / 2K / 4K |
| limit_generations | boolean | — | 每轮仅生成 1 张 |
| enable_web_search | boolean | — | 允许联网搜索 |

aspect_ratio 可选值：  
`auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16`

示例：  
```json
{
  "prompt": "make a photo of the man driving the car down the california coastline",
  "num_images": 1,
  "aspect_ratio": "auto",
  "output_format": "png",
  "safety_tolerance": "4",
  "image_urls": [
    "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png",
    "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input-2.png"
  ],
  "resolution": "1K"
}
```

#### Output  
| 字段 | 类型 | 说明 |
|---|---|---|
| images | list<ImageFile> | 编辑后的图片 |
| description | string | 生成描述 |

示例：  
```json
{
  "images": [
    {
      "file_name": "nano-banana-pro-edit-output.png",
      "content_type": "image/png",
      "url": "https://storage.googleapis.com/falserverless/example_outputs/nano-banana-pro-edit-output.png"
    }
  ],
  "description": ""
}
```

#### ImageFile 结构  
- url（必填）  
- content_type  
- file_name  
- file_size  
- width / height