import Dexie from 'dexie';

export const db = new Dexie('POSLocalDB');

const generateBarcode = (name) => {
  const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

db.version(8).stores({
  products: '++id, name, price, barcode, categoryType, unitType, stock, image, synced',
  orders: '++id, timestamp, total',
  orderItems: '++id, orderId, productId',
  settings: 'id',
  deletedProducts: '++id, barcode'
}).upgrade(trans => {
  return trans.table('products').toCollection().modify(product => {
    if (!product.barcode || product.barcode.trim() === '') {
      product.barcode = generateBarcode(product.name);
    }
    if (product.stock === undefined) product.stock = 0;
    if (product.image === undefined) product.image = '';
    if (product.synced === undefined) product.synced = 0;
  });
});

export async function ensureStoragePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
      console.log('Persistent storage requested');
    }
  }
}