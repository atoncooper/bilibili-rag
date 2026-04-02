"""
Query Rewriter - Step-Back Prompting Strategy

后退提示词策略：将具体问题泛化为更高层次的概念，
先召回泛化结果，再与原始 query 结果合并。
"""
import json
from typing import Optional

from app.services.query.strategy import RewriteStrategy
from app.services.query.types import RewrittenQuery, RewriteType, StepBackMetadata


class StepBackStrategy(RewriteStrategy):
    """后退提示词策略（默认策略）"""

    def __init__(self, llm):
        """
        Args:
            llm: LangChain LLM 实例
        """
        self.llm = llm

    def should_apply(self, query: str) -> bool:
        """
        后退提示词策略适用于所有非简单 query。
        简单 query 的判断由 QueryRewriter._is_simple_query() 先行处理。
        """
        return True

    async def apply(self, query: str) -> Optional[RewrittenQuery]:
        """
        生成两种不同层次的检索 query：
        1. 高层次抽象：提升到更通用的概念，但必须保留核心实体和关键限定词
        2. 具体完善：补充被省略的主语/宾语

        示例：
        - 输入：如何优化小程序的性能？
        - 高层次抽象：如何提升性能？
        - 具体完善：如何优化小程序开发中的性能问题？
        """
        prompt = f"""你是一个查询改写专家。对于用户的知识库问答问题，生成两种不同层次的检索 query。

## 概念定义

**核心实体**：问题中的名词、专有名词或不可替换的实体
- 人名/人物：例如"王德峰"、"李笑来"
- 技术名词：例如"机器学习"、"深度学习"、"Rust"
- 产品名：例如"小程序"、"iPhone"、"微信"
- 事件/作品：例如"红楼梦"、"三国演义"

**关键限定词**：限定问题范围的重要修饰词，通常是形容词、动词或短语
- 例如："性能优化"、"并发编程"、"哲学思想"、"中国文化"
- 这些词决定了问题的核心方向，不能丢失

## 改写要求

### 1. 高层次抽象
将问题提升到更通用的概念层次，但必须遵循以下规则：

**✅ 必须保留**：
- 所有核心实体（人名、技术名词、产品名等）
- 所有关键限定词（决定问题方向的修饰词）
- **只泛化**动词和通用形容词（如"讲解"→"讨论"，"优化"→"改进"）

**❌ 禁止行为**：
- 禁止删除核心实体（如"小程序"→"软件"是错误的！）
- 禁止过度泛化（如"小程序开发"→"软件开发"丢失了关键限定）
- 禁止替换核心概念

**正确示例**：
- 输入："王德峰讲的中国哲学"
  - ✅ 高层次抽象："王德峰讲的中国哲学核心概念"
  - ❌ 错误泛化："中国哲学"（丢失了王德峰）

- 输入："如何优化小程序的性能？"
  - ✅ 高层次抽象："如何提升性能？"
  - ❌ 错误泛化："如何开发软件？"（丢失了小程序+性能）

- 输入："Rust 所有权规则详解"
  - ✅ 高层次抽象："Rust 编程核心概念"
  - ❌ 错误泛化："编程规则"（丢失了 Rust）

### 2. 具体完善
补充被省略的主语/宾语，使问题更完整具体：
- 输入："所有权规则详解" → "Rust 所有权规则详解"
- 输入："性能怎么调优" → "小程序性能调优方法"

## 输出格式

只输出 JSON，不要解释。

问题：{query}

输出格式：
{{
  "step_back_query": "保留核心实体和关键限定词的高层次抽象问题",
  "specific_query": "补全主语/宾语后的完整具体问题",
  "confidence": 0.0~1.0,
  "reason": "一句话说明改写策略和保留的核心实体"
}}"""

        try:
            response = self.llm.invoke(prompt)
            text = response.content if hasattr(response, "content") else str(response)
            # 尝试解析 JSON
            data = json.loads(text)
            # step_back_query 是必填字段
            if not data.get("step_back_query"):
                return None
            # 只有 step_back_query 一个字段 → 部分 JSON，无效
            if len(data) == 1:
                return None
            return RewrittenQuery(
                type=RewriteType.STEP_BACK,
                query=data.get("step_back_query", query),
                confidence=float(data.get("confidence", 0.0)),
                reason=data.get("reason", ""),
                metadata=StepBackMetadata(
                    step_back_query=data.get("step_back_query", query),
                    specific_query=data.get("specific_query", data.get("step_back_query", query)),
                ),
            )
        except Exception as e:
            # 解析失败时返回 None，由 QueryRewriter 降级为直接检索
            return None
