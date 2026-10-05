/**
 * Fired after an admin creates, updates, or deletes a product.
 * Fire-and-forget sync to the chatbot ingest endpoint.
 * @param {object} product Plain product (`id`, catalog fields). On delete this is the product as it was before removal.
 */
export async function onProductChanged(product) {
  const chatbotUrl = process.env.CHATBOT_URL;
  const serviceKey = process.env.SERVICE_KEY;

  if (!chatbotUrl || !serviceKey) {
    return;
  }

  void syncProductToChatbot(product, chatbotUrl, serviceKey);
}

/**
 * @param {object} product
 * @param {string} chatbotUrl
 * @param {string} serviceKey
 */
async function syncProductToChatbot(product, chatbotUrl, serviceKey) {
  const baseUrl = chatbotUrl.replace(/\/$/, '');
  const payload = JSON.stringify({ product });
  const backoffMs = [250, 500, 1000];

  for (let attempt = 0; attempt < backoffMs.length + 1; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/ingest/product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': serviceKey,
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Chatbot ingest failed with status ${response.status}`);
      }
      return;
    } catch (err) {
      if (attempt === backoffMs.length) {
        console.error('Product sync to chatbot failed', err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
    }
  }
}
