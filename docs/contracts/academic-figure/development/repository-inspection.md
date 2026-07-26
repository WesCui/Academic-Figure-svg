# Repository Inspection Rules

## 开始前必须记录

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

工作区不干净时不得擅自清理、丢弃或覆盖用户改动。

## 调查要求

Code Agent 必须检查：

- 当前批次涉及的真实源码；
- 注册入口；
- 服务调用链；
- 数据持久化路径；
- 错误处理；
- 现有测试；
- package 和构建边界；
- 与 PDR 的差距。

## 事实状态

调查结论只能使用：

```text
existing
existing-with-limitations
planned
out-of-scope
unconfirmed
```

## 证据优先级

1. 当前代码；
2. 当前测试；
3. 当前配置；
4. 当前 Contract；
5. PDR；
6. README；
7. 历史和归档材料。

PDR 证明目标，不证明实现。

README 证明声明，不证明实现。

## 计划前检查

Code Agent 在输出实现计划前必须回答：

- 目标能力当前是否已部分存在；
- 哪些现有模块可复用；
- 是否会改变公共工具名；
- 是否会改变 `document.json`；
- 是否会增加依赖；
- 是否会修改 workspace；
- 是否会影响 SVG-Edit；
- 是否会改变 revision 行为；
- 哪些测试能覆盖改动。

## 禁止调查行为

调查阶段不得：

- 安装依赖；
- 修改 lockfile；
-运行自动格式化；
-执行 migration；
-清理工作区；
-生成代码；
-提交 Git；
-将设计草案当成实现要求。
