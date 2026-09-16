// The three things every new screen prints, written down once so Rs 13,499/-
// looks the same on the cart, the order page and the dashboard.

// "13499.00" (a string, the way DRF sends a decimal) -> "Rs 13,499/-"
export const formatRupees = value => {
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return 'Rs 0/-'
  }
  return `Rs ${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}/-`
}

// "2026-08-18T10:12:31Z" -> "18 Aug 2026"
export const formatDate = value =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

// The server keeps one set of status words: placed, shipped, delivered,
// cancelled. These maps are only about what the customer reads — an order that
// is `placed` has been confirmed, and that is the word on the badge.
export const ORDER_STATUS_LABELS = {
  placed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ITEM_STATUS_LABELS = {
  placed: 'Placed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_LABELS = {
  COD: 'Cash on Delivery',
  CARD: 'Credit / Debit Card',
}
