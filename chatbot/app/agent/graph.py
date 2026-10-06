from __future__ import annotations

from typing import Any, TypedDict
from uuid import uuid4

from app.agent.guardrails import guard_input
from app.agent.prompts import build_system_prompt
from app.config import settings

CONFIRM_REQUIRED_TOOLS = {"place_order", "cancel_order", "request_return", "clear_cart"}


class AgentState(TypedDict, total=False):
    messages: list[dict[str, str]]
    user: dict[str, Any]
    page_context: dict[str, Any]
    pending_action: str | None
    confirmation_request: dict[str, Any]
    last_response: str
    status: str


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

    if any(term in text for term in ("place order", "checkout", "buy now")):
        return {"tool_name": "place_order", "requires_confirmation": not is_guest, "confirmation_required": not is_guest}
    if "cancel order" in text or "cancel my order" in text:
        return {"tool_name": "cancel_order", "requires_confirmation": not is_guest, "confirmation_required": not is_guest}
    if "return order" in text or "request return" in text or "return my order" in text:
        return {"tool_name": "request_return", "requires_confirmation": not is_guest, "confirmation_required": not is_guest}
    if "clear cart" in text or "empty cart" in text:
        return {"tool_name": "clear_cart", "requires_confirmation": not is_guest, "confirmation_required": not is_guest}
    if "cart" in text and "show" in text:
        return {"tool_name": "get_cart", "requires_confirmation": False, "confirmation_required": False}
    if any(term in text for term in ("shipping", "return policy", "cod", "faq", "contact")):
        return {"tool_name": "get_policy", "requires_confirmation": False, "confirmation_required": False}
    if any(term in text for term in ("laptop", "phone", "headphone", "watch", "camera", "speaker")):
        return {"tool_name": "search_products", "requires_confirmation": False, "confirmation_required": False}
    return {"tool_name": "search_products", "requires_confirmation": False, "confirmation_required": False}


def guard_input_node(state: dict[str, Any]) -> dict[str, Any]:
    message = state.get("messages", [{}])[-1].get("content", "") if state.get("messages") else ""
    guard = guard_input(message, is_guest=bool(state.get("user", {}).get("role") == "guest"), page_context=state.get("page_context"))
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
    state["last_response"] = state.get("last_response") or "I can help with product questions, shipping, and returns."
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
        resume = interrupt({"action": action, "summary": request["summary"], "confirm_id": request["confirm_id"]})
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


def setup_postgres_checkpointer() -> dict[str, Any]:
    """Create the Postgres-backed LangGraph checkpoint store and call setup()."""
    try:
        from langgraph.checkpoint.postgres import PostgresSaver

        saver = PostgresSaver.from_conn_string(settings.postgres_url)
        saver.setup()
        return {"status": "initialized", "backend": "postgres"}
    except Exception:
        return {"status": "fallback", "backend": "memory"}


def initialize_agent_runtime() -> dict[str, Any]:
    """Initialize the LangGraph checkpointer if the Postgres-backed runtime is available."""
    return setup_postgres_checkpointer()


def build_agent_state(message: str | None, *, user: dict[str, Any] | None = None, page_context: dict[str, Any] | None = None) -> AgentState:
    guard = guard_input(message, is_guest=bool(user and user.get("role") == "guest"), page_context=page_context)
    if not guard["ok"]:
        return {"status": "rejected", "last_response": guard["message"], "messages": [{"role": "user", "content": message or ""}]}

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
