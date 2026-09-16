import {useContext} from 'react'
import {useNavigate} from 'react-router'

import CartContext from '../../context/CartContext'

import './index.css'

const CartSummary = () => {
  const navigate = useNavigate()
  const cartContext = useContext(CartContext)
  const {cartList} = cartContext
  let total = 0
  cartList.forEach(eachCartItem => {
    total += eachCartItem.price * eachCartItem.quantity
  })

  // Checkout does not place the order — it opens the screen that collects the
  // address and the payment choice. POST /api/orders/ happens there.
  const onClickCheckout = () => {
    navigate('/checkout')
  }

  return (
    <>
      <div className="cart-summary-container">
        <h1 className="order-total-value">
          <span className="order-total-label">Order Total:</span> Rs {total}
          /-
        </h1>
        <p className="total-items">{cartList.length} Items in cart</p>
        <button
          type="button"
          className="checkout-button d-sm-none"
          onClick={onClickCheckout}
        >
          Checkout
        </button>
      </div>
      <button
        type="button"
        className="checkout-button d-lg-none"
        onClick={onClickCheckout}
      >
        Checkout
      </button>
    </>
  )
}

export default CartSummary
