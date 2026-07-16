import api from '../api/axios';
import { db } from '../utils/database';
import io from 'socket.io-client';
import store from '../store';
import { updateStockFromSocket, setProducts } from '../store/productsSlice';

let socket = null;

const log = (msg) => console.log(`[Sync ${new Date().toLocaleTimeString()}] ${msg}`);

export const connectSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io({ auth: { token } });

  socket.on('lowStockAlert', (alert) => {
    log('🔴 Low Stock Alert received');
    console.log(alert);
  });

  socket.on('stockUpdated', (data) => {
    log(`🔄 Real-time stock update: product ${data.productId} → ${data.stock}`);
    db.products.update(Number(data.productId), { stock: data.stock })
      .catch(err => console.error('Dexie update error', err));
    store.dispatch(updateStockFromSocket(data));
  });

  return socket;
};

export const syncLocalToBackend = async () => {
  if (!navigator.onLine) {
    log('🌐 Offline – sync skipped');
    return;
  }

  try {
    const unsynced = await db.products.where('synced').equals(0).toArray();
    log(`📤 Found ${unsynced.length} unsynced product(s)`);

    if (unsynced.length === 0) {
      log('✅ Everything already synced');
      return;
    }

    const payload = unsynced.map(p => ({
      name: p.name,
      price: p.price,
      barcode: p.barcode,
      category: p.categoryType,
      unit: p.unitType,
      description: p.description,
      stock: p.stock || 0,
      imageUrl: p.image || ''
    }));

    log(`🚀 Sending ${payload.length} product(s) to server...`);
    await api.post('/products/sync', { products: payload });
    log('✅ Server confirmed sync');

    for (const p of unsynced) {
      await db.products.update(p.id, { synced: 1 });
    }
    log(`📌 Marked ${unsynced.length} product(s) as synced locally`);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    log('❌ Sync failed – check network or backend');
    throw err;
  }
};

export const pullProductsFromBackend = async () => {
  if (!navigator.onLine) {
    log('🌐 Offline – pull skipped');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    log('📥 Pulling products from server...');
    const response = await api.get('/products/my-products');
    const serverProducts = response.data;

    log(`📦 Received ${serverProducts.length} product(s) from server`);

    // Get list of deleted barcodes (safety net)
    const deletedItems = await db.deletedProducts.toArray();
    const deletedBarcodes = new Set(deletedItems.map(d => d.barcode).filter(Boolean));

    // Build a set of barcodes (or names) that the server knows about
    const serverBarcodes = new Set();
    const serverNames = new Set();
    serverProducts.forEach(sp => {
      if (sp.barcode) serverBarcodes.add(sp.barcode);
      serverNames.add(sp.name.toLowerCase());
    });

    let addedCount = 0, updatedCount = 0, skippedCount = 0, prunedCount = 0;

    await db.transaction('rw', db.products, db.deletedProducts, async () => {
      // ---- Pull (add/update) ----
      for (const sp of serverProducts) {
        // Skip if barcode is in the local delete list
        if (sp.barcode && deletedBarcodes.has(sp.barcode)) {
          skippedCount++;
          continue;
        }

        let existing = null;
        if (sp.barcode && typeof sp.barcode === 'string' && sp.barcode.trim() !== '') {
          existing = await db.products.where('barcode').equals(sp.barcode).first();
        }
        if (!existing) {
          existing = await db.products.where('name').equals(sp.name).first();
        }

        if (existing) {
          await db.products.update(existing.id, {
            name: sp.name,
            price: sp.price,
            stock: sp.stock,
            image: sp.imageUrl || '',
            categoryType: sp.category,
            unitType: sp.unit,
            description: sp.description,
            synced: 1,
            barcode: sp.barcode || '',
          });
          updatedCount++;
        } else {
          await db.products.add({
            name: sp.name,
            price: sp.price,
            stock: sp.stock,
            image: sp.imageUrl || '',
            barcode: sp.barcode || '',
            categoryType: sp.category,
            unitType: sp.unit,
            description: sp.description,
            synced: 1,
            embedding: null,
          });
          addedCount++;
        }
      }

      // ---- Prune local products that are no longer on the server ----
      // (Only remove synced products that are missing; unsynced ones are kept.)
      const allLocal = await db.products.toArray();
      for (const localProd of allLocal) {
        // Keep if it's not synced (still needs to be uploaded)
        if (localProd.synced !== 1) continue;

        // Keep if it has a barcode and that barcode is in the server list
        if (localProd.barcode && serverBarcodes.has(localProd.barcode)) continue;

        // Keep if its name matches a server product (for barcode-less items)
        if (!localProd.barcode && serverNames.has((localProd.name || '').toLowerCase())) continue;

        // If we get here, the product is synced but missing from the server → delete it locally
        await db.products.delete(localProd.id);
        prunedCount++;
        log(`🧹 Pruned ${localProd.name} (no longer on server)`);
      }
    });

    log(`✅ Pull complete – ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped (deleted), ${prunedCount} pruned`);

    const allLocal = await db.products.toArray();
    store.dispatch(setProducts(allLocal));
  } catch (err) {
    console.error('❌ Pull products failed:', err);
    log('❌ Pull failed – check network or backend');
  }
};

window.addEventListener('online', () => {
  log('🌐 Device online – triggering sync & pull');
  syncLocalToBackend();
  pullProductsFromBackend();
  const token = localStorage.getItem('token');
  if (token) connectSocket(token);
});

window.addEventListener('offline', () => {
  log('🌐 Device offline');
  if (socket) socket.disconnect();
});