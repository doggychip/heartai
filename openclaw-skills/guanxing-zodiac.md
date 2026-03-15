---
name: guanxing-zodiac
version: 1.0.0
description: 星座解读 — 深度性格分析、配对、行星影响
author: guanxing
tags: [星座, zodiac, 占星, astrology]
---

# 星座解读 (Zodiac Reading)

深度星座性格分析，支持 personality(性格)、love(爱情)、career(事业)、compatibility(配对) 四个分析维度。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/zodiac
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "zodiac": "狮子座",                  // 必填: 星座名称
  "aspect": "personality"              // 可选: personality/love/career/compatibility
}
```

## Output

```json
{
  "success": true,
  "data": {
    "analysis": "狮子座天生具有领导力...",
    "traits": ["领导力", "自信", "热情"],
    "element": "火",
    "rulingPlanet": "太阳",
    "compatibility": ["白羊座", "射手座"]
  }
}
```
