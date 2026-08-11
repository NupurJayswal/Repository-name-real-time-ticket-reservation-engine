export const calculatePrice = (prices: number[]) => {
  const subtotal = prices.reduce((sum, price) => sum + price, 0);

  const discount = prices.length >= 3 ? subtotal * 0.1 : 0;

  const total = subtotal - discount;

  return {
    subtotal,
    discount,
    total,
  };
};