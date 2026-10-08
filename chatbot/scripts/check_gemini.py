from __future__ import annotations

import sys

from app.config import settings

try:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from langchain_groq import ChatGroq
except ImportError as exc:  # pragma: no cover - dependency install check
    raise SystemExit(
        "Missing Python dependencies. Install the project dependencies with "
        "`pip install -r requirements.txt` first."
    ) from exc


def main() -> int:
    if not settings.has_groq_credentials or not settings.has_gemini_credentials:
        print(
            "Missing model configuration. Set GROQ_API_KEY, GROQ_CHAT_MODEL, "
            "GOOGLE_API_KEY, and GEMINI_EMBED_MODEL in chatbot/.env."
        )
        return 1

    chat = ChatGroq(
        model=settings.groq_chat_model,
        groq_api_key=settings.groq_api_key,
        temperature=0,
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
