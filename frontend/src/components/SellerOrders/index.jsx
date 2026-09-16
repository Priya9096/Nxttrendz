import {useState, useEffect} from 'react'
import {Link, useSearchParams} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import SellerLayout from '../SellerLayout'

import {apiFetch} from '../../api'
import {
  formatDate,
  formatRupees,
  ITEM_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
} from '../../format'

import './index.css'

// ============================================================================
// The seller's Orders tab   GET   /api/seller/orders/?status=
//                          PATCH /api/seller/orders/items/<id>/
// ============================================================================
// Two lists that are easy to confuse, and they answer different questions:
//
//   GET /api/orders/          what I bought          -> My Orders
//   GET /api/seller/orders/   what was bought from me -> this screen
//
// Each entry carries only the rows that belong to this seller, the buyer, the
// address the parcel goes to, and what the order is worth to them.
// ============================================================================

const FILTERS = [
  {value: '', label: 'All'},
  {value: 'placed', label: 'Still to ship'},
  {value: 'shipped', label: 'Shipped'},
  {value: 'delivered', label: 'Delivered'},
  {value: 'cancelled', label: 'Cancelled'},
]

const SellerOrders = () => {
  // The filter lives in the URL, so the "1 item waiting to be shipped" strip on
  // the Overview tab can link straight to ?status=placed.
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''

  const [sales, setSales] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  // Which row is mid-request, so its button can say so and not be pressed twice
  const [movingItemId, setMovingItemId] = useState(null)

  const getSales = async () => {
    setIsLoading(true)
    const response = await apiFetch(`/api/seller/orders/?status=${status}`)
    if (response.ok) {
      const data = await response.json()
      setSales(data.results)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    getSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Move one row forward: placed -> shipped -> delivered. The server decides
  // what "forward" means and rolls the order's own status up behind it.
  const onClickMove = async (item, nextStatus) => {
    setMovingItemId(item.id)
    await apiFetch(`/api/seller/orders/items/${item.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({status: nextStatus}),
    })
    setMovingItemId(null)
    // Read the list again — the order's status may have moved as well.
    getSales()
  }

  const renderFilters = () => (
    <ul className="sales-filters">
      {FILTERS.map(filter => (
        <li key={filter.value}>
          <button
            type="button"
            className={
              filter.value === status
                ? 'sales-filter sales-filter-active'
                : 'sales-filter'
            }
            onClick={() =>
              setSearchParams(filter.value === '' ? {} : {status: filter.value})
            }
          >
            {filter.label}
          </button>
        </li>
      ))}
    </ul>
  )

  const renderItem = item => (
    <li className="sale-item" key={item.id}>
      <img className="sale-item-image" src={item.image_url} alt={item.title} />

      <div className="sale-item-text">
        <p className="sale-item-title">{item.title}</p>
        <p className="sale-item-meta">
          by {item.brand} · {formatRupees(item.price)} × {item.quantity}
        </p>
      </div>

      <p className="sale-item-subtotal">{formatRupees(item.subtotal)}</p>

      <span className={`order-badge order-badge-${item.status}`}>
        {ITEM_STATUS_LABELS[item.status]}
      </span>

      {/* No next step means there is nothing to press: a delivered or a
          cancelled row is finished. */}
      {item.next_status !== null && (
        <button
          type="button"
          className="sale-item-action"
          onClick={() => onClickMove(item, item.next_status)}
          disabled={movingItemId === item.id}
        >
          {movingItemId === item.id ? 'Saving…' : `Mark ${item.next_status}`}
        </button>
      )}
    </li>
  )

  const renderSale = sale => (
    <li className="seller-card sale-card" key={sale.order_id}>
      <div className="sale-top">
        <div>
          <p className="sale-number">Order #{sale.order_id}</p>
          <p className="sale-date">
            Placed on {formatDate(sale.placed_at)} · bought by{' '}
            <span className="sale-buyer">{sale.buyer}</span>
          </p>
        </div>
        <div className="sale-top-right">
          <span className={`order-badge order-badge-${sale.status}`}>
            {ORDER_STATUS_LABELS[sale.status]}
          </span>
          <p className="sale-total">{formatRupees(sale.your_total)}</p>
          <p className="sale-payment">
            {PAYMENT_LABELS[sale.payment_method]} ·{' '}
            {sale.is_paid ? 'Paid' : 'Payment due'}
          </p>
        </div>
      </div>

      <ul className="sale-items">{sale.your_items.map(renderItem)}</ul>

      {sale.ship_to !== null && (
        <p className="sale-ship-to">
          <span className="sale-ship-to-label">Ship to</span>{' '}
          {sale.ship_to.full_name}, {sale.ship_to.address}, {sale.ship_to.city},{' '}
          {sale.ship_to.state} {sale.ship_to.pincode} · {sale.ship_to.phone}
        </p>
      )}
    </li>
  )

  const renderSales = () => {
    if (isLoading) {
      return (
        <div className="seller-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }

    if (sales.length === 0) {
      return (
        <div className="sales-empty">
          <h2 className="sales-empty-heading">
            {status === '' ? 'No sales yet' : 'Nothing in this list'}
          </h2>
          <p className="sales-empty-text">
            Every order that contains one of your products shows up here, with
            the address it has to go to.
          </p>
          <Link to="/dashboard/products" className="sales-empty-link">
            Back to My Products
          </Link>
        </div>
      )
    }

    return <ul className="sale-cards">{sales.map(renderSale)}</ul>
  }

  return (
    <SellerLayout
      heading="Orders"
      subtitle="What people have bought from you."
      activeTab="orders"
    >
      {renderFilters()}
      {renderSales()}
    </SellerLayout>
  )
}

export default SellerOrders
