import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

function buildEventPayload(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { text: raw };
  }
}

function normalizeMessage(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const role = typeof entry.role === 'string' ? entry.role : 'assistant';
  const content = typeof entry.content === 'string' ? entry.content : '';
  const uiCards = Array.isArray(entry.ui_cards) ? entry.ui_cards : Array.isArray(entry.cards) ? entry.cards : [];

  return {
    id: entry.id || `${role}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    cards: uiCards,
  };
}

export function useChatStream({ open, pageContext, user }) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const readSseStream = useCallback(async (response, streamName) => {
    if (!response.ok || !response.body) {
      const safeMessage = `The chat service is unavailable right now.`;
      throw new Error(safeMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const updateAssistantContent = (text) => {
      if (!text) return;
      setMessages((current) => {
        const next = [...current];
        const lastIndex = next.length - 1;
        const last = next[lastIndex];

        if (last && last.role === 'assistant' && !last.isComplete) {
          next[lastIndex] = {
            ...last,
            content: `${last.content || ''}${text}`,
          };
          return next;
        }

        const assistantMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'assistant',
          content: text,
          cards: [],
          isComplete: false,
        };

        next.push(assistantMessage);
        return next;
      });
    };

    const createAssistantMessage = (content = '', cards = []) => {
      setMessages((current) => {
        const next = [...current];
        const assistantMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'assistant',
          content,
          cards,
          isComplete: true,
        };

        next.push(assistantMessage);
        return next;
      });
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        let eventType = 'message';
        let rawData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            rawData += `${rawData ? '\n' : ''}${line.replace('data:', '').trim()}`;
          }
        }

        if (!rawData) continue;
        if (rawData === '[DONE]') {
          continue;
        }

        const payload = buildEventPayload(rawData);

        if (eventType === 'token') {
          const text = typeof payload?.text === 'string' ? payload.text : payload?.message || rawData;
          updateAssistantContent(text);
          continue;
        }

        if (eventType === 'tool_start') {
          setIsStreaming(true);
          continue;
        }

        if (eventType === 'ui_card') {
          const cards = Array.isArray(payload?.cards) ? payload.cards : [payload];
          const isCartCard = cards.some((card) => card?.type === 'cart' || card?.type === 'cart_summary');
          const isOrderCard = cards.some((card) => card?.type === 'order' || card?.type === 'orders');

          if (isCartCard) {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
          }
          if (isOrderCard) {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }

          setMessages((current) => {
            const next = [...current];
            const lastIndex = next.length - 1;
            if (lastIndex >= 0 && next[lastIndex]?.role === 'assistant' && !next[lastIndex]?.isComplete) {
              next[lastIndex] = {
                ...next[lastIndex],
                cards: [...(next[lastIndex].cards || []), ...cards],
              };
              return next;
            }

            const assistantMessage = {
              id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              role: 'assistant',
              content: '',
              cards,
              isComplete: false,
            };
            next.push(assistantMessage);
            return next;
          });
          continue;
        }

        if (eventType === 'confirmation_request') {
          const action = payload?.action || 'confirm';
          const summary = payload?.summary || 'Please confirm this action.';
          const confirmId = payload?.confirm_id || payload?.confirmId || '';
          setPendingAction({ action, summary, confirm_id: confirmId });
          setMessages((current) => {
            const next = [...current];
            const lastIndex = next.length - 1;
            const confirmationCard = {
              id: `confirmation-${Date.now()}`,
              type: 'confirmation',
              summary,
              action,
              confirm_id: confirmId,
            };

            if (lastIndex >= 0 && next[lastIndex]?.role === 'assistant' && !next[lastIndex]?.isComplete) {
              next[lastIndex] = {
                ...next[lastIndex],
                content: summary,
                cards: [...(next[lastIndex].cards || []), confirmationCard],
              };
              return next;
            }

            next.push({
              id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              role: 'assistant',
              content: summary,
              cards: [confirmationCard],
              isComplete: true,
            });
            return next;
          });
          continue;
        }

        if (eventType === 'error') {
          const message = payload?.message || payload?.error || 'The chatbot hit an issue.';
          setError(message);
          createAssistantMessage(message, []);
          continue;
        }

        if (eventType === 'done') {
          const nextThreadId = payload?.thread_id || payload?.threadId || threadId;
          if (nextThreadId) {
            setThreadId(nextThreadId);
          }
          setIsStreaming(false);
          setMessages((current) => {
            const next = [...current];
            const index = next.length - 1;
            if (index >= 0 && next[index]?.role === 'assistant' && !next[index]?.isComplete) {
              next[index] = { ...next[index], isComplete: true };
            }
            return next;
          });
          continue;
        }

        if (eventType === 'message' && payload && typeof payload === 'object') {
          const text = typeof payload.text === 'string' ? payload.text : payload?.message || '';
          if (text) {
            updateAssistantContent(text);
          }
        }
      }
    }

    if (buffer.trim()) {
      const payload = buildEventPayload(buffer.trim());
      if (payload && typeof payload.text === 'string') {
        updateAssistantContent(payload.text);
      }
    }

    if (streamName === 'confirm') {
      setPendingAction(null);
    }
  }, [queryClient, threadId]);

  const sendRequest = useCallback(
    async (message, action = 'chat') => {
      setError('');
      setIsStreaming(true);

      const body = action === 'confirm'
        ? {
            thread_id: threadId,
            confirm_id: pendingAction?.confirm_id || pendingAction?.confirmId,
            approve: message,
          }
        : {
            thread_id: threadId || undefined,
            message,
            page_context: pageContext,
          };

      const endpoint = action === 'confirm' ? '/api/chat/confirm' : '/api/chat';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        if (!response.ok && response.status === 401) {
          setPendingAction({
            action: 'login_required',
            summary: 'Please log in to continue with that action.',
            confirm_id: '',
          });
          setIsStreaming(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const fallback = data?.error?.message || 'The chat request failed.';
          setError(fallback);
          setIsStreaming(false);
          return;
        }

        await readSseStream(response, action);
      } catch (requestError) {
        setError(requestError?.message || 'The chat request failed.');
        setIsStreaming(false);
      }
    },
    [pageContext, pendingAction, readSseStream, threadId],
  );

  const sendMessage = useCallback(
    (message) => {
      if (!message || !message.trim()) return;
      setMessages((current) => [
        ...current,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message.trim(),
          cards: [],
        },
      ]);
      void sendRequest(message.trim(), 'chat');
    },
    [sendRequest],
  );

  const confirmAction = useCallback(
    (approve) => {
      if (!pendingAction) return;
      if (!threadId && !pendingAction.confirm_id) {
        setPendingAction(null);
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: approve ? 'Confirm' : 'Cancel',
          cards: [],
        },
      ]);
      void sendRequest(approve, 'confirm');
    },
    [pendingAction, sendRequest, threadId],
  );

  useEffect(() => {
    if (!open || !user) {
      return undefined;
    }

    let active = true;
    setIsLoadingHistory(true);

    fetch('/api/chat/sessions/latest', {
      credentials: 'include',
    })
      .then(async (response) => {
        if (!active || !response.ok) {
          return;
        }
        const payload = await response.json().catch(() => null);
        const entries = payload?.data?.messages ?? payload?.messages ?? [];
        const nextMessages = entries
          .map(normalizeMessage)
          .filter(Boolean);
        if (nextMessages.length > 0) {
          setMessages(nextMessages);
          const latestThreadId =
            payload?.id ||
            payload?.data?.id ||
            payload?.data?.session?.id ||
            payload?.session?.id ||
            '';
          if (latestThreadId) {
            setThreadId(latestThreadId);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setPendingAction(null);
      setError('');
    }
  }, [open]);

  return {
    messages,
    threadId,
    isStreaming,
    isLoadingHistory,
    pendingAction,
    error,
    sendMessage,
    confirmAction,
    setPendingAction,
  };
}
