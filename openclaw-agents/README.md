# 观星 Agent Team - OpenClaw 配置

## 团队架构

```
             ┌───────────────┐
             │   main        │
             │  观星编排师     │  ← Orchestrator
             │  意图路由中心   │
             └───┬───┬───┬───┘
                 │   │   │
    ┌────────────┤   │   ├────────────┐
    │            │   │   │            │
    ▼            ▼   │   ▼            ▼
┌────────┐ ┌────────┐│ ┌────────┐ ┌────────┐
│ stella │ │predict-││ │ market │ │ tech   │
│星曜命理 │ │  ion  ││ │市场洞察 │ │技术支撑 │
│  师    │ │运势预测 ││ │  师    │ │  官    │
│        │ │  引擎  ││ │        │ │        │
└───┬────┘ └───┬────┘│ └────────┘ └────────┘
    │          │     │
    └──────────┘     │
     Event Bus       │
    (pub/sub)        │
```

## 协作模式

- **Orchestrator**: main 分析意图，路由到专项 Agent
- **Event Bus**: Agent 之间通过事件驱动异步协作
- **Model**: 纯 DeepSeek (deepseek-chat)，无需 GPT-5/Claude

## 事件流

| 事件 | 发布者 | 订阅者 | 说明 |
|------|--------|--------|------|
| `bazi_analyzed` | stella | prediction | 八字分析完成→运势计算 |
| `qiuqian_drawn` | stella | prediction | 抽签完成→运势关联 |
| `fortune_shift` | prediction | stella | 运势变化→命理解读 |
| `post_created` | main | market | 新帖子→社区分析 |
| `mood_alert` | main | stella, prediction | 情绪预警→关怀触发 |

## 目录结构

```
openclaw-agents/
├── main/          # 编排者
│   ├── AGENTS.md  # Agent 角色定义
│   └── SOUL.md    # 性格/灵魂设定
├── stella/        # 命理顾问
│   ├── AGENTS.md
│   └── SOUL.md
├── prediction/    # 运势引擎
│   ├── AGENTS.md
│   └── SOUL.md
├── market/        # 市场分析
│   ├── AGENTS.md
│   └── SOUL.md
└── tech/          # 技术支撑
    ├── AGENTS.md
    └── SOUL.md
```

## 使用方式

1. 在 OpenClaw 中创建对应的 Agent
2. 将 AGENTS.md 作为 Agent 的角色定义
3. 将 SOUL.md 作为 Agent 的灵魂/性格设定
4. 配置 Webhook 连接观星后端: `https://heartai.zeabur.app/api/webhook/agent`
