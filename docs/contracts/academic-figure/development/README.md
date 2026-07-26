# Academic Figure Development Workflow

> 本目录指导 Code Agent 怎样执行开发任务。它不是产品用户工作流。

## 强制流程

```text
读取用户指令
→ 检查 branch / commit / status
→ 读取 PDR
→ 读取当前批次 Contract
→ 读取稳定 Contract
→ 检查真实代码和测试
→ 先输出实现计划
→ 等待批准
→ 只修改批准范围
→ 运行指定验证
→ 检查 git diff
→ 输出实际结果
```

## 两阶段生产规则

### 阶段 A：调查与计划

默认只读，不生产代码。

必须输出：

- 当前分支和 commit；
- 工作区状态；
- 与任务相关的仓库事实；
- 计划修改文件；
- 计划复用模块；
- 风险和歧义；
- 测试计划；
- 停止条件。

### 阶段 B：实施与交付

只有用户批准后才允许生产。

必须：

- 严格遵守批次 Contract；
- 不扩大修改范围；
- 运行指定测试；
- 检查 diff；
- 明确报告未运行和失败的验证；
- 生成 patch、manifest 和 validation report，或按用户指定方式直接修改。

## 证据原则

- 代码和测试是当前实现的主要证据。
- README、PDR 和设计草案不能单独证明实现。
- `planned` 不等于 `existing`。
- 未运行的测试不能写成“通过”。
- 推断必须显式标记。

## 必读文件

- `repository-inspection.md`
- `change-boundary.md`
- `reuse-and-compatibility.md`
- `implementation-order.md`
- `agent-stop-conditions.md`
- `batch-acceptance.md`
- `diff-delivery.md`
