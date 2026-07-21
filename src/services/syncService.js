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
    const response = await api.post('/products/sync', { products: payload });
    const syncedProducts = response.data;
    log('✅ Server confirmed sync');

    // Update local products with server _id and dealer
    for (const serverProd of syncedProducts) {
      let localProd = null;
      if (serverProd.barcode) {
        localProd = await db.products.where('barcode').equals(serverProd.barcode).first();
      }
      if (!localProd) {
        localProd = await db.products.where('name').equals(serverProd.name).first();
      }
      if (localProd) {
        await db.products.update(localProd.id, {
          synced: 1,
          dealer: serverProd.dealer,
          _serverId: serverProd._id,   // store MongoDB ObjectId
        });
      }
    }

    // Fallback: mark remaining unsynced as synced
    for (const p of unsynced) {
      const updated = await db.products.get(p.id);
      if (updated && updated.synced === 0) {
        await db.products.update(p.id, { synced: 1 });
      }
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

    const deletedItems = await db.deletedProducts.toArray();
    const deletedBarcodes = new Set(deletedItems.map(d => d.barcode).filter(Boolean));

    const serverBarcodes = new Set();
    const serverNames = new Set();
    serverProducts.forEach(sp => {
      if (sp.barcode) serverBarcodes.add(sp.barcode);
      serverNames.add(sp.name.toLowerCase());
    });

    let addedCount = 0, updatedCount = 0, skippedCount = 0, prunedCount = 0;

    await db.transaction('rw', db.products, db.deletedProducts, async () => {
      for (const sp of serverProducts) {
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
            dealer: sp.dealer,
            _serverId: sp._id,          // store server ID
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
            dealer: sp.dealer,
            _serverId: sp._id,          // store server ID
          });
          addedCount++;
        }
      }

      // Prune local synced products not on server
      const allLocal = await db.products.toArray();
      for (const localProd of allLocal) {
        if (localProd.synced !== 1) continue;
        if (localProd.barcode && serverBarcodes.has(localProd.barcode)) continue;
        if (!localProd.barcode && serverNames.has((localProd.name || '').toLowerCase())) continue;
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