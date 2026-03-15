---
name: guanxing-fortune
version: 1.0.0
description: 每日运势预测 — 基于星座/八字，生成个性化事业、感情、财运、健康运势报告
author: guanxing
tags: [运势, 星座, 每日, fortune, daily]
---

# 每日运势 (Daily Fortune)

基于用户星座或八字，生成个性化每日运势报告，覆盖事业、感情、财运、健康四大维度。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/fortune
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "zodiac": "白羊座",          // 必填: 星座名称
  "birthDate": "1995-03-25"    // 可选: 出生日期（提升准确度）
}
```

## Output

```json
{
  "success": true,
  "data": {
    "overall": 4,
    "career": 4, "love": 3, "wealth": 5, "health": 4,
    "advice": "今日适合冒险，把握机会",
    "luckyColor": "红色",
    "luckyNumber": 7,
    "keywords": ["机遇", "勇气"]
  }
}
```

## cURL

```bash
curl -X POST https://heartai.zeabur.app/api/v1/fortune \
  -H "Authorization: Bearer gx_sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{"zodiac":"白羊座"}'
```
