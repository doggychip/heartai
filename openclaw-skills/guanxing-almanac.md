---
name: guanxing-almanac
version: 1.0.0
description: 黄历查询 — 宜忌、吉时、日柱分析，适合择日选时
author: guanxing
tags: [黄历, 择日, 吉时, almanac, culture]
---

# 黄历查询 (Chinese Almanac)

查询指定日期的黄历信息，包括宜忌、吉时、干支、冲煞等，适合择日选时。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/almanac
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "date": "2026-03-15"    // 可选: 查询日期 YYYY-MM-DD（默认今天）
}
```

## Output

```json
{
  "success": true,
  "data": {
    "lunarDate": "二月初一",
    "ganzhi": "丙午年 辛卯月 壬辰日",
    "yi": ["祭祀", "出行", "纳财"],
    "ji": ["动土", "开仓"],
    "chongsha": "冲狗煞南",
    "jishi": [{"hour": "子时", "luck": "吉"}],
    "summary": "今日宜出行纳财，忌动土"
  }
}
```
