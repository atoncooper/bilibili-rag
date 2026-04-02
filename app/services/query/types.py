"""
Query Rewriter - Type Definitions

核心数据类型定义，包含类型分层建模的 metadata 结构。
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Union


class RewriteType(Enum):
    """改写类型枚举"""
    STEP_BACK = "step_back"       # 后退提示词（泛化）
    SUB_QUERIES = "sub_queries"  # 子查询拆分


# === metadata 类型分层建模 ===

@dataclass(frozen=True)
class BaseMetadata:
    """metadata 抽象基类"""
    pass


@dataclass(frozen=True)
class StepBackMetadata(BaseMetadata):
    """后退提示词 metadata"""
    step_back_query: str  # 泛化后的高层次问题
    specific_query: str  # 补全主语/宾语后的具体问题


@dataclass(frozen=True)
class SubQueryMetadata(BaseMetadata):
    """子查询拆分 metadata"""
    is_multi_topic: bool       # 是否多主题
    sub_queries: List[str]  # 拆分后的子 query 列表
    main_topic: str          # 主要主题


# 联合类型 - IDE 自动提示 + 避免 key 写错
MetadataType = Union[StepBackMetadata, SubQueryMetadata]


@dataclass
class RewrittenQuery:
    """单条改写结果"""
    type: RewriteType                     # 改写类型
    query: str                            # 改写后的 query 内容
    confidence: float                     # 置信度 0.0 ~ 1.0
    reason: str                           # 改写原因说明
    metadata: Optional[MetadataType] = None  # 类型安全的 metadata


# 置信度阈值（低于此值的改写结果将被忽略，降级为直接检索）
CONFIDENCE_THRESHOLD = 0.6


@dataclass
class RewriteResult:
    """QueryRewriter 返回的完整改写结果"""
    original: str                   # 用户原始 query
    rewrites: List[RewrittenQuery]  # 改写结果列表，按 confidence 降序
    suggested_route: str            # 建议路由："direct" | "db_list" | "db_content" | "vector"
    needs_rewrite: bool           # 是否需要改写（简单 query 可跳过）
