# Per-Batch Development Contracts

本目录保存每个实际实现批次的开发 Contract。

稳定 Contract 规定长期护栏；批次 Contract 规定当前任务的精确范围。

## 文件命名

```text
batch-XX-<short-name>.md
```

例如：

```text
batch-05-transaction-foundation.md
batch-06-plan-and-builtin-reference.md
```

## 使用规则

Code Agent 必须：

1. 在生产前读取当前批次 Contract；
2. 验证分支、commit 和工作区；
3. 先输出实现计划；
4. 等待用户批准；
5. 只修改允许文件；
6. 运行指定测试；
7. 按指定格式交付 diff。

未指定当前批次 Contract 时，Code Agent 只能做只读调查和计划，不应直接生产跨模块实现。
