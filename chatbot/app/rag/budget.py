from __future__ import annotations

import re

_RANGE = re.compile(
    r"(?:between|from)\s+₹?\s*(\d[\d,]*)\s*(k)?\s*(?:and|to|-)\s*₹?\s*(\d[\d,]*)\s*(k)?"
    r"|(?:under|below)\s+₹?\s*(\d[\d,]*)\s*(k)?\s+(?:to|-)\s*₹?\s*(\d[\d,]*)\s*(k)?"
    r"|(?<![\d])(\d[\d,]*)\s*(k)?\s*(?:to|and|-)\s*₹?\s*(\d[\d,]*)\s*(k)?(?![\d])",
    re.IGNORECASE,
)
_MAX = re.compile(
    r"(?:under|below|less than|upto|up to|within|max(?:imum)?|budget(?: of)?)\s+₹?\s*(\d[\d,]*)\s*(k)?",
    re.IGNORECASE,
)
_MIN = re.compile(
    r"(?:above|over|more than|min(?:imum)?|at least)\s+₹?\s*(\d[\d,]*)\s*(k)?",
    re.IGNORECASE,
)


def _paise(number: str, unit: str | None) -> int:
    value = float(number.replace(",", ""))
    if unit:
        value *= 1000
    return int(round(value * 100))


def _remember(tokens: set[str], number: str, unit: str | None) -> None:
    digits = number.replace(",", "")
    tokens.add(digits)
    if unit:
        tokens.add(f"{digits}{unit.lower()}")


def _source(text: str) -> str:
    return re.sub(r"[:/|]+", " ", text or "")


def _range_amounts(match: re.Match[str]) -> tuple[int, int] | None:
    groups = match.groups()
    pairs = ((groups[0], groups[1]), (groups[4], groups[5]), (groups[8], groups[9]))
    chosen = next((pair for pair in pairs if pair[0]), None)
    if chosen is None:
        return None
    low_number, low_unit = chosen
    if chosen == pairs[0]:
        high_number, high_unit = groups[2], groups[3]
    elif chosen == pairs[1]:
        high_number, high_unit = groups[6], groups[7]
    else:
        high_number, high_unit = groups[10], groups[11]
    if not high_number:
        return None
    low_rupees = float(low_number.replace(",", "")) * (1000 if low_unit else 1)
    high_rupees = float(high_number.replace(",", "")) * (1000 if high_unit else 1)
    if not low_unit and not high_unit and low_rupees < 1000 and high_rupees < 1000:
        return None
    low = _paise(low_number, low_unit)
    high = _paise(high_number, high_unit)
    if low > high:
        low, high = high, low
    return low, high


def parse_budget(text: str) -> dict[str, int]:
    """Read a shopper budget in rupees and return paise bounds."""
    source = _source(text)
    found: dict[str, int] = {}
    ranged = _RANGE.search(source)
    amounts = _range_amounts(ranged) if ranged else None
    if amounts:
        low, high = amounts
        return {"min_price_paise": low, "max_price_paise": high}

    capped = _MAX.search(source)
    if capped:
        found["max_price_paise"] = _paise(capped.group(1), capped.group(2))
    floored = _MIN.search(source)
    if floored and "max_price_paise" not in found:
        found["min_price_paise"] = _paise(floored.group(1), floored.group(2))
    return found


def budget_tokens(text: str) -> set[str]:
    """Number tokens that belong to a budget phrase, not a model name."""
    tokens: set[str] = set()
    source = _source(text)
    for match in _RANGE.finditer(source):
        if _range_amounts(match) is None:
            continue
        groups = match.groups()
        pairs = (
            (groups[0], groups[1]),
            (groups[2], groups[3]),
            (groups[4], groups[5]),
            (groups[6], groups[7]),
            (groups[8], groups[9]),
            (groups[10], groups[11]),
        )
        for number, unit in pairs:
            if number:
                _remember(tokens, number, unit)
    for pattern in (_MAX, _MIN):
        for match in pattern.finditer(source):
            _remember(tokens, match.group(1), match.group(2))
    return tokens


__all__ = ["budget_tokens", "parse_budget"]
