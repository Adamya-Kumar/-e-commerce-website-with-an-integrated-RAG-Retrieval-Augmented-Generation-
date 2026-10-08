const PROMPTS = {
  home: [
    'Best laptop under 60000',
    'What is the return policy?',
    'Show me wireless earbuds',
  ],
  product_detail: [
    'Is this good for gaming?',
    'Show similar under the same price',
    'Add this to my cart',
  ],
  cart: [
    'Review my cart',
    'Place my order',
    'Remove the cheapest item',
  ],
  orders: [
    'Track my latest order',
    'Can you cancel it?',
    'Show return options',
  ],
  generic: [
    'Find a good laptop',
    'What are the delivery options?',
    'Can you help with my cart?',
  ],
  admin: [
    'Which products are low on stock?',
    'How are orders looking?',
    'What is the store revenue?',
    'Summarize the recent orders',
  ],
};

export default function SuggestedPrompts({ pageType, onSelect }) {
  const prompts = PROMPTS[pageType] || PROMPTS.generic;

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-green">Suggested</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-lime/40 bg-lime-soft px-3 py-1.5 text-xs font-semibold text-forest-medium transition hover:bg-lime/40"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
