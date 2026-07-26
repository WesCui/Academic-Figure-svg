# Reuse and Compatibility Rules

## 复用优先级

实现新能力前依次检查：

1. 当前 Core 类型和 tree utilities；
2. 当前 DocumentService；
3. 当前 DocumentStore；
4. 当前 SnapshotStore；
5. 当前 parser / serializer；
6. 当前 render / export；
7. 当前 primitives；
8. 当前 align / distribute；
9. 当前 SVG sanitize；
10. 当前 HTTP Bridge 和 SVG-Edit extension。

新实现不能仅因为现有接口不够“优雅”而复制第二套能力。

## 权威模型

`document.json` 和 `SvgDocument` 继续作为结构化图稿权威状态。

不得创建与其竞争的第二个像素级或 SVG 级权威文档模型。

Academic Diagram Plan 未来只能作为语义和构图中间层，不能替代正式 SVG 文档状态。

## 公共兼容性

现有 MCP 工具名默认保持稳定。

修改现有工具输入、输出或错误行为时必须：

- 说明兼容影响；
- 提供迁移策略；
- 更新测试；
- 更新 Contract；
- 获得批次授权。

## 依赖规则

Code Agent 不得擅自：

- 向 Core 引入 Zod、Ajv 或其他运行时依赖；
- 新建 workspace package；
- 更新整个依赖树；
- 使用传递依赖作为正式依赖；
- 修改 lockfile 而不说明原因。

需要新依赖时必须停止并报告：

- 为什么现有依赖无法完成；
- 新依赖的用途；
- 影响的 package；
- bundle/runtime 影响；
- 替代方案。

## 编辑器复用

SVG-Edit 已经负责人工选择、拖动、缩放、文本和路径编辑。

V2 不应重新实现这些编辑器能力。
