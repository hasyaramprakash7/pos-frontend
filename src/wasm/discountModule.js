export default function DiscountModule() {
  return Promise.resolve({
    calculateDiscount: (amount, percent) => amount * (1 - percent / 100)
  });
}