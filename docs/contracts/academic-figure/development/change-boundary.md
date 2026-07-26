# Change Boundary Rules

## 批次范围优先

每次实现必须由当前批次 Contract 明确：

- 允许修改的文件和目录；
- 禁止修改的文件和目录；
- 允许新增的文件；
- 允许新增的依赖；
- 允许改变的公共接口；
- 非目标。

未列入允许范围的修改默认禁止。

## 最小修改原则

Code Agent 必须选择能够满足批次目标的最小改动。

不得：

- 顺手重构无关模块；
- 全仓格式化；
- 修改无关命名；
- 更新无关依赖；
- 修复无关测试；
- 扩展到后续批次能力；
- 为“以后可能需要”提前建设平台层。

## 受保护边界

除非批次 Contract 明确授权，不得改动：

```text
packages/academic-figure-core/src/document/types.ts
packages/academic-figure-mcp/src/server.ts 的现有工具名
src/editor/
根 workspace 配置
package-lock.json
document.json 的权威地位
```

受保护不代表永远不能修改，而是必须在专门批次中明确修改原因、兼容策略和测试。

## 发现额外问题

如果实施时发现批次外问题：

1. 记录问题；
2. 不在当前 diff 中修复；
3. 说明影响；
4. 建议单独批次；
5. 只有用户明确批准后才扩展范围。
