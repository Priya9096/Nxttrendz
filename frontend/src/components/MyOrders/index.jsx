import {useState, useEffect} from 'react'
import {Link} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import Header from '../Header'

import {apiFetch} from '../../api'
import {
  formatDate,
  formatRupees,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
} from '../../format'

import './index.css'

// ============================================================================
// Part 2 — My Orders      GET /api/orders/
// ============================================================================
// One request for the whole page, one card for each entry:
//
//   results                    one entry per order, newest first
//   id, placed_at              the order number and date at the top
//   status                     the coloured word on the right
//   total                      the big amount at the bottom
//   item_count                 the "1 item" line under the amount
//   payment_method, is_paid    the "Cash on Delivery, Payment due" line
//   thumbnail                  the small product picture
//
// A customer only ever sees their own orders — the server sees to that.
// ============================================================================

const MyOrders = () => {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getOrders = async () => {
      const response = await apiFetch('/api/orders/')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.results)
      }
      setIsLoading(false)
    }
    getOrders()
  }, [])

  const renderCard = order => (
    <li className="order-card" key={order.id}>
      <div className="order-card-top">
        <div>
          <p className="order-card-number">Order #{order.id}</p>
          <p className="order-card-date">
            Placed on {formatDate(order.placed_at)}
          </p>
        </div>
        {/* The same status word, coloured the same way, on every screen. */}
        <span className={`order-badge order-badge-${order.status}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <img
        className="order-card-thumbnail"
        src={order.thumbnail}
        alt={`order ${order.id}`}
      />

      <div className="order-card-bottom">
        <div>
          <p className="order-card-total">{formatRupees(order.total)}</p>
          <p className="order-card-meta">
            {order.item_count} {order.item_count === 1 ? 'item' : 'items'} ·{' '}
            {PAYMENT_LABELS[order.payment_method]} ·{' '}
            {order.is_paid ? 'Paid' : 'Payment due'}
          </p>
        </div>
        {/* View Details opens that id — the order page, already built. */}
        <Link to={`/orders/${order.id}`} className="order-card-link">
          View Details
        </Link>
      </div>
    </li>
  )

  const renderOrders = () => {
    if (isLoading) {
      return (
        <div className="orders-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }

    if (orders.length === 0) {
      return (
        <div className="orders-empty">
          <h2 className="orders-empty-heading">No orders yet</h2>
          <p className="orders-empty-text">
            Everything you buy shows up here, with its status.
          </p>
          <Link to="/products" className="orders-empty-link">
            Shop now
          </Link>
        </div>
      )
    }

    return <ul className="order-cards">{orders.map(renderCard)}</ul>
  }

  return (
    <>
      <Header />
      <div className="orders-page">
        <div className="orders-content">
          <h1 className="orders-heading">My Orders</h1>
          {renderOrders()}
        </div>
      </div>
    </>
  )
}

export default MyOrders
