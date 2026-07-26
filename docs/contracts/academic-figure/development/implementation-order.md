# Implementation Order Guardrail

## 默认顺序

在没有更具体批准时，后续产品实现按以下依赖顺序推进：

1. 写入事务、Revision、Snapshot 和 Rollback；
2. Academic Figure Plan 与内置参考；
3. 第一个 Plan Compiler 垂直切片；
4. 用户参考图；
5. 素材系统；
6. 布局、路由和完整 Quality Gate；
7. 任务级 MCP 与自然语言修改；
8. Claude Code / Codex 最终用户接入。

## 顺序目的

该顺序用于避免：

- 在恢复能力稳定前增加复杂写操作；
- 在 Plan 未验证前建设大量模板；
- 在素材生命周期未明确前批量导入图标；
- 在底层服务未实现前创建空壳任务级工具；
- 在真实工具不存在前生成面向最终用户的 Skill。

## 垂直切片原则

每个实现批次应优先打通一个最小完整场景，而不是同时铺开所有图族。

例如 Plan Compiler 首批可以只支持：

```text
method-architecture
+
block-pipeline
+
AI/ML
```

## 禁止提前实现

当前批次不得提前实现后续批次内容，除非：

- 当前目标无法在合理边界内完成；
- Code Agent 明确说明依赖；
- 用户批准扩展；
- 批次 Contract 更新。
