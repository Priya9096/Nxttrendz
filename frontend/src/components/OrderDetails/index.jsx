import {useState, useEffect, useContext} from 'react'
import {Link, useLocation, useParams} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import Header from '../Header'
import CartContext from '../../context/CartContext'

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
// Part 2 — Order page      GET  /api/orders/<id>/
//                          POST /api/orders/<id>/cancel/
// ============================================================================
// Read it once, by id. Everything on this screen — the items, the address, the
// payment lines and whether Cancel may be shown at all — comes out of that one
// answer.
//
// can_cancel is the server's decision. React only reads it; it never works the
// rule out for itself.
// ============================================================================

const OrderDetails = () => {
  const {id} = useParams()
  const location = useLocation()
  const {getCart} = useContext(CartContext)

  // True only when we arrived straight from the checkout, so a refresh — or
  // opening the same order later from My Orders — shows the plain page.
  const justPlaced = location.state?.justPlaced === true

  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  const getOrder = async () => {
    const response = await apiFetch(`/api/orders/${id}/`)
    if (response.ok) {
      setOrder(await response.json())
    }
    setIsLoading(false)
  }

  useEffect(() => {
    getOrder()
    // The order emptied the cart on the server. Reading it back here keeps the
    // badge in the header honest, even on a hard refresh of this page.
    if (justPlaced) {
      getCart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onClickCancel = async () => {
    setIsCancelling(true)
    await apiFetch(`/api/orders/${id}/cancel/`, {method: 'POST'})
    setIsCancelling(false)
    // Read it again — that is how the status word on the screen changes.
    getOrder()
  }

  const renderBanner = () => (
    <div className="order-banner">
      <h2 className="order-banner-heading">Order Placed Successfully</h2>
      <p className="order-banner-text">
        {order.is_paid
          ? `Paid ${formatRupees(order.total)} by card.`
          : `Pay ${formatRupees(order.total)} in cash when your order arrives.`}
      </p>
    </div>
  )

  const renderItemsCard = () => (
    <div className="order-card-block">
      <h2 className="order-block-heading">Items</h2>
      <ul className="order-items">
        {order.items.map(item => (
          <li className="order-item" key={item.id}>
            <img
              className="order-item-image"
              src={item.image_url}
              alt={item.title}
            />
            <div className="order-item-text">
              <p className="order-item-title">{item.title}</p>
              <p className="order-item-brand">by {item.brand}</p>
              <p className="order-item-price">
                {formatRupees(item.price)} × {item.quantity}
              </p>
            </div>
            <div className="order-item-right">
              <p className="order-item-subtotal">
                {formatRupees(item.subtotal)}
              </p>
              <span className={`order-badge order-badge-${item.status}`}>
                {ITEM_STATUS_LABELS[item.status]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  const renderAddressCard = () => {
    const {address} = order
    // An order always has an address, but a defensive read costs nothing.
    if (address === null || address === undefined) {
      return null
    }
    return (
      <div className="order-card-block">
        <h2 className="order-block-heading">Delivery Address</h2>
        <p className="order-address-line">{address.full_name}</p>
        <p className="order-address-line">{address.address}</p>
        <p className="order-address-line">
          {address.city}, {address.state} {address.pincode}
        </p>
        <p className="order-address-line">Phone: {address.phone}</p>
      </div>
    )
  }

  const renderPaymentCard = () => (
    <div className="order-card-block">
      <h2 className="order-block-heading">Payment</h2>
      <div className="order-pay-row">
        <p className="order-pay-label">Method</p>
        <p className="order-pay-value">
          {PAYMENT_LABELS[order.payment_method]}
        </p>
      </div>
      <div className="order-pay-row">
        <p className="order-pay-label">Status</p>
        <p
          className={
            order.is_paid ? 'order-pay-value-paid' : 'order-pay-value-due'
          }
        >
          {order.is_paid ? 'Paid' : 'Payment due on delivery'}
        </p>
      </div>
      <div className="order-pay-row">
        <p className="order-pay-label">Items</p>
        <p className="order-pay-value">
          {formatRupees(Number(order.total) - Number(order.shipping))}
        </p>
      </div>
      <div className="order-pay-row">
        <p className="order-pay-label">Shipping</p>
        <p className="order-pay-value">
          {Number(order.shipping) === 0 ? 'FREE' : formatRupees(order.shipping)}
        </p>
      </div>
      <div className="order-pay-total">
        <p className="order-pay-total-label">Total</p>
        <p className="order-pay-total-value">{formatRupees(order.total)}</p>
      </div>
    </div>
  )

  const renderCancelCard = () => (
    <div className="order-card-block">
      <button
        type="button"
        className="cancel-order-btn"
        onClick={onClickCancel}
        disabled={isCancelling}
      >
        {isCancelling ? 'Cancelling…' : 'Cancel Order'}
      </button>
    </div>
  )

  const renderOrder = () => {
    if (isLoading) {
      return (
        <div className="orders-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }

    if (order === null) {
      return (
        <div className="order-card-block">
          <p className="order-not-found">
            That order could not be found. It may belong to another account.
          </p>
        </div>
      )
    }

    return (
      <>
        {justPlaced && renderBanner()}

        <div className="order-title-row">
          <div>
            <h1 className="order-title">Order #{order.id}</h1>
            <p className="order-placed-on">
              Placed on {formatDate(order.placed_at)}
            </p>
          </div>
          <span className={`order-badge order-badge-${order.status}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>

        <div className="order-layout">
          <div className="order-left">{renderItemsCard()}</div>
          <div className="order-right">
            {renderAddressCard()}
            {renderPaymentCard()}
            {/* Shown only while the server says it may be shown. */}
            {order.can_cancel && renderCancelCard()}
            <Link to="/orders" className="back-to-orders">
              Back to My Orders
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="orders-page">
        <div className="orders-content">{renderOrder()}</div>
      </div>
    </>
  )
}

export default OrderDetails
