# Data Model Draft Fixtures

> 这些 fixtures 是非规范设计示例，不是当前仓库的运行时测试。

## `valid/`

表示在 Batch 2 候选 JSON Schema 下的示例结构。

“valid”只表示符合当时的草案 Schema，不表示：

- 产品接受该数据；
- MCP 工具已经存在；
- Code Agent 可以调用对应能力；
- 字段已经稳定。

## `invalid/`

用于展示当时希望拒绝的结构，例如未知操作、非法 scope 和缺少 revision。

这些例子可以在未来实现批次中参考，但不要求仓库现在引入 Schema validator。

## Code Agent 规则

Code Agent 不得因为 fixtures 存在就：

- 新增测试框架；
- 引入 Ajv；
- 建设 Contract loader；
- 生成运行时类型；
- 修改现有 MCP 工具。
