# Academic Figure MCP V2 Development Contracts

> **定位：Code Agent 开发护栏。**
>
> 本目录用于约束 Claude Code、Codex 等 Code Agent 在开发 Academic Figure MCP V2 时的调查、规划、修改、测试和交付行为。
> 它不是产品运行时协议，不要求产品加载这些文档，也不表示 PDR 中的规划能力已经实现。

- **Implementation baseline**: `f8ddf7167cfa082ed68d4c0e3d0a3db0e1a2dc71`
- **PDR**: `docs/PDR/Academic-Figure-MCP-PDR .md`
- **Active scope**: repository facts, architecture boundaries, compatibility rules, behavioral guardrails, and per-batch development constraints
- **Runtime Schema requirement**: none
- **Runtime Contract package requirement**: none
- **Skill status**: generated in a later batch

## 1. Contract 在本项目中的含义

这里的 Contract 回答：

- 当前仓库实际实现了什么；
- 哪些能力仍然是 `planned`；
- Code Agent 不能破坏哪些现有接口和模块；
- 一个开发批次允许修改什么；
- 哪些行为必须复用现有实现；
- 哪些情况必须停止并请求确认；
- 修改完成后必须运行什么验证；
- diff 怎样交付和审查。

Contract 不等于：

- JSON Schema 运行时协议；
- MCP 产品 API 规范包；
- 自动代码生成输入；
- 新的 npm workspace；
- 产品必须加载的配置；
- 已实现能力证明。

## 2. 开发资料的三种层级

### 2.1 PDR

PDR 定义产品目标、范围、优先级和非目标。

```text
docs/PDR/Academic-Figure-MCP-PDR .md
```

### 2.2 稳定开发 Contract

本目录定义长期开发护栏：

```text
docs/contracts/academic-figure/
```

### 2.3 当前批次 Contract

每个实际实现批次必须在以下目录拥有独立 Contract：

```text
docs/contracts/academic-figure/batches/
```

当前批次 Contract 决定：

- 基线分支和 commit；
- 允许修改的文件；
- 禁止修改的文件；
- 必须复用的模块；
- 功能范围；
- 非目标；
- 测试；
- 验收；
- 停止条件；
- diff 交付要求。

## 3. 非规范设计草案

Batch 2 产生的数据结构 Schema 和 fixtures 已移动到：

```text
docs/design/academic-figure/data-model-drafts/
```

这些文件是非规范设计草案，仅用于字段讨论和后续实现参考。

Code Agent 不得仅因为这些文件存在就：

- 引入 Ajv 或其他 Schema 校验器；
- 创建 Contract loader；
- 创建运行时 Contract package；
- 修改 Core 依赖；
- 自动生成 TypeScript 类型；
- 改造现有 20 个 MCP 工具；
- 将草案视为已批准的产品 API。

只有当前批次 Contract 明确要求采用某个草案时，Code Agent 才能在该批次范围内实现它。

## 4. 开发前必读顺序

Code Agent 开始任何实现任务前必须依次读取：

1. 当前用户指令；
2. 当前分支、commit 和工作区状态；
3. PDR；
4. 当前批次 Contract；
5. 本目录稳定 Contract；
6. 与任务相关的真实代码和测试；
7. README 等说明材料。

README 只能作为线索，不能单独证明实现。

## 5. 状态词

| 状态 | 含义 |
|---|---|
| `existing` | 当前代码存在实现证据。 |
| `existing-with-limitations` | 有部分实现，但不满足完整目标。 |
| `planned` | PDR 目标，当前尚未实现。 |
| `out-of-scope` | 当前版本或批次明确不做。 |
| `unconfirmed` | 尚无足够代码或测试证据。 |

Code Agent 不得把 `planned`、`unconfirmed` 或 README 声明改写为 `existing`。

## 6. 稳定 Contract 文档

| 文件 | 用途 |
|---|---|
| `repository-baseline.md` | 已接受的仓库事实基线。 |
| `architecture-boundary.md` | Core、MCP、SVG-Edit、resvg 的职责边界。 |
| `capability-status.md` | existing、partial、planned 能力边界。 |
| `source-precedence.md` | 资料冲突时的处理规则。 |
| `mcp-tool-status.md` | 当前 20 个 MCP 工具与规划工具的边界。 |
| `invariants/` | 事务、参考图、素材、局部修改、Quality Gate 等开发约束。 |
| `development/` | Code Agent 的调查、实现、停止和交付流程。 |
| `batches/` | 每个实际开发批次的 Contract。 |

## 7. 总体禁止事项

除非当前批次 Contract 明确授权，Code Agent 不得：

- 重写 `SvgDocument`、`SvgNode` 或 `document.json` 权威模型；
- 绕过正式服务直接修改工作区文档；
- 重新实现 SVG-Edit 已提供的编辑能力；
- 将 Snapshot Store 宣称为完整 Rollback；
- 将基础 `audit_figure` 宣称为完整 Quality Gate；
- 将 generic SVG sanitize 宣称为 Asset Registry；
- 调用尚未注册的 MCP 工具；
- 新增依赖、workspace 或架构层；
- 修改非当前批次文件；
- 顺手重构、格式化或修复无关代码；
- 在测试未运行或失败时声称完成。

## 8. 当前后续顺序

默认实现顺序为：

```text
开发 Contract 与 Skill
→ 写入事务、Revision、Snapshot、Rollback
→ Academic Diagram Plan 与内置参考
→ 第一个 Plan Compiler 垂直切片
→ 用户参考图
→ 素材系统
→ 布局、路由与完整 Quality Gate
→ 任务级 MCP 与自然语言修改
→ Claude Code / Codex 产品化
```

具体顺序可被用户批准的批次 Contract 调整。
