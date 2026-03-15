---
name: guanxing-dream
version: 1.0.0
description: 梦境解析 — 结合周公解梦与现代心理学的 AI 解梦
author: guanxing
tags: [解梦, dream, 心理, 周公]
---

# 梦境解析 (Dream Interpretation)

AI 结合周公解梦传统智慧与现代心理学，深度解析梦境的象征含义与潜意识信号。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/dream
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "dream": "梦见在高处飞翔",    // 必填: 梦境描述
  "mood": "兴奋"                // 可选: 梦醒时的情绪
}
```

## Output

```json
{
  "success": true,
  "data": {
    "symbols": ["飞翔", "高处"],
    "interpretation": "飞翔象征自由与超越...",
    "psychAnalysis": "潜意识表达了对自我突破的渴望...",
    "advice": "保持积极心态，勇敢追求目标"
  }
}
```
