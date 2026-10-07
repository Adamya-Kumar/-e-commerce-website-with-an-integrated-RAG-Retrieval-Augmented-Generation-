import { useState } from 'react';
import Button from '../ui/Button.jsx';

export default function Composer({ onSubmit, disabled }) {
  const [value, setValue] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="sr-only" htmlFor="chat-composer-input">
        Type a message for the shopping assistant
      </label>
      <textarea
        id="chat-composer-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={1}
        placeholder="Ask about a product or your order…"
        className="min-h-[44px] flex-1 resize-none rounded-2xl border border-light bg-canvas px-3 py-2.5 text-sm text-main placeholder:text-muted-green focus:border-forest-medium focus:outline-none"
        disabled={disabled}
      />
      <Button type="submit" variant="accent" className="h-11 shrink-0 rounded-xl px-4" disabled={disabled || !value.trim()}>
        <i className="bi bi-send" />
      </Button>
    </form>
  );
}
