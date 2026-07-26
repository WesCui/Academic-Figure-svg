# Diff Delivery Rules

## 标准交付物

当用户要求 diff 包时，生成：

```text
<batch-name>.patch
<batch-name>.zip
<batch-name>-MANIFEST.md
<batch-name>-VALIDATION.md
```

ZIP 至少包含 patch、manifest 和 validation report。

## Patch 要求

- 基于明确的分支和基线；
- 先执行 `git apply --check`；
- 只包含批准文件；
- 不包含构建产物、缓存、coverage、日志和临时文件；
- 不包含无关格式化；
- 不包含未批准的 lockfile 变化。

## Manifest

Manifest 必须写明：

- 适用仓库和分支；
- 基线 commit 或明确文件状态；
- 新增、修改、删除、移动文件；
- 代码和依赖是否变化；
- 应用命令；
- 检查命令；
- 回退方式；
- patch SHA-256。

## Validation report

Validation report 必须区分：

- 已运行并通过；
- 已运行并失败；
- 未运行；
- 仅做静态检查；
- 无法确认。

不得将“存在测试文件”写成“测试通过”。

## 本地应用

推荐顺序：

```bash
git status --short
git apply --check <patch>
git apply <patch>
git diff --check
git diff --stat
git diff -- <allowed-paths>
```

## 越界检查

交付前必须确认所有变更路径均属于批次允许范围。

发现额外文件时应停止生成正式包。
