"""
Query Rewriter - Sub-Query Splitter Strategy

子查询拆分策略：识别多主题查询，拆分为独立子 query，
并发检索后合并去重。
"""
import json
from typing import Optional

from app.services.query.strategy import RewriteStrategy
from app.services.query.types import RewrittenQuery, RewriteType, SubQueryMetadata


class SubQuerySplitterStrategy(RewriteStrategy):
    """子查询拆分策略（可选增强策略）"""

    def __init__(self, llm):
        """
        Args:
            llm: LangChain LLM 实例
        """
        self.llm = llm

    def should_apply(self, query: str) -> bool:
        """
        子查询拆分策略适用于包含多个并列主题的 query。
        关键词：和、与、以及、或者、还是、分别
        """
        splitter_terms = ["和", "与", "以及", "或者", "还是", "分别"]
        return any(term in query for term in splitter_terms)

    async def apply(self, query: str) -> Optional[RewrittenQuery]:
        """
        识别多主题查询，拆分为独立子 query。

        示例："王德峰和哲学的关系" → sub_queries=["王德峰", "哲学", "王德峰和哲学的关系"]
        """
        prompt = f"""分析以下用户问题，判断是否包含多个子主题或子问题，如有则拆分。

要求：
1. 如果是多主题问题，输出拆分结果
2. 拆分子主题要独立、完整
3. 保留原始问题作为最后一个子 query
4. 只需要输出 JSON，不要解释

问题：{query}

输出格式：
{{
  "is_multi_topic": true/false,
  "sub_queries": ["子query1", "子query2", ...],  # 至少2个才算多主题
  "main_topic": "主要主题",
  "confidence": 0.0~1.0,
  "reason": "拆分原因"
}}"""

        try:
            response = self.llm.invoke(prompt)
            text = response.content if hasattr(response, "content") else str(response)
            data = json.loads(text)
            is_multi_topic = data.get("is_multi_topic", False)
            sub_queries = data.get("sub_queries", [])

            # 只有多主题且子查询数量 >= 2 才应用此策略
            if not is_multi_topic or len(sub_queries) < 2:
                return None

            return RewrittenQuery(
                type=RewriteType.SUB_QUERIES,
                query=query,  # 保留原始 query 作为主检索 query
                confidence=float(data.get("confidence", 0.0)),
                reason=data.get("reason", ""),
                metadata=SubQueryMetadata(
                    is_multi_topic=is_multi_topic,
                    sub_queries=sub_queries,
                    main_topic=data.get("main_topic", query),
                ),
            )
        except Exception:
            # 解析失败时返回 None
            return None
