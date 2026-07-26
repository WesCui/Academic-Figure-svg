# Batch 2 Schema History

## 原始目的

Batch 2 尝试用 JSON Schema 和 fixtures 固化 V2 的候选数据模型。

## 纠偏结论

本项目中的 Contract 定位是：

```text
Code Agent 开发护栏
```

不是：

```text
产品运行时 Schema 系统
```

因此 Batch 3 将这些内容从：

```text
docs/contracts/academic-figure/
```

移动到：

```text
docs/design/academic-figure/data-model-drafts/
```

## 当前状态

- non-normative；
- implementation discussion only；
- no runtime registration；
- no loader requirement；
- no validator dependency requirement；
- no code generation requirement；
- no compatibility guarantee。

## 后续使用

未来批次可以从草案中提取最小结构，但必须由当期批次 Contract 明确批准。

未被批准的草案字段不能用于要求 Code Agent 改造仓库。
