---
name: guanxing-name-score
version: 1.0.0
description: 姓名打分 — 五格剖象法，笔画分析与五行配置
author: guanxing
tags: [姓名, name, 五格, 打分]
---

# 姓名打分 (Name Scoring)

基于五格剖象法的姓名打分系统，分析天格、人格、地格、外格、总格，结合五行配置给出综合评分。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/name-score
Authorization: Bearer gx_sk_your_api_key
```

## Input

```json
{
  "surname": "张",              // 必填: 姓
  "givenName": "伟",            // 必填: 名
  "birthDate": "1995-03-15"    // 可选: 出生日期（用于五行分析）
}
```

## Output

```json
{
  "success": true,
  "data": {
    "totalScore": 85,
    "breakdown": {"tianGe": 12, "renGe": 22, "diGe": 15, "waiGe": 5, "zongGe": 26},
    "wuxingAnalysis": "此名五行偏木...",
    "analysis": "总体来看此名字..."
  }
}
```
