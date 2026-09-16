import {useState, useEffect, useContext} from 'react'
import {Link, useNavigate} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import Header from '../Header'

import CartContext from '../../context/CartContext'
import UserContext from '../../context/UserContext'

import {apiFetch} from '../../api'
import {formatRupees} from '../../format'

import './index.css'

// ============================================================================
// Part 2 — Checkout      POST /api/orders/
// ============================================================================
// What you send:
//   payment_method   "COD" or "CARD", whichever button was chosen
//   address          the six boxes: full_name, phone, address, city, state,
//                    pincode
//   nothing else     not the cart, not the total. The server has both.
//
// What comes back (201): the whole order — its id, status, total and items.
// ============================================================================

const EMPTY_ADDRESS = {
  full_name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
}

const ADDRESS_FIELDS = [
  {name: 'full_name', label: 'FULL NAME', placeholder: 'Your name'},
  {name: 'phone', label: 'PHONE', placeholder: '10-digit mobile number'},
  {name: 'address', label: 'ADDRESS', placeholder: 'Flat, street, area'},
  {name: 'city', label: 'CITY', placeholder: 'City', half: true},
  {name: 'state', label: 'STATE', placeholder: 'State', half: true},
  {name: 'pincode', label: 'PINCODE', placeholder: '6-digit pincode'},
]

const Checkout = () => {
  const navigate = useNavigate()
  const {cartList, isCartLoading, getCart} = useContext(CartContext)
  const {user} = useContext(UserContext)

  const [address, setAddress] = useState({
    ...EMPTY_ADDRESS,
    // A small kindness: the name we already know, ready to be overwritten.
    full_name: user === null ? '' : user.username,
  })
  const [paymentMethod, setPaymentMethod] = useState('COD')

  const [errors, setErrors] = useState({})
  const [isPlacing, setIsPlacing] = useState(false)

  // On a hard refresh of /checkout the profile has not arrived yet when this
  // state is first built, so the name is filled in the moment it does — and
  // only while the box is still untouched.
  useEffect(() => {
    if (user !== null) {
      setAddress(prevAddress =>
        prevAddress.full_name === ''
          ? {...prevAddress, full_name: user.username}
          : prevAddress,
      )
    }
  }, [user])

  // The server prices the order; this total is only what the screen shows.
  const itemsTotal = cartList.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )

  const onChangeField = event => {
    const {name, value} = event.target
    setAddress(prevAddress => ({...prevAddress, [name]: value}))
  }

  // Checked before anything is sent: all six boxes filled, and one payment
  // choice made. The server checks again — this only saves a round trip.
  const findEmptyBoxes = () => {
    const emptyBoxes = {}
    ADDRESS_FIELDS.forEach(field => {
      if (address[field.name].trim() === '') {
        emptyBoxes[field.name] = ['This field is required.']
      }
    })
    return emptyBoxes
  }

  const onPlaceOrder = async event => {
    event.preventDefault()

    const emptyBoxes = findEmptyBoxes()
    if (Object.keys(emptyBoxes).length > 0) {
      setErrors(emptyBoxes)
      return
    }
    setErrors({})
    setIsPlacing(true)

    // Send it once. The server reads the cart, prices it, and saves the order.
    const response = await apiFetch('/api/orders/', {
      method: 'POST',
      body: JSON.stringify({payment_method: paymentMethod, address}),
    })
    const data = await response.json()
    setIsPlacing(false)

    if (response.ok) {
      // Open the order page with the id that just came back. The banner up
      // there is only shown to whoever arrives this way.
      navigate(`/orders/${data.id}`, {state: {justPlaced: true}})
      // The cart is empty on the server now, so read it back: the badge in the
      // header has to agree with the database.
      getCart()
      return
    }

    // A 400 nests the address errors under "address".
    setErrors({...(data.address ?? {}), detail: data.detail})
  }

  const renderError = field => {
    const message = errors[field]
    if (message === undefined) {
      return null
    }
    return (
      <p className="checkout-error">
        {Array.isArray(message) ? message[0] : message}
      </p>
    )
  }

  const renderAddressCard = () => (
    <div className="checkout-card">
      <h2 className="checkout-card-heading">Shipping Address</h2>
      <div className="address-grid">
        {ADDRESS_FIELDS.map(field => (
          <div
            className={field.half ? 'address-field-half' : 'address-field'}
            key={field.name}
          >
            <label className="checkout-label" htmlFor={field.name}>
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type="text"
              className="checkout-input"
              placeholder={field.placeholder}
              value={address[field.name]}
              onChange={onChangeField}
            />
            {renderError(field.name)}
          </div>
        ))}
      </div>
    </div>
  )

  const renderPaymentCard = () => (
    <div className="checkout-card">
      <h2 className="checkout-card-heading">Payment</h2>

      <label className="payment-option" htmlFor="cod">
        <input
          id="cod"
          type="radio"
          name="payment_method"
          value="COD"
          checked={paymentMethod === 'COD'}
          onChange={() => setPaymentMethod('COD')}
        />
        <span className="payment-text">
          <span className="payment-title">Cash on Delivery</span>
          <span className="payment-note">
            Pay in cash when the order arrives.
          </span>
        </span>
      </label>

      <label className="payment-option" htmlFor="card">
        <input
          id="card"
          type="radio"
          name="payment_method"
          value="CARD"
          checked={paymentMethod === 'CARD'}
          onChange={() => setPaymentMethod('CARD')}
        />
        <span className="payment-text">
          <span className="payment-title">Credit / Debit Card</span>
          <span className="payment-note">
            Marked paid at once. Only the last 4 digits are stored.
          </span>
        </span>
      </label>
    </div>
  )

  const renderSummaryCard = () => (
    <div className="checkout-card summary-card">
      <h2 className="checkout-card-heading">Order Summary</h2>

      <ul className="summary-items">
        {cartList.map(item => (
          <li className="summary-item" key={item.id}>
            <img
              className="summary-item-image"
              src={item.imageUrl}
              alt={item.title}
            />
            <div className="summary-item-text">
              <p className="summary-item-title">{item.title}</p>
              <p className="summary-item-meta">
                Qty {item.quantity} · {formatRupees(item.price * item.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="summary-row">
        <p className="summary-row-label">Items</p>
        <p className="summary-row-value">{formatRupees(itemsTotal)}</p>
      </div>
      <div className="summary-row">
        <p className="summary-row-label">Shipping</p>
        <p className="summary-row-value">FREE</p>
      </div>
      <div className="summary-total">
        <p className="summary-total-label">Total</p>
        <p className="summary-total-value">{formatRupees(itemsTotal)}</p>
      </div>

      {renderError('detail')}

      <button
        type="submit"
        className="place-order-btn"
        onClick={onPlaceOrder}
        disabled={isPlacing}
      >
        {isPlacing ? 'Placing…' : 'Place Order'}
      </button>
      <Link to="/cart" className="back-to-cart">
        Back to cart
      </Link>
    </div>
  )

  const renderCheckout = () => {
    if (isCartLoading) {
      return (
        <div className="checkout-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }

    // There is nothing to buy, so there is nothing to fill in.
    if (cartList.length === 0) {
      return (
        <div className="checkout-card checkout-empty">
          <h2 className="checkout-card-heading">Your cart is empty</h2>
          <p className="checkout-empty-text">
            Add something to it and the checkout will have work to do.
          </p>
          <Link to="/products" className="checkout-empty-link">
            Shop now
          </Link>
        </div>
      )
    }

    return (
      <form className="checkout-layout" onSubmit={onPlaceOrder}>
        <div className="checkout-left">
          {renderAddressCard()}
          {renderPaymentCard()}
        </div>
        <div className="checkout-right">{renderSummaryCard()}</div>
      </form>
    )
  }

  return (
    <>
      <Header />
      <div className="checkout-page">
        <div className="checkout-content">
          <h1 className="checkout-heading">Checkout</h1>
          {renderCheckout()}
        </div>
      </div>
    </>
  )
}

export default Checkout
