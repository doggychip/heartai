---
name: guanxing-tarot
version: 1.0.0
description: 塔罗占卜 — 78 张大小阿尔卡那完整牌义，多种牌阵
author: guanxing
tags: [塔罗, tarot, 占卜, divination]
---

# 塔罗占卜 (Tarot Reading)

完整 78 张大小阿尔卡那塔罗牌义解读，支持单张(single)、三张(three)、凯尔特十字(celtic_cross)等牌阵。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/tarot
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "question": "我的感情运势如何？",    // 必填: 占卜问题
  "spread": "three"                   // 可选: single/three/celtic_cross
}
```

## Output

```json
{
  "success": true,
  "data": {
    "cards": [{"name": "恋人", "reversed": false, "meaning": "真爱与和谐"}],
    "spread": "三张牌",
    "interpretation": "恋人牌正位预示着...",
    "advice": "敞开心扉，接受新的可能"
  }
}
```
