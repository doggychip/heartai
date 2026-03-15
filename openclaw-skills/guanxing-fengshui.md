---
name: guanxing-fengshui
version: 1.0.0
description: 风水评估 — 居家/办公/商铺的方位吉凶与布局建议
author: guanxing
tags: [风水, fengshui, 堪舆, culture]
---

# 风水评估 (Feng Shui Assessment)

居家、办公室、商铺的风水分析，提供方位吉凶判断、布局优化建议、开运物推荐。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/fengshui
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "spaceType": "home",          // 必填: home/office/shop
  "direction": "坐北朝南",       // 可选: 朝向
  "concerns": "财运"            // 可选: 关注方面
}
```

## Output

```json
{
  "success": true,
  "data": {
    "score": 78,
    "analysis": "坐北朝南的居家格局...",
    "suggestions": ["客厅东南角摆放绿植", "玄关保持明亮"],
    "luckyItems": ["水晶球", "铜钱"],
    "avoidItems": ["尖角对冲"]
  }
}
```
