# Data Model Draft Index

> 本文索引的是非规范设计草案，不是 runtime Contract。

| Draft file | Topic | Current implementation status |
|---|---|---|
| `schemas/common.schema.json` | 候选公共 ID、状态和枚举 | not implemented |
| `schemas/figure-request.schema.json` | 候选任务请求 | not implemented |
| `schemas/reference-definition.schema.json` | 候选参考图定义 | not implemented |
| `schemas/reference-analysis.schema.json` | 候选参考图分析 | not implemented |
| `schemas/academic-diagram-plan.schema.json` | 候选 Academic Diagram Plan | not implemented |
| `schemas/asset-manifest.schema.json` | 候选素材 manifest | not implemented |
| `schemas/figure-operation.schema.json` | 候选自然语言修改操作 | not implemented |
| `schemas/figure-audit-report.schema.json` | 候选 Audit / Quality Gate 输出 | basic Audit only |
| `schemas/revision-transaction.schema.json` | 候选统一事务结果 | not implemented |

## 解释边界

- JSON Schema 合法不代表产品必须采用。
- Fixture 合法不代表对应 MCP 工具存在。
- 字段可能在实现批次中被删减或重命名。
- 跨对象语义规则没有在这些草案中完整解决。
- 当前 20 个 MCP 工具仍以真实注册代码为准。
