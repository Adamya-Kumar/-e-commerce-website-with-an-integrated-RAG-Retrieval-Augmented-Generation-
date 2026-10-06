from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.config import settings


class ToolError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None, payload: Any | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload

    def __str__(self) -> str:
        return self.message


class ExpressClient:
    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.base_url = (base_url or str(settings.express_base_url)).rstrip("/")
        self.token = token
        self.timeout = timeout
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)

    async def __aenter__(self) -> "ExpressClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    @staticmethod
    def _error_message(payload: Any, fallback: str) -> str:
        if isinstance(payload, dict):
            error = payload.get("error")
            if isinstance(error, dict):
                message = error.get("message")
                if message:
                    return str(message)
            message = payload.get("message")
            if message:
                return str(message)
        if isinstance(payload, str):
            return payload
        return fallback

    def _raise_for_status(self, response: httpx.Response) -> Any:
        if response.is_error:
            payload: Any = {}
            try:
                payload = response.json()
            except ValueError:
                payload = {"message": response.text}
            message = self._error_message(payload, response.text or "The Express API request failed.")
            raise ToolError(message, status_code=response.status_code, payload=payload)

        try:
            return response.json()
        except ValueError:
            return {"status": "ok"}

    def request(self, method: str, path: str, **kwargs: Any) -> Any:
        return asyncio.run(self._request(method, path, **kwargs))

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = dict(kwargs.pop("headers", {}) or {})
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        try:
            response = await self._client.request(
                method.upper(),
                path,
                headers=headers,
                **kwargs,
            )
        except httpx.TimeoutException as exc:
            raise ToolError("The Express API timed out. Please try again.") from exc
        except httpx.HTTPError as exc:
            raise ToolError("The Express API is unavailable. Please try again.") from exc

        return self._raise_for_status(response)

    def get(self, path: str, **kwargs: Any) -> Any:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> Any:
        return self.request("POST", path, **kwargs)

    def patch(self, path: str, **kwargs: Any) -> Any:
        return self.request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Any:
        return self.request("DELETE", path, **kwargs)


__all__ = ["ExpressClient", "ToolError"]
