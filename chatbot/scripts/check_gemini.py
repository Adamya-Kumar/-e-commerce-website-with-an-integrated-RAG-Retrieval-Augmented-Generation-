from __future__ import annotations

import sys

from app.config import settings

try:
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
except ImportError as exc:  # pragma: no cover - dependency install check
    raise SystemExit(
        "Missing Python dependencies. Install the project dependencies with `pip install -e .` first."
    ) from exc


def main() -> int:
    if not settings.google_api_key or not settings.gemini_chat_model or not settings.gemini_embed_model:
        print(
            "Missing Gemini configuration. Set GOOGLE_API_KEY, GEMINI_CHAT_MODEL, and GEMINI_EMBED_MODEL "
            "in a local .env file before running this script."
        )
        return 1

    chat = ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=settings.google_api_key,
    )
    embeddings = GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embed_model,
        google_api_key=settings.google_api_key,
    )

    reply = chat.invoke("Reply with the word ok and nothing else.")
    vectors = embeddings.embed_query("spark commerce chatbot connectivity check")

    print(f"Chat reply: {reply.content}")
    print(f"Embedding length: {len(vectors)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
