export function generateUpiUri(upiId, amount, shopName) {
  const params = new URLSearchParams();
  params.set('pa', upiId);
  params.set('pn', shopName || 'Shop');
  params.set('am', amount.toFixed(2));
  params.set('cu', 'INR');
  return `upi://pay?${params.toString()}`;
}