# Bilibili RAG API 文档

本目录包含 Bilibili RAG 知识库系统的完整 API 文档。

## 文件结构

```
api/
├── README.md           # 本文档
├── openapi.yaml        # OpenAPI 3.0 规范文档
└── swagger-ui.html     # Swagger UI 本地查看器
```

## 快速开始

### 方式一：使用本地 Swagger UI

直接用浏览器打开 `swagger-ui.html` 文件即可查看 API 文档。

> 注意：由于浏览器安全策略，建议通过 HTTP 服务器访问

```bash
# 使用 Python 启动简单服务器
cd api
python -m http.server 8080

# 或使用 Node.js
npx serve .
```

然后访问 http://localhost:8080/swagger-ui.html

### 方式二：使用在线编辑器

1. 访问 https://editor.swagger.io
2. 点击 "File" -> "Import URL"
3. 输入 `http://localhost:8000/openapi.yaml` 或直接粘贴 `openapi.yaml` 内容

### 方式三：集成到 FastAPI

如果你的 FastAPI 应用已启用 OpenAPI 文档，可以直接访问：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 概览

### 认证 (`/auth`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/qrcode` | 生成登录二维码 |
| GET | `/auth/qrcode/poll/{qrcode_key}` | 轮询登录状态 |
| GET | `/auth/session/{session_id}` | 获取会话信息 |
| DELETE | `/auth/session/{session_id}` | 退出登录 |

### 对话 (`/chat`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/ask` | 智能问答（非流式） |
| POST | `/chat/ask/stream` | 流式智能问答 |
| POST | `/chat/search` | 搜索相关视频片段 |

### 收藏夹 (`/favorites`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/favorites/list` | 获取收藏夹列表 |
| GET | `/favorites/{media_id}/videos` | 获取收藏夹视频（分页） |
| GET | `/favorites/{media_id}/all-videos` | 获取所有视频 |
| POST | `/favorites/organize/preview` | 预览收藏夹整理 |
| POST | `/favorites/organize/execute` | 执行收藏夹整理 |
| POST | `/favorites/organize/clean-invalid` | 清理失效内容 |

### 知识库 (`/knowledge`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/knowledge/stats` | 获取知识库统计 |
| GET | `/knowledge/folders/status` | 获取收藏夹入库状态 |
| POST | `/knowledge/folders/sync` | 同步收藏夹到向量库 |
| POST | `/knowledge/build` | 构建知识库（后台任务） |
| GET | `/knowledge/build/status/{task_id}` | 获取构建任务状态 |
| DELETE | `/knowledge/clear` | 清空知识库 |
| DELETE | `/knowledge/video/{bvid}` | 删除单个视频 |

## 认证流程

### 1. 扫码登录

```
1. 调用 GET /auth/qrcode 获取二维码
2. 展示二维码给用户扫码
3. 调用 GET /auth/qrcode/poll/{qrcode_key} 轮询状态
4. 状态变为 "confirmed" 时，保存返回的 session_id
```

### 2. 使用 session

在后续请求中，通过 query 参数携带 `session_id`：

```
GET /favorites/list?session_id=abc123-def456
```

## SSE 流式响应

`/chat/ask/stream` 接口使用 Server-Sent Events，返回格式如下：

```
data: 你好
data: ，
data: 欢迎
data: 使用
...
data: [[SOURCES_JSON]][{"bvid":"BV1xx411c7mD","title":"机器学习教程","url":"..."}]
```

最后一条消息以 `[[SOURCES_JSON]]` 开头，包含来源信息。

## 错误处理

所有接口在出错时返回统一的错误格式：

```json
{
  "detail": "错误描述信息"
}
```

常见 HTTP 状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或会话过期 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 路由策略说明

对话接口采用智能路由策略：

| 路由 | 说明 | 使用场景 |
|------|------|----------|
| `direct` | 直接回答 | 寒暄、闲聊、通用问题 |
| `db_list` | 列表回答 | "有哪些"、"清单"、"目录"类问题 |
| `db_content` | 内容总结 | "总结"、"概述"、"分析"类问题 |
| `vector` | 向量检索+RAG | 具体主题问题，需要检索相关内容 |

## 更新日志

- **2026-03-30**: 初始版本，支持完整 API 文档
