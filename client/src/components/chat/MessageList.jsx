import CartCard from './CartCard.jsx';
import ConfirmationCard from './ConfirmationCard.jsx';
import OrderCard from './OrderCard.jsx';
import ProductCardMini from './ProductCardMini.jsx';
import TypingDots from './TypingDots.jsx';

function renderCard(card, onConfirm, onDecline) {
  if (!card || typeof card !== 'object') return null;

  if (card.type === 'products' || card.type === 'product') {
    const products = card.products
      || card.items
      || card.payload?.products
      || card.payload?.items
      || (card.product ? [card.product] : card.type === 'product' ? [card] : []);

    return products.length > 0
      ? <ProductCardMini key={card.id || JSON.stringify(card)} products={products} />
      : null;
  }

  if (card.type === 'cart' || card.type === 'cart_summary') {
    return <CartCard key={card.id || 'cart-card'} cart={card.cart || card.data || card} />;
  }

  if (card.type === 'order' || card.type === 'orders') {
    return <OrderCard key={card.id || 'order-card'} order={card.order || card.data || card} />;
  }

  if (card.type === 'confirmation') {
    return (
      <ConfirmationCard
        key={card.id || 'confirmation-card'}
        summary={card.summary || 'Please confirm this action.'}
        action={card.action}
        onConfirm={onConfirm}
        onCancel={onDecline}
      />
    );
  }

  return (
    <div key={card.id || 'fallback-card'} className="rounded-xl bg-canvas p-3 text-xs text-muted-green">
      {typeof card.summary === 'string' ? card.summary : 'Related information'}
    </div>
  );
}

export default function MessageList({ messages, isStreaming, onConfirm, onDecline }) {
  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <div key={message.id} className={`flex min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`min-w-0 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={[
                  'overflow-hidden break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-spark-sm',
                  isUser ? 'bg-forest-medium text-white' : 'bg-white text-main',
                ].join(' ')}
              >
                {message.content ? (
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
                ) : null}
              </div>
              {Array.isArray(message.cards) && message.cards.length > 0 ? (
                <div className="mt-2 space-y-2">{message.cards.map((card) => renderCard(card, onConfirm, onDecline))}</div>
              ) : null}
            </div>
          </div>
        );
      })}

      {isStreaming ? (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-white p-3 shadow-spark-sm">
            <TypingDots />
          </div>
        </div>
      ) : null}

    </div>
  );
}
