import { PageContainer } from "@/components/PageContainer";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar, Gauge, Flame, CalendarCheck, Star, Home, Moon,
  Layers, Type, Heart, Search, Download, ArrowLeft, Code,
  Copy, ChevronRight, ExternalLink, Package, Zap, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, any> = {
  Calendar, Gauge, Flame, CalendarCheck, Star, Home, Moon,
  Layers, Type, Heart,
};

const CATEGORY_LABELS: Record<string, string> = {
  divination: "占卜",
  fortune: "运势",
  culture: "文化",
  wellness: "身心",
};

const CATEGORY_COLORS: Record<string, string> = {
  divination: "text-purple-500 bg-purple-500/10",
  fortune: "text-amber-500 bg-amber-500/10",
  culture: "text-emerald-500 bg-emerald-500/10",
  wellness: "text-blue-500 bg-blue-500/10",
};

export default function ClawHubPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: skills = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/clawhub/skills"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clawhub/skills");
      return res.json();
    },
  });

  const filtered = skills.filter(s => {
    const matchSearch = !search || s.name.includes(search) || s.nameEn.toLowerCase().includes(search.toLowerCase()) || s.description.includes(search);
    const matchCat = !activeCategory || s.category === activeCategory;
    return matchSearch && matchCat;
  });

  const totalInstalls = skills.reduce((sum, s) => sum + s.installs, 0);

  if (selectedSkill) {
    return <SkillDetail skill={selectedSkill} onBack={() => setSelectedSkill(null)} />;
  }

  return (
    <PageContainer width="wide" className="flex-1 space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border border-primary/10">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold" data-testid="text-clawhub-title">ClawHub Skills</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            观星命理 Skill 生态 — 将八字、运势、求签等命理能力赋予你的 OpenClaw Agent
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{skills.length}</p>
              <p className="text-[11px] text-muted-foreground">个 Skill</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-amber-500">{totalInstalls.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">总安装量</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-500">v1.0</p>
              <p className="text-[11px] text-muted-foreground">API 版本</p>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 right-10 w-24 h-24 bg-primary/3 rounded-full translate-y-1/2" />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索 Skill..."
            className="pl-9"
            data-testid="input-search-skills"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={activeCategory === null ? "default" : "outline"}
            className="cursor-pointer text-xs px-2.5 py-1"
            onClick={() => setActiveCategory(null)}
          >
            全部
          </Badge>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Badge
              key={key}
              variant={activeCategory === key ? "default" : "outline"}
              className="cursor-pointer text-xs px-2.5 py-1"
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(skill => {
            const IconComp = ICON_MAP[skill.icon] || Package;
            const catClass = CATEGORY_COLORS[skill.category] || "";
            return (
              <Card
                key={skill.id}
                className="p-4 hover:bg-accent/30 transition-colors cursor-pointer group"
                onClick={() => setSelectedSkill(skill)}
                data-testid={`card-skill-${skill.slug}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${catClass}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{skill.name}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {CATEGORY_LABELS[skill.category]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{skill.nameEn}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {skill.installs.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Code className="w-3 h-3" />
                        {skill.version}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">没有匹配的 Skill</p>
        </div>
      )}
    </PageContainer>
  );
}

// ─── Skill Detail ───────────────────────────────────────────
function SkillDetail({ skill, onBack }: { skill: any; onBack: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "schema" | "example">("overview");

  const IconComp = ICON_MAP[skill.icon] || Package;
  const catClass = CATEGORY_COLORS[skill.category] || "";

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    toast({ title: "已复制" });
  };

  const curlExample = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/${skill.slug.replace("guanxing-", "")} \\
  -H "Authorization: Bearer gx_sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(skill.exampleInput)}'`;

  const pythonExample = `import requests

response = requests.post(
    "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/${skill.slug.replace("guanxing-", "")}",
    headers={"Authorization": "Bearer gx_sk_your_key_here"},
    json=${JSON.stringify(skill.exampleInput, null, 2).split("\n").map((l, i) => i === 0 ? l : "    " + l).join("\n")}
)
print(response.json())`;

  const skillMdPreview = `---
name: ${skill.slug}
version: ${skill.version}
description: ${skill.description}
author: guanxing
tags: [命理, ${CATEGORY_LABELS[skill.category]}]
---

# ${skill.name} (${skill.nameEn})

${skill.description}

## API Endpoint

POST /api/v1/${skill.slug.replace("guanxing-", "")}

## Authentication

Bearer Token: \`gx_sk_your_api_key\``;

  return (
    <PageContainer width="wide" className="flex-1 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 mt-0.5" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${catClass}`}>
          <IconComp className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold">{skill.name}</h1>
          <p className="text-sm text-muted-foreground">{skill.nameEn} · v{skill.version}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {CATEGORY_LABELS[skill.category]}
            </Badge>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {skill.installs.toLocaleString()} 安装
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card className="p-4">
        <p className="text-sm">{skill.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>端点: <code className="px-1 py-0.5 bg-muted rounded font-mono text-foreground">{skill.endpoint}</code></span>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border pb-px">
        {[
          { key: "overview", label: "接入指南" },
          { key: "schema", label: "数据格式" },
          { key: "example", label: "示例代码" },
        ].map(tab => (
          <button
            key={tab.key}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* SKILL.md Preview */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                SKILL.md
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyCode(skillMdPreview)}>
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap text-muted-foreground">
              {skillMdPreview}
            </pre>
          </Card>

          {/* Quick Integration Steps */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">OpenClaw 接入步骤</h3>
            <div className="space-y-3">
              {[
                { step: "1", text: "在观星「开发者中心」创建应用，获取 API Key", icon: Key },
                { step: "2", text: `将 ${skill.slug}.md 保存到 OpenClaw 的 skills/ 目录`, icon: Package },
                { step: "3", text: "在 Agent 配置中引用该 Skill", icon: Zap },
                { step: "4", text: "Agent 即可通过 Webhook 调用观星命理能力", icon: ExternalLink },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                    {item.step}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "schema" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Input Schema</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyCode(JSON.stringify(skill.inputSchema, null, 2))}>
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(skill.inputSchema, null, 2)}
            </pre>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Output Schema</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyCode(JSON.stringify(skill.outputSchema, null, 2))}>
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(skill.outputSchema, null, 2)}
            </pre>
          </Card>
        </div>
      )}

      {activeTab === "example" && (
        <div className="space-y-4">
          {/* cURL */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">cURL</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyCode(curlExample)}>
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap text-muted-foreground">
              {curlExample}
            </pre>
          </Card>

          {/* Python */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Python</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyCode(pythonExample)}>
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap text-muted-foreground">
              {pythonExample}
            </pre>
          </Card>

          {/* Example Response */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">示例响应</h3>
            </div>
            <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify({
                success: true,
                data: skill.exampleOutput,
                meta: {
                  skill: skill.slug,
                  version: skill.version,
                  tokensUsed: 245,
                  latencyMs: 1200,
                  timestamp: new Date().toISOString(),
                },
              }, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
