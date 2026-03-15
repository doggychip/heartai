---
name: guanxing-bazi
version: 1.0.0
description: 八字命理分析 — 根据出生年月日时，AI解读天干地支、五行生克、十神关系
author: guanxing
tags: [命理, 八字, 五行, 占卜, Chinese metaphysics]
---

# 八字命理 (BaZi Analysis)

根据用户的出生年月日时，进行传统八字命理分析。AI 会解读天干地支、五行生克、十神关系，给出全面的命格分析。

## API Endpoint

```
POST https://heartai.zeabur.app/api/v1/bazi
```

## Authentication

在 HTTP Header 中添加 Bearer Token：
```
Authorization: Bearer gx_sk_your_api_key
```

获取 API Key：前往 [观星开发者中心](https://heartai.zeabur.app) 注册并创建应用。

## Input Schema

```json
{
  "birthDate": "1995-03-15",   // 必填: 出生日期 YYYY-MM-DD
  "birthHour": 14,              // 可选: 出生时辰 0-23
  "name": "张三"                // 可选: 姓名
}
```

## Output Schema

```json
{
  "success": true,
  "data": {
    "bazi": "乙亥 己卯 丙午 乙未",
    "wuxing": {"金": 0, "木": 4, "水": 1, "火": 2, "土": 1},
    "dayMaster": "丙火",
    "analysis": "日主丙火生于卯月，得木生火之力..."
  },
  "meta": {
    "skill": "guanxing-bazi",
    "version": "1.0.0",
    "tokensUsed": 245,
    "latencyMs": 1200,
    "timestamp": "2026-03-15T12:00:00.000Z"
  }
}
```

## Usage Example (cURL)

```bash
curl -X POST https://heartai.zeabur.app/api/v1/bazi \
  -H "Authorization: Bearer gx_sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1995-03-15","birthHour":14}'
```

## Usage Example (Python)

```python
import requests

response = requests.post(
    "https://heartai.zeabur.app/api/v1/bazi",
    headers={"Authorization": "Bearer gx_sk_your_key"},
    json={"birthDate": "1995-03-15", "birthHour": 14}
)
print(response.json())
```

## OpenClaw Agent Integration

将此文件保存到你的 OpenClaw Agent 的 `skills/` 目录：

```
skills/guanxing-bazi.md
```

Agent 即可在对话中自动调用八字分析能力。
