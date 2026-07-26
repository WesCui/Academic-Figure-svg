# Academic Figure V2 Data Model Drafts

> **Status: non-normative design draft**
>
> 本目录保存 Batch 2 形成的数据结构探索。它不是有效开发 Contract，不是产品运行时协议，也不要求代码加载或实现这些 Schema。

## 为什么移动到这里

这些 JSON Schema 和 fixtures 最初被放在 active Contract 目录中，容易使 Code Agent 误解为：

- 产品必须采用 JSON Schema 驱动；
- 必须引入 Ajv；
- 必须创建 Contract loader；
- 必须创建新的 Contract package；
- 必须按草案字段改造现有 MCP 工具。

这不符合本项目中 Contract 的定位。

本项目的 active Contract 是 Code Agent 开发护栏；数据结构草案只是设计参考。

## 使用规则

Code Agent 可以：

- 阅读字段命名；
- 比较不同数据模型；
- 在批次计划中引用候选结构；
- 根据真实实现反馈修改草案。

Code Agent 不得仅因为这些文件存在就：

- 新增运行时校验框架；
- 新建 npm package；
- 向 Core 添加依赖；
- 修改现有工具输入输出；
- 自动生成生产代码；
- 宣称草案已经批准；
- 宣称对应能力已实现。

## 采用流程

草案进入实现前必须：

1. 在当前批次 Contract 中明确选择；
2. 与当前代码和 PDR 对齐；
3. 收敛到该批次所需的最小字段；
4. 明确运行时所有者；
5. 明确兼容性；
6. 获得用户批准；
7. 在实现完成后更新 capability status。

## 目录

```text
schemas/
fixtures/
schema-index.md
draft-index.yaml
batch2-schema-history.md
```

这些文件在正式采用前可以进行破坏性调整，不提供运行时向后兼容承诺。
