/**
 * Fired after an admin creates, updates, or deletes a product.
 * No-op until Phase 2 sends the product to the chatbot ingest endpoint.
 * Callers must not fail the admin request when this throws.
 * @param {object} product Plain product (`id`, catalog fields). On delete this is the product as it was before removal.
 */
export async function onProductChanged(product) {
  void product;
}
