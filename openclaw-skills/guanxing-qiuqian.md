---
name: guanxing-qiuqian
version: 1.0.0
description: 求签问卦 — 观音灵签/关帝灵签，AI 深度解签
author: guanxing
tags: [求签, 占卜, 灵签, divination]
---

# 求签问卦 (Divine Lot Drawing)

传统求签问卦，支持观音灵签、关帝灵签。AI 会生成独特签诗并进行深度解读。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/qiuqian
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "question": "我今年事业发展如何？",   // 必填: 求签问题
  "type": "guanyin"                     // 可选: guanyin(观音) 或 guandi(关帝)
}
```

## Output

```json
{
  "success": true,
  "data": {
    "qianNumber": 23,
    "qianTitle": "怀珠入市",
    "qianType": "上",
    "poem": "明珠暗投光难现，待到天晴自放晴",
    "interpretation": "此签寓意你有才华但尚未被发现..."
  }
}
```
