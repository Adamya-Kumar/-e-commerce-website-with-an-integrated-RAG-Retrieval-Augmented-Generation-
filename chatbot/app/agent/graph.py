from __future__ import annotations

from typing import Any, TypedDict
from uuid import uuid4

from app.agent.guardrails import guard_input
from app.agent.prompts import build_system_prompt
from app.config import settings

CONFIRM_REQUIRED_TOOLS = {"place_order", "cancel_order", "request_return", "clear_cart"}

_pipeline_graph: Any | None = None
_checkpointer: Any | None = None


class AgentState(TypedDict, total=False):
    messages: list[dict[str, str]]
    user: dict[str, Any]
    page_context: dict[str, Any]
    pending_action: str | None
    confirmation_request: dict[str, Any]
    last_response: str
    status: str


class PipelineState(TypedDict, total=False):
    message: str
    history: list[dict[str, str]]
    user: dict[str, Any]
    analysis: dict[str, Any]
    candidates: list[dict[str, Any]]
    policies: list[dict[str, Any]]
    products: list[dict[str, Any]]
    answer: str
    filters_used: dict[str, Any]


def build_confirmation_summary(action: str, state: dict[str, Any] | None = None) -> dict[str, Any]:
    summary = {"action": action, "confirm_id": uuid4().hex}
    if action == "clear_cart":
        summary["summary"] = "Clear the current cart and remove every item from it."
    elif action == "place_order":
        summary["summary"] = "Place the current cart as a COD order."
    elif action == "cancel_order":
        summary["summary"] = "Cancel the selected order and restore stock if the order is still cancellable."
    elif action == "request_return":
        summary["summary"] = "Request a return for the selected order."
    else:
        summary["summary"] = f"Confirm the {action} action."

    if state and state.get("user"):
        summary["user_id"] = state["user"].get("id")
    return summary


def plan_next_action(message: str | None, *, is_guest: bool = False) -> dict[str, Any]:
    text = (message or "").lower()

    if any(term in text for term in ("place order", "place my order", "checkout", "buy now")):
        return {
            "tool_name": "place_order",
            "requires_confirmation": not is_guest,
            "confirmation_required": not is_guest,
        }
    if "cancel order" in text or "cancel my order" in text:
        return {
            "tool_name": "cancel_order",
            "requires_confirmation": not is_guest,
            "confirmation_required": not is_guest,
        }
    if "return order" in text or "request return" in text or "return my order" in text:
        return {
            "tool_name": "request_return",
            "requires_confirmation": not is_guest,
            "confirmation_required": not is_guest,
        }
    if "clear cart" in text or "empty cart" in text:
        return {
            "tool_name": "clear_cart",
            "requires_confirmation": not is_guest,
            "confirmation_required": not is_guest,
        }
    if "cart" in text and "show" in text:
        return {"tool_name": "get_cart", "requires_confirmation": False, "confirmation_required": False}
    if any(term in text for term in ("shipping", "return policy", "cod", "faq", "contact")):
        return {"tool_name": "get_policy", "requires_confirmation": False, "confirmation_required": False}
    if any(term in text for term in ("laptop", "phone", "headphone", "watch", "camera", "speaker")):
        return {
            "tool_name": "search_products",
            "requires_confirmation": False,
            "confirmation_required": False,
        }
    return {"tool_name": "search_products", "requires_confirmation": False, "confirmation_required": False}


def guard_input_node(state: dict[str, Any]) -> dict[str, Any]:
    message = state.get("messages", [{}])[-1].get("content", "") if state.get("messages") else ""
    is_guest = bool(state.get("user", {}).get("role") == "guest")
    guard = guard_input(message, is_guest=is_guest, page_context=state.get("page_context"))
    state["status"] = "ready" if guard["ok"] else "rejected"
    if not guard["ok"]:
        state["last_response"] = guard["message"]
    return state


def agent_node(state: dict[str, Any]) -> dict[str, Any]:
    message = state.get("messages", [{}])[-1].get("content", "") if state.get("messages") else ""
    action = plan_next_action(message, is_guest=bool(state.get("user", {}).get("role") == "guest"))
    state["pending_action"] = action["tool_name"] if action["requires_confirmation"] else None
    state["status"] = "awaiting_confirmation" if action["requires_confirmation"] else "ready"
    if action["requires_confirmation"]:
        state["confirmation_request"] = build_confirmation_summary(action["tool_name"], state)
    return state


def tools_node(state: dict[str, Any]) -> dict[str, Any]:
    state["status"] = "tool_executed"
    state["last_response"] = "Tool execution completed."
    return state


def respond_node(state: dict[str, Any]) -> dict[str, Any]:
    state["status"] = "completed"
    state["last_response"] = state.get("last_response") or (
        "I can help with product questions, shipping, and returns."
    )
    return state


def route_after_guard(state: dict[str, Any]) -> str:
    if state.get("status") == "rejected":
        return "respond"
    return "agent"


def confirm_node(state: dict[str, Any], *, interrupt: Any | None = None) -> dict[str, Any]:
    action = state.get("pending_action")
    if not action or action not in CONFIRM_REQUIRED_TOOLS:
        state["status"] = "approved"
        return state

    request = build_confirmation_summary(action, state)
    state["confirmation_request"] = request
    state["status"] = "awaiting_confirmation"

    if interrupt is not None:
        resume = interrupt(
            {"action": action, "summary": request["summary"], "confirm_id": request["confirm_id"]}
        )
        if isinstance(resume, dict):
            if resume.get("approve") is False:
                state["last_response"] = "The user declined the action."
                state["status"] = "declined"
            else:
                state["status"] = "approved"
    return state


def build_graph() -> Any | None:
    try:
        from langgraph.graph import END, START, StateGraph
    except Exception:
        return None

    builder = StateGraph(dict)
    builder.add_node("guard_input", guard_input_node)
    builder.add_node("agent", agent_node)
    builder.add_node("confirm", confirm_node)
    builder.add_node("tools", tools_node)
    builder.add_node("respond", respond_node)

    builder.add_edge(START, "guard_input")
    builder.add_conditional_edges("guard_input", route_after_guard, {"respond": "respond", "agent": "agent"})
    builder.add_edge("agent", "confirm")
    builder.add_conditional_edges(
        "confirm",
        lambda state: "tools" if state.get("status") == "approved" else "respond",
        {"tools": "tools", "respond": "respond"},
    )
    builder.add_edge("tools", "respond")
    builder.add_edge("respond", END)
    return builder.compile()


def _analyze_node(state: PipelineState) -> PipelineState:
    from app.rag.pipeline import stage_analyze

    analysis = stage_analyze(state.get("message") or "", state.get("history"))
    state["analysis"] = analysis.model_dump()
    state["filters_used"] = analysis.filters.model_dump(exclude_none=True)
    return state


def _retrieve_node(state: PipelineState) -> PipelineState:
    from app.rag.pipeline import stage_retrieve
    from app.rag.schemas import QueryAnalysis

    analysis = QueryAnalysis.model_validate(state.get("analysis") or {})
    candidates, policies = stage_retrieve(analysis)
    state["candidates"] = candidates
    state["policies"] = policies
    return state


def _rerank_node(state: PipelineState) -> PipelineState:
    from app.rag.pipeline import stage_rerank
    from app.rag.schemas import QueryAnalysis

    analysis = QueryAnalysis.model_validate(state.get("analysis") or {})
    state["candidates"] = stage_rerank(analysis, state.get("candidates") or [])
    return state


async def _hydrate_node(state: PipelineState) -> PipelineState:
    from app.rag.pipeline import stage_hydrate

    state["products"] = await stage_hydrate(state.get("candidates") or [], state.get("user"))
    return state


def _generate_node(state: PipelineState) -> PipelineState:
    from app.rag.pipeline import stage_generate
    from app.rag.schemas import QueryAnalysis

    analysis = QueryAnalysis.model_validate(state.get("analysis") or {})
    state["answer"] = stage_generate(
        state.get("message") or "",
        state.get("history"),
        analysis,
        state.get("products") or [],
        state.get("policies") or [],
    )
    return state


def build_pipeline_graph(checkpointer: Any | None = None) -> Any | None:
    try:
        from langgraph.graph import END, START, StateGraph
    except Exception:
        return None

    builder = StateGraph(PipelineState)
    builder.add_node("analyze", _analyze_node)
    builder.add_node("retrieve", _retrieve_node)
    builder.add_node("rerank", _rerank_node)
    builder.add_node("hydrate", _hydrate_node)
    builder.add_node("generate", _generate_node)
    builder.add_edge(START, "analyze")
    builder.add_edge("analyze", "retrieve")
    builder.add_edge("retrieve", "rerank")
    builder.add_edge("rerank", "hydrate")
    builder.add_edge("hydrate", "generate")
    builder.add_edge("generate", END)
    if checkpointer is not None:
        return builder.compile(checkpointer=checkpointer)
    return builder.compile()


def setup_postgres_checkpointer() -> dict[str, Any]:
    """Create the Postgres-backed LangGraph checkpoint store and call setup()."""
    global _checkpointer
    if not settings.postgres_url:
        return {"status": "fallback", "backend": "memory"}
    try:
        from langgraph.checkpoint.postgres import PostgresSaver

        saver = PostgresSaver.from_conn_string(settings.postgres_url)
        if hasattr(saver, "__enter__"):
            saver = saver.__enter__()
        saver.setup()
        _checkpointer = saver
        return {"status": "initialized", "backend": "postgres"}
    except Exception:
        _checkpointer = None
        return {"status": "fallback", "backend": "memory"}


def initialize_agent_runtime() -> dict[str, Any]:
    """Initialize the LangGraph checkpointer if the Postgres-backed runtime is available."""
    global _pipeline_graph
    result = setup_postgres_checkpointer()
    _pipeline_graph = build_pipeline_graph(_checkpointer)
    return result


def get_pipeline_graph() -> Any | None:
    global _pipeline_graph
    if _pipeline_graph is None:
        _pipeline_graph = build_pipeline_graph(_checkpointer)
    return _pipeline_graph


async def ainvoke_pipeline(
    message: str,
    history: list[dict[str, Any]] | None = None,
    user: dict[str, Any] | None = None,
    *,
    thread_id: str | None = None,
) -> dict[str, Any]:
    graph = get_pipeline_graph()
    payload: PipelineState = {
        "message": message,
        "history": list(history or []),
        "user": user or {},
        "candidates": [],
        "policies": [],
        "products": [],
        "answer": "",
        "filters_used": {},
    }
    if graph is None:
        from app.rag.pipeline import run_stages

        return await run_stages(message, history, user)

    config = {"configurable": {"thread_id": thread_id or str(uuid4())}}
    result = await graph.ainvoke(payload, config=config)
    return {
        "answer": result.get("answer") or "",
        "products": result.get("products") or [],
        "policies": result.get("policies") or [],
        "filters_used": result.get("filters_used") or {},
        "analysis": result.get("analysis") or {},
    }


def build_agent_state(
    message: str | None,
    *,
    user: dict[str, Any] | None = None,
    page_context: dict[str, Any] | None = None,
) -> AgentState:
    guard = guard_input(
        message,
        is_guest=bool(user and user.get("role") == "guest"),
        page_context=page_context,
    )
    if not guard["ok"]:
        return {
            "status": "rejected",
            "last_response": guard["message"],
            "messages": [{"role": "user", "content": message or ""}],
        }

    action = plan_next_action(message, is_guest=bool(user and user.get("role") == "guest"))
    state: AgentState = {
        "messages": [{"role": "user", "content": message or ""}],
        "user": user or {"id": "guest", "role": "guest", "token_present": False},
        "page_context": page_context or {},
        "status": "ready",
        "pending_action": action["tool_name"] if action["requires_confirmation"] else None,
    }

    if action["requires_confirmation"]:
        state["status"] = "awaiting_confirmation"
        state["confirmation_request"] = build_confirmation_summary(action["tool_name"], state)

    state["last_response"] = build_system_prompt(
        is_guest=bool(state["user"].get("role") == "guest"),
        page_context=state["page_context"],
    )
    return state
