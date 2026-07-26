# Academic Figure MCP V2 产品设计需求文档（PDR）

- **项目名称**：Academic-Figure-svg / Academic Figure MCP
- **目标版本**：V2
- **文档版本**：2.0
- **文档状态**：Draft for Implementation
- **文档日期**：2026-07-24
- **适用仓库**：WesCui/Academic-Figure-svg
- **主要入口**：Claude Code、Codex（含 VS Code 中的使用场景）
- **主要读者**：项目维护者、核心贡献者、MCP 开发者、前端开发者、测试人员

---

## 1. 文档目的

本文定义 Academic-Figure-svg 在现有实现基础上的 V2 升级方案。

V2 不重新开发 SVG 编辑器，不推翻当前结构化文档模型，也不建设远程多用户绘图平台。升级重点是将当前“Agent 可调用的结构化 SVG 工具”收敛为一个面向学术论文场景的本地绘图助手，使 Claude Code 和 Codex 能够：

1. 根据论文描述、项目代码和用户要求生成学术图稿；
2. 使用用户提供的参考图或 MCP 内置构图参考控制构图和风格；
3. 使用内置素材和用户自定义 SVG 素材；
4. 通过确定性布局、连接线路由、渲染检查和 Audit 提高初稿质量；
5. 通过自然语言继续修改已有图稿；
6. 通过现有 SVG-Edit 完成人工精调；
7. 通过 Revision、Snapshot 和 Rollback 避免修改不可恢复。

V2 的目标不是自动生成无需修改的完美投稿图，而是稳定生成：

> **结构正确度较高、几何无明显错误、风格基本统一、可继续人工编辑的学术 SVG 初稿。**

---

## 2. 当前仓库能力基线

当前仓库已经形成了 V2 所需的主要技术骨架，因此 V2 必须以增量升级为原则。

### 2.1 已实现的结构化 SVG Core

`packages/academic-figure-core` 已提供：

- `SvgDocument`、`SvgNode` 和 metadata 模型；
- SVG 文档树查找、移动、删除等操作；
- `document.json` 到 SVG 的序列化；
- SVG XML 到结构化文档的解析；
- SVG-Edit 往返所需的结构化状态；
- 人类可读的 document tree。

### 2.2 已实现的 MCP Server

`packages/academic-figure-mcp` 已提供 20 余个 MCP 工具及配套服务，包括：

- 创建和加载文档；
- 创建、更新、变换和删除元素；
- 1–500 个元素的原子批量创建；
- 重复元素创建；
- 文档树和元素查询；
- resvg PNG 预览；
- SVG 导出；
- 文件型工作区存储；
- optimistic revision locking；
- revision snapshot；
- 统一写入结果和结构化错误。

### 2.3 已实现的高阶绘图能力

仓库已经具备：

- Academic 和 IEEE 主题；
- building 等高阶图元；
- communication link；
- callout；
- legend；
- repeated elements；
- align；
- distribute；
- overlap、bounds、text-size、density 等基础 Audit。

### 2.4 已实现的人工编辑链路

仓库已在 SVG-Edit 中加入 `ext-academic-mcp` 扩展，并通过 HTTP Bridge 支持：

- Open；
- Save；
- Reload；
- SVG 解析回 `document.json`；
- metadata 合并；
- revision 增加；
- 预览重新渲染；
- AI 在人工编辑后继续操作。

### 2.5 当前系统工作方式

当前主要链路是：

```text
Claude Code / Codex
        ↓ MCP
底层 SVG 工具和高阶图元
        ↓
document.json
        ↓
current.svg
        ↓
resvg preview
        ↕
SVG-Edit 人工编辑
```

当前优势是可编辑、可预览、可往返；主要不足是 Agent 仍需临时决定学术图的构图、素材、坐标和修改步骤。

---

## 3. 当前问题

### 3.1 缺少学术图意图层

当前 Agent 主要直接组合 `rect`、`path`、`text`、group 和高阶图元。系统无法稳定表达：

- 当前是系统模型图还是模型框架图；
- 节点表示服务、模型模块还是物理设备；
- 边表示数据流、控制流、通信链路还是反射路径；
- 用户参考图应当影响构图、风格还是素材。

### 3.2 学术图构图过度依赖模型自由发挥

模型可能直接决定大量坐标、节点尺寸和连接线路径，导致：

- 同一请求多次结果差异较大；
- 文字溢出；
- 节点重叠；
- 连接线穿过节点；
- 风格不统一；
- 场景图空间关系不清晰。

### 3.3 参考图缺少正式使用机制

用户可以在对话中提供参考图，但当前系统没有统一规定：

- 参考图用于内容、构图、风格还是组件；
- 如何将参考分析转成可执行图稿计划；
- 如何避免复制参考图中的文字、独有素材和精确几何；
- 内置构图参考如何维护和调用。

### 3.4 素材能力尚未统一

当前已有建筑和通信高阶图元，但缺少统一素材入口：

- 内置图标和现有高阶图元没有统一注册；
- 用户不能正式导入并复用自己的 SVG；
- 模型可能临时生成复杂 path；
- 自定义素材可能包含危险 SVG 内容；
- 素材插入后的版本、来源和身份没有统一记录。

### 3.5 版本和快照能力尚未完全产品化

仓库已有 revision locking 和 snapshots，但仍需要统一：

- 一次用户意图对应一个 revision；
- AI 修改、自动布局、自动修复和 SVG-Edit 保存的快照时机；
- 回滚接口；
- 逻辑操作失败后的原子性；
- 重试幂等。

### 3.6 Audit 尚不足以承担交付门槛

现有 Audit 能发现部分重叠、越界、字号和密度问题，但还需增加：

- 文字裁切；
- 连接线穿过节点；
- 悬空端点；
- 同级节点尺寸不一致；
- 明显样式不一致；
- 自定义素材超出布局边界。

---

## 4. 产品定位

### 4.1 当前定位

> 基于 SVG-Edit、MCP、resvg 和结构化 SVG 文档模型的 AI 学术绘图原型。

### 4.2 V2 正式定位

> **Academic Figure MCP V2 是一款面向 Claude Code 和 Codex 的本地学术 SVG 生成与编辑助手。系统基于现有结构化 SVG Core、MCP、SVG-Edit 和 resvg，通过学术图意图、用户或内置参考图、内置及自定义素材、确定性布局、质量检查和快照恢复，帮助用户生成和修改高质量、可继续编辑的学术图稿。**

### 4.3 产品形态

V2 不是独立桌面软件，其主要入口仍然是 Claude Code 和 Codex。

```text
Claude Code / Codex
          ↓ MCP
Academic Figure MCP
          ↓
Academic Figure Core
├── Structured Document
├── Academic Intent & Plan
├── Built-in References
├── User References
├── Asset Registry
├── Layout & Routing
├── Audit
└── Revision & Snapshot
          ↕
Existing HTTP Bridge
          ↕
Existing SVG-Edit
```

### 4.4 核心价值

- **学术化**：围绕论文中的系统模型、方法框架、算法流程和场景示意图。
- **参考驱动**：支持用户参考图和 MCP 内置构图参考。
- **可编辑**：最终产物保持为结构化 SVG。
- **可控**：模型负责语义，程序负责几何、布局和质量门槛。
- **可扩展**：支持内置素材和用户自定义 SVG 素材。
- **可恢复**：所有正式修改可通过 Snapshot 和 Rollback 恢复。
- **低重复建设**：继续使用 SVG-Edit、resvg、现有 primitives 和现有 MCP 文档系统。

---

## 5. 目标用户与典型场景

### 5.1 目标用户

- 在代码仓库中编写论文和技术文档的研究人员；
- 需要绘制模型框架图、系统模型图和算法流程图的学生；
- 通信、人工智能、软件系统等方向的论文作者；
- 使用 Claude Code 或 Codex 进行研究开发的用户；
- 需要将自己的 SVG 图标和领域素材加入绘图流程的用户。

### 5.2 典型场景

#### 场景 A：根据论文方法描述生成模型框架图

> 根据方法章节生成双分支编码、特征融合和分类头的方法框架图，参考我提供图片的布局。

#### 场景 B：根据代码仓库生成系统模型图

> 读取 `services/` 和 `agents/`，画出 Gateway、Orchestrator、Agents 和数据库的系统关系图。

#### 场景 C：生成通信场景图

> 画一个 UAV 搭载 RIS、基站和两类用户的通信系统模型，采用 MCP 内置的中央设备场景模板。

#### 场景 D：生成算法流程图

> 根据算法伪代码画流程图，显示初始化、循环优化、收敛判断和输出。

#### 场景 E：使用自定义素材

> 将 `assets/custom-uav.svg` 加入项目素材库，并在场景图中替换默认无人机。

#### 场景 F：自然语言修改和人工精调

> 调整右侧用户区域，避免连接线交叉，然后在 SVG-Edit 中继续手工微调。

---

## 6. 产品目标与非目标

### 6.1 V2 产品目标

1. 在 Claude Code 和 Codex 中完成学术图创建、修改、预览和导出。
2. 支持用户提供参考图和 MCP 内置构图参考。
3. 支持高频学术图族的意图识别与构图规划。
4. 复用现有 SVG Core 和 primitives 生成可编辑 SVG。
5. 支持内置素材与用户自定义 SVG 素材。
6. 使用确定性布局、路由和 Audit 降低明显质量问题。
7. 保持 SVG-Edit 人工编辑往返。
8. 将已有 Snapshot 和 revision 能力升级为可靠恢复底座。

### 6.2 V2 非目标

V2 不实现：

- 互联网或本地大规模参考图检索；
- embedding、向量数据库或参考图重排；
- 自动批量提取论文 PDF 中的 Figure；
- 全新 SVG 编辑器；
- 独立桌面客户端；
- 在线 SaaS；
- 多用户实时协作；
- 通用工作流引擎；
- 多 Agent 平台；
- 完整 UML、SysML 或 C4 建模工具；
- 覆盖所有学科的素材市场；
- 无限自动优化循环；
- 保证任意论文图一次生成即可投稿；
- Figma、Jupyter、ChatGPT 等额外平台接入。

---

## 7. 产品设计原则

### 7.1 复用优先

- 人工编辑继续使用 SVG-Edit；
- SVG 渲染继续使用 resvg；
- 底层状态继续使用 `document.json`；
- 现有 MCP 工具继续作为低层能力；
- 现有 building、link、callout、legend 等高阶图元优先注册为素材或组件；
- 图布局优先采用成熟布局库，不自研通用布局算法。

### 7.2 模型与程序职责分离

模型负责：

- 理解论文和项目上下文；
- 判断学术图意图；
- 提取实体、关系、分组和重点；
- 分析参考图构图与风格；
- 选择内置参考和素材候选；
- 生成图稿计划；
- 提出有限修改计划。

程序负责：

- Schema 校验；
- ID；
- 节点尺寸；
- 文字测量；
- 坐标；
- 间距；
- 对齐；
- 连接线端点；
- 路由；
- SVG 净化；
- Audit；
- Revision；
- Snapshot；
- Rollback。

### 7.3 参考图决定表达方式，不决定研究内容

```text
用户论文和项目内容 → 决定画什么
参考图             → 决定大致怎样组织
素材系统           → 决定对象怎样表现
布局系统           → 决定最终位置
主题系统           → 决定统一视觉样式
```

### 7.4 可编辑性优先于一次性视觉效果

不得为追求视觉效果将整图退化为位图。复杂素材可以由 SVG 组件或用户素材表示，但最终图稿必须尽可能保持可选择、可移动和可修改。

### 7.5 质量采用明确门槛，不采用模糊总分

严重错误必须为零；视觉偏好问题可以作为 warning 或交给用户调整。

---

## 8. 学术图族

V2 不要求用户预先定义“图稿类型”。系统根据用户内容自动识别，用户可显式覆盖。

### 8.1 System Model Figure

用于表达研究系统中的实体、环境和交互关系。

覆盖：

- 软件系统模型；
- 多 Agent 系统；
- 云边端系统；
- 通信系统模型；
- IoT 系统；
- 网络关系；
- 机器人系统组成。

典型元素：

- actor；
- system；
- service；
- device；
- storage；
- boundary；
- communication；
- dependency。

### 8.2 Method Framework Figure

用于表达论文方法、模型结构和数据流。

覆盖：

- Encoder–Decoder；
- 双分支融合；
- 多模态模型；
- 神经网络结构；
- 训练和推理框架；
- 主干网络和任务头；
- 局部模块展开。

典型元素：

- input；
- feature；
- module；
- encoder；
- decoder；
- fusion；
- loss；
- output；
- data-flow。

### 8.3 Algorithm Workflow Figure

用于表达算法、实验和处理过程的顺序和控制逻辑。

覆盖：

- 顺序步骤；
- 判断；
- 分支；
- 合并；
- 循环；
- 并行处理；
- 收敛判断。

典型元素：

- start/end；
- process；
- decision；
- input/output；
- loop；
- sub-process；
- control-flow。

### 8.4 Scenario Illustration

用于表达空间环境、物理实体和作用链路。

覆盖：

- UAV 通信；
- RIS；
- 基站；
- 卫星；
- 车辆；
- 建筑；
- 传感器部署；
- 实验装置；
- 反射区和透射区。

典型元素：

- environment；
- device；
- building；
- region；
- trajectory；
- wireless link；
- reflection path；
- annotation。

### 8.5 Composite Figure

用于组合多个 panel，例如：

- `(a)` 系统模型；
- `(b)` 方法框架；
- `(c)` 算法流程；
- 主图加局部模块放大；
- 左侧场景、右侧模型。

Composite Figure 只负责 panel 布局，不替代 panel 内部图族。

---

## 9. 参考图系统

V2 只支持两类参考来源：

1. 用户提供参考图；
2. MCP 内置构图参考。

V2 暂不实现参考图库检索。

### 9.1 用户参考图

支持：

- PNG；
- JPG；
- SVG；
- 用户从论文中截取的 Figure；
- 项目路径中的参考图；
- 以前生成的 Academic Figure 图稿。

用户可以声明参考范围：

```ts
type ReferenceScope =
  | "composition"
  | "style"
  | "components"
  | "full";
```

示例：

```json
{
  "path": "references/ris-system.png",
  "scope": ["composition", "style"]
}
```

### 9.2 MCP 内置构图参考

内置参考不是待检索的大型论文图集，而是数量有限、人工确认的构图示例和 metadata。

首期建议提供 12–20 个参考项。

#### System Model / Scenario

- Sender–Channel–Receiver；
- Base Station–RIS–Users；
- UAV–BS–Users；
- Cloud–Edge–Device；
- Central Device with Peripheral Entities；
- Reflection and Transmission Regions。

#### Method Framework

- Single Pipeline；
- Dual-Branch Fusion；
- Encoder–Decoder；
- Backbone with Multiple Heads；
- Training and Inference Paths；
- Overall Framework with Detail Module。

#### Algorithm Workflow

- Sequential Flow；
- Decision Branch；
- Iterative Loop；
- Parallel Processing and Merge。

#### Composite

- Scenario + Method；
- Overview + Detailed Module；
- Three-Panel Academic Figure。

### 9.3 内置参考定义

```ts
interface BuiltinReferenceDefinition {
  id: string;
  name: string;
  family: AcademicFigureFamily;
  description: string;
  recommendedFor: string[];
  previewPath: string;
  layoutProfile: string;
  styleProfile: string;
  regions: ReferenceRegion[];
}
```

### 9.4 参考分析

用户参考图由支持视觉输入的 Host 模型分析，输出受约束结构：

```ts
interface ReferenceAnalysis {
  figureFamily: AcademicFigureFamily;

  composition: {
    direction?: "left-to-right" | "top-to-bottom";
    panelCount: number;
    regions: ReferenceRegion[];
    hasCentralObject: boolean;
    hasParallelBranches: boolean;
    hasInsetDetail: boolean;
  };

  style: {
    dimensionality: "2d" | "pseudo-3d";
    density: "low" | "medium" | "high";
    iconUsage: "none" | "light" | "heavy";
    borderStyle: "solid" | "dashed" | "mixed";
    paletteDescription: string;
  };

  reusablePatterns: string[];
}
```

### 9.5 参考使用边界

系统可以借用：

- panel 划分；
- 区域位置；
- 阅读顺序；
- 信息密度；
- 线型类别；
- 颜色数量；
- 构图模式。

系统不得默认复制：

- 原参考图的论文文字；
- 原图独有科研内容；
- 原图精确坐标；
- 原图受版权保护的复杂插画；
- 原图品牌标识；
- 原图不可确认授权的素材。

内置参考应由项目自行绘制或使用可明确分发的内容。

---

## 10. Academic Diagram Plan

V2 在自然语言与现有 SVG 工具之间增加轻量 `AcademicDiagramPlan`。

它不是完整设计平台，也不保存所有像素细节。

```ts
interface AcademicDiagramPlan {
  version: "1.0";

  family: AcademicFigureFamily;
  domain?: string;
  layoutProfile: string;
  styleProfile: string;

  reference?: {
    type: "user" | "builtin";
    id: string;
    scope: ReferenceScope[];
  };

  regions: DiagramRegion[];
  entities: DiagramEntity[];
  relations: DiagramRelation[];
  groups: DiagramGroup[];
  annotations: DiagramAnnotation[];

  assumptions: string[];
  unresolved: DiagramQuestion[];
}
```

### 10.1 Plan 负责

- 图族；
- 区域；
- 实体；
- 关系；
- 分组；
- 标签；
- 强调对象；
- 参考来源；
- 构图和样式意图；
- 素材查询词。

### 10.2 Plan 不负责

- 精确坐标；
- 精确 path；
- 复杂 transform；
- 文字真实宽度；
- 连接线控制点；
- SVG XML。

### 10.3 阻塞性歧义

以下情况必须要求用户确认或明确假设：

- 箭头方向不明确；
- 两个名称是否为同一实体；
- 串行还是并行；
- 是否允许删除或合并关键模块；
- 用户参考图的“参考”范围不明确；
- 关键素材选择会改变研究语义。

---

## 11. 素材系统

### 11.1 素材分层

V2 素材分为：

1. 基础形状；
2. 内置通用素材；
3. 现有参数化高阶图元；
4. 用户自定义 SVG 素材。

### 11.2 基础形状

继续使用当前 SVG Core 生成：

- rounded rect；
- circle；
- diamond；
- database；
- panel；
- dashed boundary；
- label；
- arrow；
- callout。

### 11.3 内置通用素材

首期只提供高频学术对象，例如：

- home；
- user；
- server；
- database；
- cloud；
- computer；
- router；
- antenna；
- file；
- CPU/GPU；
- UAV；
- satellite。

通用图标应从风格统一、许可证清晰的开源 SVG 图标集中筛选，不需要自行重画全部图标。

### 11.4 现有高阶图元迁移

当前已经实现的：

- building；
- communication link；
- callout；
- legend；
- repeated elements；

应优先保留实现，并逐步注册到统一 Asset/Component Registry，而不是重写。

### 11.5 用户自定义素材

用户支持：

- 导入单个 SVG；
- 导入工作区素材目录；
- 设置名称、别名和分类；
- 搜索；
- 预览；
- 插入；
- 删除；
- 替换已有素材。

### 11.6 自定义素材存储

工作区素材：

```text
<project>/.academic-figure/assets/
```

用户全局素材：

```text
~/.academic-figure/assets/
```

搜索优先级：

```text
工作区素材
→ 用户全局素材
→ 内置素材
→ 基础 SVG 形状
```

### 11.7 素材导入流程

```text
读取用户 SVG
→ 安全净化
→ 移除外部依赖
→ 规范化 viewBox
→ ID 前缀化
→ 优化
→ 生成预览
→ 保存 manifest
→ 加入素材索引
```

必须拒绝：

- `<script>`；
- 事件属性；
- `javascript:`；
- 未授权远程图片；
- 远程 CSS；
- 危险 `foreignObject`；
- 异常复杂或超大 SVG。

### 11.8 素材实例化

素材插入图稿后默认展开为 inline SVG：

```xml
<g
  data-asset-id="workspace:custom-uav"
  data-asset-version="1.0.0"
>
  ...
</g>
```

这样即使原素材被移动或删除，已有图稿仍然可渲染、可导出和可编辑。

---

## 12. 高质量生成流程

### 12.1 完整主流程

```text
Claude Code / Codex 获取用户要求和项目上下文
                    ↓
识别学术图意图
                    ↓
选择参考来源
├── 用户参考图
├── 用户指定内置参考
├── Agent 从少量内置参考中选择
└── 不使用参考
                    ↓
分析参考构图和风格
                    ↓
生成 Academic Diagram Plan
                    ↓
校验实体、关系、分组和歧义
                    ↓
选择基础形状、内置素材或用户素材
                    ↓
编译为现有 SVG Core / MCP 操作
                    ↓
文字测量与节点尺寸计算
                    ↓
确定性布局
                    ↓
连接线路由
                    ↓
应用 Academic Theme
                    ↓
原子写入 document.json
                    ↓
序列化 SVG
                    ↓
resvg 渲染 PNG
                    ↓
Audit
                    ↓
自动修复明确问题
                    ↓
再次渲染和 Audit
                    ↓
交付预览
                    ↓
自然语言修改 / SVG-Edit 人工精调
```

### 12.2 图族布局策略

#### System Model

优先使用：

- layered；
- central-object；
- boundary-grouped；
- cloud-edge-device。

#### Method Framework

优先使用：

- pipeline；
- dual-branch；
- encoder-decoder；
- block-network；
- overview-detail。

#### Algorithm Workflow

优先使用：

- sequential flow；
- decision branch；
- merge；
- loop-back；
- parallel flow。

#### Scenario Illustration

使用语义区域和场景锚点：

- sky；
- ground；
- left sender；
- center device；
- right receiver；
- foreground users；
- background buildings；
- inset detail。

Scenario 不应完全交给通用图布局引擎。

#### Composite Figure

先确定 panel grid，再分别布局各 panel。

### 12.3 布局实现原则

- 继续使用现有 align/distribute；
- 增加 stack、grid 和局部重新布局；
- System、Method 和 Workflow 可通过 adapter 接入成熟 layered layout 库；
- 场景图采用 region constraints；
- 不让模型计算大量精确坐标。

### 12.4 连接线路由

连接线保存语义端点：

```ts
interface ConnectorEndpoint {
  elementId: string;
  port: "top" | "right" | "bottom" | "left" | string;
}
```

首期至少支持：

- straight；
- orthogonal；
- wireless curve；
- dashed dependency；
- reflection/transmission path。

节点移动后，相关连接线必须可重新计算。

---

## 13. 质量保障

V2 不以“模型审美”作为质量基础，而使用多层质量链路。

### 13.1 语义质量

检查：

- 用户要求的关键实体是否存在；
- 关键关系是否存在；
- 关系方向是否正确；
- 分组和 panel 是否符合 Plan；
- 是否新增无依据的关键实体；
- 图中文字是否忠实于用户内容。

语义问题无法完全由几何规则保证；关键歧义必须用户确认。

### 13.2 几何质量

程序检查：

- SVG 是否可解析；
- resvg 是否成功渲染；
- 元素是否越界；
- 严重元素是否重叠；
- 文字是否超出容器；
- 标签是否遮挡；
- 连接线是否穿过节点；
- 连接线端点是否悬空；
- 同级节点是否明显未对齐；
- 同级节点尺寸是否不一致。

### 13.3 视觉一致性

通过 Theme 和素材约束保证：

- 字体统一；
- 字号层级统一；
- 线宽统一；
- 圆角统一；
- 箭头统一；
- 颜色来自有限色板；
- 同类节点使用同一视觉类型；
- 图标风格尽量一致；
- 自定义素材受统一尺寸和边界约束。

### 13.4 Quality Gate

以下问题必须为零：

```ts
interface FigureQualityGate {
  renderSucceeded: true;
  invalidReferences: 0;
  outOfBoundsElements: 0;
  criticalOverlaps: 0;
  clippedTexts: 0;
  connectorNodeIntersections: 0;
  danglingConnectorEndpoints: 0;
}
```

以下问题可以作为 warning：

- 少量连接线交叉；
- 局部信息密度较高；
- 自定义素材风格差异；
- 视觉重心不完全平衡；
- 用户指定参考与当前内容结构不完全匹配。

### 13.5 自动修复

可自动修复：

- align；
- distribute；
- 同级节点统一尺寸；
- 文字容器扩大或换行；
- 越界元素移回；
- 连接线重新路由；
- 统一线宽和圆角；
- 自定义素材缩放到规定边界。

不可自动修复：

- 改变箭头语义方向；
- 删除关键模块；
- 合并实体；
- 改变算法先后顺序；
- 修改关键研究文字；
- 将一种系统模型改成另一种研究假设。

### 13.6 有限视觉复核

P1 可增加一次有限视觉复核：

- 输入：用户要求、Plan、参考分析和渲染 PNG；
- 输出：系统支持的结构化修改操作；
- 最多执行一轮；
- 修改后必须重新 Audit；
- 指标没有改善则回滚。

V2 不实现无限自动迭代。

### 13.7 人工精调

通过现有 SVG-Edit 完成：

- 位置微调；
- 缩放；
- 文字修改；
- 路径编辑；
- 填充和描边；
- 局部视觉优化。

人工编辑是产品正式能力，不是系统失败后的临时补救。

---

## 14. 自然语言创建与修改

### 14.1 创建图稿

推荐任务级接口：

```ts
createAcademicFigure({
  instruction,
  sourceContext,
  reference,
  output,
  mode
})
```

支持两种模式：

#### 自动模式

```text
用户描述
→ 自动选择内置参考或无参考
→ 自动生成
→ 返回预览
```

#### 计划确认模式

```text
用户描述
→ 返回 Figure Intent
→ 返回参考选择
→ 返回 Academic Diagram Plan
→ 用户确认
→ 开始绘制
```

正式论文图默认推荐计划确认模式。

### 14.2 修改已有图稿

支持：

- 添加和删除实体；
- 修改文字；
- 移动、缩放和旋转；
- 对齐和分布；
- 修改颜色和样式 token；
- 插入或替换素材；
- 添加、删除和重路由连接线；
- 局部重新布局；
- 更换内置参考构图；
- 根据新参考图调整布局。

一次用户指令应尽量编译成一次批量操作。

### 14.3 局部修改保护

用户指定元素、group 或 panel 时，默认只允许修改：

- 目标元素；
- 目标元素子节点；
- 与目标元素直接相关的连接线；
- 为解决碰撞必须调整的邻近元素。

非目标区域不得因简单修改而整体重排。

---

## 15. SVG-Edit 人工编辑往返

V2 继续复用现有 SVG-Edit、HTTP Bridge 和 `ext-academic-mcp`。

### 15.1 新增统一入口

增加任务级 MCP 工具：

```text
open_in_editor
```

负责：

- 确认 HTTP Bridge 可用；
- 确认 SVG-Edit 可用；
- 打开当前文档；
- 返回本地编辑地址。

### 15.2 保存规则

SVG-Edit 保存时：

1. 检查 expected revision；
2. 保存修改前快照；
3. 解析 SVG；
4. 尽量保留 role、importance、tags、assetId 和 reference metadata；
5. 校验结构；
6. 原子写回；
7. revision 增加一次；
8. 重渲染 preview；
9. 返回人工修改摘要。

### 15.3 不重新开发的能力

V2 不重新实现：

- 选择；
- 拖动；
- 缩放；
- 路径编辑；
- 基础文本编辑；
- 填充和描边；
- undo/redo；
- SVG 导入导出；
- 基础图层操作。

---

## 16. Revision、Snapshot 与 Rollback

### 16.1 统一逻辑提交

以下操作均视为一个逻辑提交：

- 创建整张图；
- 一次自然语言修改；
- 自动布局；
- 自动修复；
- 参考构图切换；
- 素材替换；
- SVG-Edit 保存；
- Rollback。

一个逻辑提交只能增加一个 revision。

### 16.2 统一写事务

所有正式写操作应逐步统一到：

```ts
mutateDocument({
  documentId,
  expectedRevision,
  operationId,
  actor,
  summary,
  mutation
})
```

要求：

- 全部成功才提交；
- 中途失败正式文档不变化；
- 成功 revision 有 snapshot；
- 相同 operationId 重试不重复执行。

### 16.3 Snapshot

首期继续使用全量 JSON 快照，优先保证正确性。

保存时机：

- AI 创建前或创建完成后；
- AI 修改前；
- 自动布局前；
- 自动修复前；
- SVG-Edit 保存前；
- Rollback 前。

### 16.4 Rollback

Rollback 创建新 revision，不删除后续历史。

首期提供：

```text
list_revisions
rollback_revision
```

暂不实现：

- 分支；
- 三方合并；
- 多用户冲突 UI；
- Git 式完整历史系统。

---

## 17. MCP 工具规划

现有低层工具继续保留，以维持兼容性和高级操作能力。

V2 新增或推荐以下任务级工具。

### 17.1 图稿计划与生成

```text
create_figure_plan
create_academic_figure
revise_academic_figure
```

### 17.2 用户参考图

```text
add_reference_image
analyze_reference_image
list_reference_images
remove_reference_image
```

### 17.3 内置参考

```text
list_builtin_references
get_builtin_reference
```

V2 不提供：

```text
search_reference_figures
build_reference_index
import_references_from_pdf
```

### 17.4 素材

```text
list_assets
search_assets
import_asset
insert_asset
remove_asset
```

### 17.5 质量、编辑和版本

```text
audit_figure
fix_figure_issues
open_in_editor
list_revisions
rollback_revision
```

### 17.6 内部复用

任务级工具内部继续复用已有：

- `create_document`；
- `create_element`；
- `batch_create_elements`；
- `create_repeated_elements`；
- `update_element`；
- `transform_elements`；
- `delete_elements`；
- `query_elements`；
- `render_preview`；
- `export_svg`；
- align/distribute；
- high-level primitives。

---

## 18. 数据和工作区结构

建议在现有 workspace 上增量扩展：

```text
workspace/
├── documents/
│   └── <documentId>/
│       ├── document.json
│       ├── current.svg
│       ├── preview.png
│       ├── diagram-plan.json
│       ├── reference-analysis.json
│       └── snapshots/
│
├── references/
│   ├── builtin/
│   └── user/
│
├── assets/
│   ├── builtin/
│   └── user/
│
└── exports/
```

项目级用户数据可以存放在：

```text
<project>/.academic-figure/
├── references/
├── assets/
└── config.json
```

用户全局数据可以存放在：

```text
~/.academic-figure/
├── references/
├── assets/
└── config.json
```

---

## 19. Claude Code 与 Codex 接入

### 19.1 Claude Code

继续复用当前：

- `scripts/register-mcp.mjs`；
- user-scope MCP 注册；
- 项目级 `.mcp.json`；
- stdio transport；
- `mcp__academic-figure__*` 工具；
- 非交互脚本调用。

需要补充：

- 学术图生成 Skill；
- 用户参考图使用示例；
- 内置参考使用示例；
- 自定义素材导入示例；
- 计划确认模式示例；
- 常见失败和回滚说明。

### 19.2 Codex

Codex 使用同一 MCP Server 和同一工具契约，不建设第二套服务。

需要提供：

- 项目级 MCP 配置说明；
- VS Code/Codex 使用示例；
- 推荐项目目录；
- 允许访问的论文、参考图和素材路径；
- 示例 Prompt；
- MCP 工具权限说明。

### 19.3 共享原则

Claude Code 和 Codex 必须共享：

- 同一 workspace；
- 同一 document；
- 同一参考图；
- 同一素材库；
- 同一 revision；
- 同一 Snapshot；
- 同一 SVG-Edit 页面。

---

## 20. 安全要求

### 20.1 SVG 导入

用户参考 SVG 和用户素材 SVG 必须净化。

禁止：

- script；
- 事件属性；
- `javascript:`；
- 未授权外部资源；
- 危险 foreignObject；
- 远程 CSS；
- 超限复杂度。

### 20.2 HTTP Bridge

继续要求：

- 默认监听 localhost；
- 限制请求体大小；
- 严格校验 documentId；
- PUT 携带 revision；
- 不暴露本地绝对路径；
- 保存失败不覆盖正式文档。

### 20.3 文件系统

读取和写入必须限制在：

- 当前工作区；
- 用户明确授权的素材和参考目录；
- Academic Figure 配置目录。

### 20.4 参考图版权边界

- 用户对自己提供的参考图负责；
- 系统默认只提取构图和风格；
- 内置参考必须可合法分发；
- 不将论文截图直接作为内置资源发布；
- 不默认裁切参考图中的复杂对象作为素材。

---

## 21. 非功能需求

### 21.1 可靠性

- 成功写操作有 revision；
- 正式 revision 有 snapshot；
- 失败操作不污染文档；
- rollback 成功率 100%；
- revision 冲突不静默覆盖；
- 缺失自定义素材原文件时，已插入图稿仍可渲染。

### 21.2 性能

初期建议目标：

- 普通文档批量修改 < 500 ms，不含模型调用和渲染；
- 200 个节点以内 preview < 2 s；
- 基础 Audit < 1 s；
- 内置参考列表 < 100 ms；
- 小型素材搜索 < 200 ms。

### 21.3 可维护性

- Plan、Reference、Asset、Layout、Audit 与 Document Core 职责分离；
- 低层 MCP 工具保持兼容；
- 任务级工具只编排现有能力；
- 图族和参考模板可配置扩展；
- 模型供应商不进入 Core 数据结构。

### 21.4 可复现性

- 图稿不依赖远程素材；
- 内置参考和素材有版本；
- 用户素材插入后 inline 展开；
- 生成记录保存 Plan、参考 ID、素材 ID 和主题；
- 同一 Plan 在相同布局版本下应得到稳定结果。

---

## 22. 测试与质量评估

### 22.1 现有能力回归

覆盖：

- parser/serializer；
- metadata round-trip；
- MCP low-level tools；
- batch atomicity；
- revision conflict；
- snapshot；
- HTTP Bridge；
- SVG-Edit 保存；
- resvg；
- export。

### 22.2 学术图场景测试

至少建立以下固定任务：

1. 软件系统关系图；
2. 多 Agent 系统模型图；
3. Encoder–Decoder 模型图；
4. 双分支融合方法图；
5. 算法顺序流程；
6. 算法判断与循环；
7. UAV–RIS 通信场景；
8. 基站–RIS–用户场景；
9. 云边端系统模型；
10. 场景 + 方法双 panel；
11. 主方法 + 子模块展开；
12. 用户参考图驱动重构；
13. 内置参考驱动生成；
14. 用户自定义 UAV 素材；
15. SVG-Edit 人工修改后继续 AI 修改。

### 22.3 质量基准产物

每个测试任务保存：

```text
request.md
reference/
diagram-plan.json
document.json
current.svg
preview.png
audit.json
revision-history.json
```

### 22.4 视觉回归

同时比较：

- 结构；
- Audit 指标；
- SVG 可解析性；
- PNG 截图差异；
- 非目标区域保持情况。

不能只使用像素差异判断布局变化是否合理。

### 22.5 自然语言修改测试

重点验证：

- 指定元素能正确定位；
- 无关元素保持不变；
- 连接线随节点更新；
- 修改失败可回滚；
- 一次用户指令只增加一个 revision。

---

## 23. 成功指标

### 23.1 基础可靠性

| 指标 | 目标 |
|---|---:|
| 逻辑操作单 revision 比例 | 100% |
| 正式 revision 快照覆盖率 | 100% |
| Rollback 成功率 | 100% |
| 失败事务文档污染率 | 0 |
| Revision 静默覆盖率 | 0 |
| SVG 解析与 resvg 渲染成功率 | ≥ 99% |

### 23.2 学术图生成质量

| 指标 | 目标 |
|---|---:|
| 关键实体召回率 | ≥ 95% |
| 关键关系方向准确率 | ≥ 90% |
| 严重越界 | 0 |
| 严重重叠 | 0 |
| 文字裁切 | 0 |
| 连接线穿过节点 | 0 |
| 悬空连接端点 | 0 |
| 同类节点样式一致率 | ≥ 95% |

### 23.3 参考图能力

| 指标 | 目标 |
|---|---:|
| 用户参考图成功导入率 | ≥ 99% |
| 内置参考可用率 | 100% |
| 参考范围指令正确执行率 | ≥ 90% |
| 参考图原始文字误复制率 | 0 |
| 内置参考合法分发信息完整率 | 100% |

### 23.4 素材能力

| 指标 | 目标 |
|---|---:|
| 自定义 SVG 安全校验覆盖率 | 100% |
| 合法自定义素材导入成功率 | ≥ 95% |
| 素材插入成功率 | ≥ 99% |
| 原素材删除后已有图稿渲染成功率 | 100% |

### 23.5 人工编辑往返

| 指标 | 目标 |
|---|---:|
| SVG-Edit 保存后可继续 AI 编辑率 | ≥ 95% |
| 已有元素 ID 保留率 | ≥ 99% |
| 主要 metadata 保留率 | ≥ 95% |
| 保存失败原文档保留率 | 100% |

---

## 24. 分阶段实施计划

### Phase 0：现状核对与契约冻结

目标：确认 README 声明与实际代码一致。

交付：

- 当前 MCP 工具清单；
- 所有写路径清单；
- snapshot 触发路径；
- SVG-Edit round-trip 字段清单；
- Audit 规则矩阵；
- 当前高阶 primitives 清单；
- 保留、包装和废弃候选；
- 固定回归任务集。

退出条件：

- 当前行为有测试；
- V2 不破坏的契约明确；
- 新增数据模型通过评审。

### Phase 1：可靠事务、快照和人工编辑

基于现有 `document-store`、`snapshot-store`、parser/serializer 和 HTTP Bridge：

- 统一逻辑事务；
- operationId 幂等；
- 单操作单 revision；
- Snapshot；
- Rollback；
- SVG-Edit 保存安全；
- `open_in_editor`；
- 人工保存摘要；
- Claude Code/Codex 配置验证。

退出条件：

- AI→SVG-Edit→AI 链路稳定；
- 任意正式修改可恢复；
- 失败事务不污染文档。

### Phase 2：参考层与 Academic Diagram Plan

- 定义五类 Academic Figure Family；
- 定义 `AcademicDiagramPlan`；
- 准备 12–20 个内置构图参考；
- `list/get_builtin_reference`；
- 用户参考图导入；
- ReferenceScope；
- 参考分析结构；
- Plan 校验和澄清。

退出条件：

- 用户参考图和内置参考均能驱动 Plan；
- 参考只影响声明范围；
- 关键歧义不会静默猜测。

### Phase 3：素材系统

- Asset Registry；
- 注册当前 building、link、callout、legend；
- 小型通用图标集；
- 工作区素材；
- 用户全局素材；
- 用户 SVG 导入净化；
- 素材预览；
- 素材搜索和插入；
- inline SVG 持久化。

退出条件：

- 内置和用户素材可统一使用；
- 危险 SVG 无法导入；
- 已插入素材不依赖原始文件。

### Phase 4：高质量生成

- Plan compiler；
- 文本测量；
- 自动节点尺寸；
- layered/pipeline/flow 布局；
- 场景 region layout；
- connector endpoint；
- routing；
- Academic Theme 收敛；
- resvg；
- Audit V2；
- 自动修复；
- Quality Gate。

退出条件：

- 固定学术任务集达到质量门槛；
- 严重几何错误为零；
- 图稿保持可编辑。

### Phase 5：自然语言修改

- `revise_academic_figure`；
- 批量操作编译；
- 局部修改范围；
- 局部重新布局；
- 素材替换；
- 连接线更新；
- 修改后 Audit；
- 修改前 Snapshot；
- 非目标区域保持测试。

退出条件：

- 典型图稿可完成一到两轮自然语言修改；
- 修改失败完整恢复；
- 无关区域不发生大范围变化。

### Phase 6：产品收敛

- Claude Code Skill；
- Codex/VS Code 使用说明；
- 示例工作区；
- 内置参考说明；
- 自定义素材教程；
- 视觉回归；
- CI；
- SVG/PNG 导出完善；
- PDF 导出作为可选增强；
- README 和开发文档同步。

退出条件：

- 用户可完成生成、修改、人工精调、恢复和导出全流程；
- 发布验收指标达到门槛。

---

## 25. 优先级

### P0：必须完成

- 统一事务；
- Revision、Snapshot 和 Rollback；
- SVG-Edit 往返稳定；
- Academic Diagram Plan；
- 用户参考图；
- MCP 内置构图参考；
- Plan 到现有 SVG 工具编译；
- 基础素材和用户素材；
- resvg；
- Quality Gate。

### P1：质量增强

- 自动文字测量；
- layered/pipeline/flow 布局；
- 场景 region layout；
- connector routing；
- Audit V2；
- 自动修复；
- 局部自然语言修改。

### P2：后续增强

- 一轮有限视觉复核；
- 更多内置参考；
- 更多参数化领域素材；
- PDF 输出；
- 更完整的 panel 能力；
- 参考图库检索评估。

---

## 26. 主要风险与缓解措施

### 风险 1：参考图导致内容误复制

缓解：

- ReferenceScope；
- 分离用户内容与参考分析；
- 不复制原图文字和精确几何；
- Plan 中显式记录借用的构图特征；
- 内置参考自行绘制。

### 风险 2：场景图无法通过通用布局获得好效果

缓解：

- 场景图使用语义 region；
- 提供少量高质量场景构图参考；
- 使用参数化 building、UAV 和 link；
- 保留 SVG-Edit 人工微调；
- 不承诺任意复杂写实插图。

### 风险 3：自定义素材破坏风格或布局

缓解：

- 净化和 viewBox 规范化；
- 统一尺寸约束；
- 风格 warning；
- 插入时使用统一容器；
- 允许用户替换或人工编辑。

### 风险 4：轻量 Plan 逐渐膨胀为第二套文档模型

缓解：

- Plan 只保存语义、区域和关系；
- 精确状态仍由 `document.json` 保存；
- 人工像素调整不要求完整反写 Plan；
- 不在 Plan 中保存底层 SVG XML。

### 风险 5：新增任务级工具与现有工具重复

缓解：

- 低层工具保持兼容；
- 任务级工具只做编排；
- 不重复实现文档操作；
- 所有写操作复用同一事务服务。

### 风险 6：V2 范围重新膨胀

缓解：

- 明确不做参考检索；
- 只接入 Claude Code 和 Codex；
- 不重写 SVG-Edit；
- 首期内置参考限制在 12–20 个；
- 首期图标和领域素材保持小规模；
- 每个 Phase 有退出条件。

---

## 27. 待决策项

1. `AcademicDiagramPlan` 是否持久化到每个文档目录。
2. 内置参考首批具体清单和维护方式。
3. 用户参考图是否复制到 workspace，还是只保存授权路径。
4. 用户参考图分析由 Host 模型直接完成，还是通过 MCP Prompt 约束。
5. 结构图和方法图布局是否采用 ELK/elkjs。
6. 场景 region 的首期模板数量。
7. 用户全局素材目录的跨平台路径规范。
8. 自定义素材优化是否使用 SVGO。
9. PDF 导出是否进入 V2 发布范围。
10. 有限视觉复核是否放入 P1 或延后。
11. Plan 与人工编辑后的文档如何标记“部分失配”。
12. 当前高阶 primitives 哪些转为正式 Asset，哪些仅作为内部实现。

---

## 28. 发布验收标准

V2 发布必须满足：

1. 保留当前结构化 SVG Core 和主要低层 MCP 工具兼容性。
2. 所有正式写操作经过统一事务。
3. 一次用户意图只生成一个 revision。
4. 每个正式 revision 有可用 Snapshot。
5. 支持 `list_revisions` 和 `rollback_revision`。
6. SVG-Edit 人工编辑后可继续由 Claude Code 或 Codex 修改。
7. 支持五类学术图意图识别。
8. 支持用户提供参考图。
9. 支持 MCP 内置构图参考。
10. 暂不依赖参考图检索或向量数据库。
11. 支持轻量 Academic Diagram Plan。
12. 支持内置素材和用户自定义 SVG 素材。
13. 危险 SVG 无法进入素材库。
14. 素材插入后图稿保持自包含。
15. 支持确定性布局和基本连接线路由。
16. resvg 预览可用。
17. Quality Gate 中所有阻塞问题为零。
18. 支持自然语言修改现有图稿。
19. 修改失败可完整恢复。
20. 支持现有 SVG 导出和 PNG 预览。
21. Claude Code 和 Codex 使用说明完整。
22. 固定学术图任务进入 CI 或稳定回归流程。
23. README、PDR、开发说明与实际实现一致。

---

## 29. 最终升级主线

```text
现有 Structured SVG Core
+ 现有 MCP Tools
+ 现有 High-level Primitives
+ 现有 resvg Preview
+ 现有 Audit
+ 现有 Revision / Snapshot
+ 现有 SVG-Edit Bridge
                    ↓
可靠事务与恢复
                    ↓
学术图意图识别
                    ↓
用户参考图 / MCP 内置构图参考
                    ↓
Academic Diagram Plan
                    ↓
内置及用户自定义素材
                    ↓
现有 SVG 能力编译
                    ↓
确定性布局和连接线路由
                    ↓
resvg + Audit + Quality Gate
                    ↓
自然语言修改
                    ↓
SVG-Edit 人工精调
                    ↓
Claude Code / Codex 中稳定使用
```

V2 最重要的交付不是增加更多离散 MCP 工具，而是形成下面的稳定闭环：

> **用户内容与参考要求 → 可确认的学术图计划 → 受控素材和确定性绘制 → 可检查的 SVG 初稿 → 自然语言和 SVG-Edit 联合修改 → 可恢复导出。**

---

## 30. 基线与参考来源

本 PDR 的仓库基线依据：

1. Academic-Figure-svg 当前 README、项目结构、MCP 工具说明、HTTP Bridge 说明和 workspace 说明；
2. `packages/academic-figure-core` 当前结构；
3. `packages/academic-figure-mcp` 当前结构；
4. SVG-Edit `ext-academic-mcp` 往返链路；
5. 当前 README 声明的 themes、primitives、Audit、align/distribute、optimistic lock 和 snapshots。

仓库：

<https://github.com/WesCui/Academic-Figure-svg>

可借用但不作为 V2 直接依赖的外部思路：

- SVG-Edit：现有人工编辑底座；
- resvg：现有确定性渲染底座；
- ELK/Graphviz：候选自动布局引擎；
- ISO 5807：算法流程图符号参考；
- C4/UML/SysML：系统关系和 block/port/connector 概念参考；
- Nature/IEEE 图稿指南：字号、颜色、线型和输出检查参考；
- AutoFigure-Edit：学术图生成与 SVG-Edit 结合方式参考；
- PaperVizAgent：参考驱动规划和有限 Critic 思路参考；
- DiagrammerGPT：文本到 Diagram Plan 的两阶段思路参考。
