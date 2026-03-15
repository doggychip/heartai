---
name: guanxing-compatibility
version: 1.0.0
description: 缘分配对 — 基于星座、八字、五行的双人缘分深度分析
author: guanxing
tags: [缘分, 配对, compatibility, 星座]
---

# 缘分配对 (Compatibility Analysis)

基于星座、八字、五行的双人缘分深度匹配分析，覆盖爱情、事业、友情三个维度。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/compatibility
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "person1": {"zodiac": "白羊座", "birthDate": "1995-03-25"},   // 必填
  "person2": {"zodiac": "狮子座", "birthDate": "1996-08-10"}    // 必填
}
```

## Output

```json
{
  "success": true,
  "data": {
    "score": 92,
    "dimensions": {"love": 95, "career": 88, "friendship": 90},
    "analysis": "火象星座的强强联合...",
    "advice": "互相包容，给予对方空间"
  }
}
```
