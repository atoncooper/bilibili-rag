"""
API Key Manager — 用户 API Key 的加密存储、缓存和动态解析

职责：
1. AES-256-GCM 加密/解密
2. 内存缓存（只存密文，TTL 5 分钟）
3. 提供 get_llm_credentials / get_embedding_credentials 接口
4. Key mask 展示

依赖：UserSettingsRepository（数据库 CRUD）
"""
import asyncio
import base64
import os
import time
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.repository.user_settings_repository import (
    UserSettingsRepository,
    get_user_settings_repository,
)


@dataclass
class UserCredentials:
    """用户凭据（临时持有，用完即释放）"""
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None


@dataclass
class _CacheEntry:
    """缓存条目（只存密文）"""
    llm_key_encrypted: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = None
    embedding_key_encrypted: Optional[str] = None
    embedding_base_url: Optional[str] = None
    embedding_model: Optional[str] = None
    expire_at: float = 0.0


class ApiKeyManager:
    """
    用户 API Key 管理器（LLM + Embedding 双 Key）

    关键安全原则：
    - 数据库存密文
    - 缓存只存密文
    - 使用时临时解密，用完即释放
    """

    CACHE_TTL = 300  # 5 分钟

    def __init__(
        self,
        encryption_key_b64: Optional[str] = None,
        repository: Optional[UserSettingsRepository] = None,
    ):
        self._lock = asyncio.Lock()
        self._cache: dict[str, _CacheEntry] = {}
        self._repo = repository or get_user_settings_repository()

        if encryption_key_b64:
            try:
                key_bytes = base64.b64decode(encryption_key_b64)
                if len(key_bytes) != 32:
                    raise ValueError(f"Key is {len(key_bytes)} bytes, expected 32")
                self._aesgcm = AESGCM(key_bytes)
                logger.info("[API_KEY_MANAGER] initialized with AES-256-GCM encryption")
            except Exception as e:
                self._aesgcm = None
                logger.warning(
                    f"[API_KEY_MANAGER] invalid encryption key ({e}), "
                    "API keys will be stored WITHOUT encryption"
                )
        else:
            self._aesgcm = None
            logger.warning(
                "[API_KEY_MANAGER] encryption key not configured, "
                "API keys will be stored WITHOUT encryption"
            )
        self._enabled = True

    # ———————— 对外接口 ————————

    async def get_llm_credentials(
        self, session_id: Optional[str], db: AsyncSession
    ) -> Optional[UserCredentials]:
        """
        获取用户 LLM 配置。
        返回 None = 用户未配置，应使用系统默认 Key（会产生费用）。
        """
        if not session_id or not self._enabled:
            return None
        entry = await self._get_cache_entry(session_id, db)
        if not entry or not entry.llm_key_encrypted:
            return None
        try:
            return UserCredentials(
                api_key=self._decrypt(entry.llm_key_encrypted),
                base_url=entry.llm_base_url,
                model=entry.llm_model,
            )
        except Exception as e:
            logger.error(f"[API_KEY_MANAGER] failed to decrypt LLM key: {e}")
            return None

    async def get_embedding_credentials(
        self, session_id: Optional[str], db: AsyncSession
    ) -> Optional[UserCredentials]:
        """
        获取用户 Embedding 配置。
        返回 None = 用户未配置，应使用系统默认 Key（会产生费用）。
        """
        if not session_id or not self._enabled:
            return None
        entry = await self._get_cache_entry(session_id, db)
        if not entry or not entry.embedding_key_encrypted:
            return None
        try:
            return UserCredentials(
                api_key=self._decrypt(entry.embedding_key_encrypted),
                base_url=entry.embedding_base_url,
                model=entry.embedding_model,
            )
        except Exception as e:
            logger.error(f"[API_KEY_MANAGER] failed to decrypt embedding key: {e}")
            return None

    async def set_credentials(
        self,
        session_id: str,
        llm_key: Optional[str] = None,
        llm_base_url: Optional[str] = None,
        llm_model: Optional[str] = None,
        embedding_key: Optional[str] = None,
        embedding_base_url: Optional[str] = None,
        embedding_model: Optional[str] = None,
        db: AsyncSession = None,
    ) -> None:
        """设置用户 API Key（支持部分更新，None 值不覆盖已有配置）。"""
        # 委托给 Repository 进行数据库操作
        await self._repo.upsert(
            session_id=session_id,
            db=db,
            llm_api_key_encrypted=self._encrypt(llm_key) if llm_key else None,
            llm_base_url=llm_base_url,
            llm_model=llm_model,
            embedding_api_key_encrypted=self._encrypt(embedding_key) if embedding_key else None,
            embedding_base_url=embedding_base_url,
            embedding_model=embedding_model,
        )

        # 立即清除该 session 的缓存
        async with self._lock:
            self._cache.pop(session_id, None)
        logger.info(
            f"[API_KEY_MANAGER] credentials updated for session={session_id[:8]}..."
        )

    async def delete_credentials(self, session_id: str, db: AsyncSession) -> None:
        """删除用户所有自定义 API Key，回退到系统默认（会产生费用）。"""
        await self._repo.delete(session_id, db)

        async with self._lock:
            self._cache.pop(session_id, None)
        logger.info(
            f"[API_KEY_MANAGER] credentials deleted for session={session_id[:8]}..."
        )

    async def get_status(self, session_id: str, db: AsyncSession) -> dict:
        """获取用户 API Key 配置状态（不返回完整 Key）。"""
        entry = await self._get_cache_entry(session_id, db)
        if not entry:
            return {
                "llm_is_configured": False,
                "llm_masked_key": None,
                "llm_base_url": None,
                "llm_model": None,
                "embedding_is_configured": False,
                "embedding_masked_key": None,
                "embedding_base_url": None,
                "embedding_model": None,
                "updated_at": None,
            }

        # 读取 updated_at（通过 Repository）
        record = await self._repo.get_by_session_id(session_id, db)

        def _safe_decrypt(ciphertext):
            if not ciphertext:
                return None
            try:
                return self._decrypt(ciphertext)
            except Exception:
                return None

        return {
            "llm_is_configured": entry.llm_key_encrypted is not None,
            "llm_masked_key": (
                self._mask_key(_safe_decrypt(entry.llm_key_encrypted))
                if entry.llm_key_encrypted
                else None
            ),
            "llm_base_url": entry.llm_base_url,
            "llm_model": entry.llm_model,
            "embedding_is_configured": entry.embedding_key_encrypted is not None,
            "embedding_masked_key": (
                self._mask_key(_safe_decrypt(entry.embedding_key_encrypted))
                if entry.embedding_key_encrypted
                else None
            ),
            "embedding_base_url": entry.embedding_base_url,
            "embedding_model": entry.embedding_model,
            "updated_at": record.updated_at if record else None,
        }

    # ———————— 同步方法（供 chat.py 的同步 _get_llm 使用） ————————

    def get_llm_key_sync(self, session_id: Optional[str]) -> Optional[UserCredentials]:
        """
        同步获取用户 LLM Key（仅从缓存读取，不查数据库）。

        用于 chat.py 的同步 _get_llm() 函数。
        缓存未命中时返回 None，调用方应使用默认 Key。
        """
        if not session_id or not self._enabled:
            return None

        entry = self._cache.get(session_id)
        if not entry or not entry.llm_key_encrypted:
            return None
        if entry.expire_at < time.time():
            return None  # 过期，等待下次异步刷新

        try:
            return UserCredentials(
                api_key=self._decrypt(entry.llm_key_encrypted),
                base_url=entry.llm_base_url,
                model=entry.llm_model,
            )
        except Exception as e:
            logger.error(f"[API_KEY_MANAGER] sync decrypt failed: {e}")
            return None

    async def preload_cache(self, session_id: str, db: AsyncSession) -> None:
        """
        预加载用户凭据到缓存（在请求入口的异步上下文中调用）。

        确保后续同步的 _get_llm() 调用能命中缓存。
        """
        if not session_id or not self._enabled:
            return
        await self._get_cache_entry(session_id, db)

    # ———————— 内部方法 ————————

    async def _get_cache_entry(
        self, session_id: str, db: AsyncSession
    ) -> Optional[_CacheEntry]:
        """从缓存获取条目（缓存未命中则通过 Repository 查库并写入缓存）。"""
        now = time.time()

        # 检查缓存
        async with self._lock:
            entry = self._cache.get(session_id)
            if entry and entry.expire_at > now:
                return entry

        # 缓存未命中，通过 Repository 查数据库
        record = await self._repo.get_by_session_id(session_id, db)

        if not record:
            # 缓存空结果（防止缓存穿透）
            async with self._lock:
                self._cache[session_id] = _CacheEntry(expire_at=now + self.CACHE_TTL)
            return None

        entry = _CacheEntry(
            llm_key_encrypted=record.llm_api_key_encrypted,
            llm_base_url=record.llm_base_url,
            llm_model=record.llm_model,
            embedding_key_encrypted=record.embedding_api_key_encrypted,
            embedding_base_url=record.embedding_base_url,
            embedding_model=record.embedding_model,
            expire_at=now + self.CACHE_TTL,
        )

        async with self._lock:
            self._cache[session_id] = entry
        return entry

    def _encrypt(self, plaintext: str) -> str:
        """AES-256-GCM 加密 → base64(nonce + ciphertext)。若无加密密钥则明文 base64 存储。"""
        if self._aesgcm is None:
            return base64.b64encode(plaintext.encode()).decode()
        nonce = os.urandom(12)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ciphertext).decode()

    def _decrypt(self, ciphertext_b64: str) -> str:
        """base64 → 解密。若无加密密钥则直接 base64 解码返回明文。"""
        raw = base64.b64decode(ciphertext_b64)
        if self._aesgcm is None:
            return raw.decode()
        nonce, ciphertext = raw[:12], raw[12:]
        return self._aesgcm.decrypt(nonce, ciphertext, None).decode()

    def _mask_key(self, api_key: str) -> str:
        """隐藏 Key 中间部分，如 'sk-abc...4f2a'。"""
        if len(api_key) <= 11:
            return api_key[:3] + "***" + api_key[-3:]
        return api_key[:6] + "***" + api_key[-4:]

    @property
    def is_enabled(self) -> bool:
        return self._enabled
