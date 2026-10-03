import { unitPricePaise } from '../lib/money.js';

/** Static storefront copy until P1-10 reads the catalog API. Prices are paise. */

const GALLERY_LABELS = ['Front', 'Detail', 'Angle'];

export const PLACEHOLDER_CATEGORIES = [
  { name: 'Laptops', slug: 'laptops', icon: 'bi bi-laptop' },
  { name: 'Mobiles', slug: 'mobiles', icon: 'bi bi-phone' },
  { name: 'Audio', slug: 'audio', icon: 'bi bi-headphones' },
  { name: "Men's Fashion", slug: 'mens-fashion', icon: 'bi bi-person' },
  { name: "Women's Fashion", slug: 'womens-fashion', icon: 'bi bi-handbag' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', icon: 'bi bi-cup-hot' },
];

export const PLACEHOLDER_PRODUCTS = [
  product(
    'laptops',
    'dell-inspiron-15-laptop',
    'Dell Inspiron 15 Laptop',
    'Dell',
    5499900,
    10,
    12,
    'bi bi-laptop',
    'Everyday Windows laptop with a full-size keyboard and all-day battery.',
    {
      color: 'Platinum Silver',
      ram: '16 GB',
      storage: '512 GB SSD',
      specs: 'Intel Core i5, 15.6 inch FHD',
    },
  ),
  product(
    'laptops',
    'lenovo-ideapad-slim-3-laptop',
    'Lenovo IdeaPad Slim 3 Laptop',
    'Lenovo',
    4299900,
    12,
    20,
    'bi bi-laptop',
    'Thin Windows laptop for classes, browsing, and office work.',
    {
      color: 'Arctic Grey',
      ram: '8 GB',
      storage: '512 GB SSD',
      specs: 'AMD Ryzen 5, 14 inch',
    },
  ),
  product(
    'mobiles',
    'samsung-galaxy-m35',
    'Samsung Galaxy M35',
    'Samsung',
    2499900,
    8,
    6,
    'bi bi-phone',
    'A large-display phone with a long battery and a bright AMOLED screen.',
    {
      color: 'Thunder Grey',
      ram: '8 GB',
      storage: '128 GB',
      specs: '120 Hz display, 50 MP camera',
    },
  ),
  product(
    'audio',
    'sony-noise-cancelling-headphones',
    'Sony Noise Cancelling Headphones',
    'Sony',
    1299900,
    18,
    7,
    'bi bi-headphones',
    'Over-ear headphones with noise cancelling for commutes and calls.',
    {
      color: 'Black',
      specs: '30 hour battery, Bluetooth 5.3',
    },
  ),
  product(
    'audio',
    'boat-wireless-earbuds',
    'boAt Wireless Earbuds',
    'boAt',
    199900,
    0,
    0,
    'bi bi-earbuds',
    'Compact earbuds for music and calls. This sample is out of stock.',
    {
      color: 'Navy',
      specs: 'IPX4, 40 hour case',
    },
  ),
  product(
    'mens-fashion',
    'snitch-cotton-oxford-shirt',
    'Cotton Oxford Shirt',
    'Snitch',
    149900,
    20,
    30,
    'bi bi-person',
    'A breathable cotton shirt with a button-down collar.',
    {
      color: 'Sky Blue',
      size: 'M',
      specs: '100% cotton',
    },
  ),
  product(
    'womens-fashion',
    'libas-floral-midi-dress',
    'Floral Midi Dress',
    'Libas',
    249900,
    15,
    14,
    'bi bi-handbag',
    'A printed midi dress with a relaxed fit for warm weather.',
    {
      color: 'Sage Print',
      size: 'S',
      specs: 'Viscose blend',
    },
  ),
  product(
    'home-kitchen',
    'prestige-ceramic-cookware-set',
    'Ceramic Cookware Set',
    'Prestige',
    399900,
    5,
    9,
    'bi bi-cup-hot',
    'A three-piece ceramic set for everyday cooking.',
    {
      color: 'Ivory',
      specs: 'Induction ready, 3 pieces',
    },
  ),
];

function product(
  categorySlug,
  slug,
  title,
  brand,
  price,
  discountPercent,
  stock,
  icon,
  description,
  attributes,
) {
  const category = PLACEHOLDER_CATEGORIES.find((entry) => entry.slug === categorySlug);
  return {
    slug,
    title,
    brand,
    category: category.name,
    categorySlug,
    price,
    discountPercent,
    stock,
    icon,
    description,
    attributes,
    gallery: GALLERY_LABELS.map((label) => ({ label, icon })),
  };
}

export function brandsInCatalog() {
  return [...new Set(PLACEHOLDER_PRODUCTS.map((entry) => entry.brand))].sort();
}

/**
 * @param {typeof PLACEHOLDER_PRODUCTS} products
 * @param {{ category: string, brand: string, minPaise: number | null, maxPaise: number | null, inStock: boolean }} filters
 */
export function filterPlaceholderProducts(products, filters) {
  return products.filter((entry) => {
    if (filters.category !== 'All' && entry.category !== filters.category) return false;
    if (filters.brand !== 'All' && entry.brand !== filters.brand) return false;
    if (filters.inStock && entry.stock < 1) return false;
    const sale = unitPricePaise(entry.price, entry.discountPercent);
    if (filters.minPaise != null && sale < filters.minPaise) return false;
    if (filters.maxPaise != null && sale > filters.maxPaise) return false;
    return true;
  });
}
