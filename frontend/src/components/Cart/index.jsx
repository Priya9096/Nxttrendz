import {useContext} from 'react'
import BeatLoader from 'react-spinners/BeatLoader'

import CartContext from '../../context/CartContext'

import Header from '../Header'
import CartListView from '../CartListView'
import EmptyCartView from '../EmptyCartView'
import CartSummary from '../CartSummary'

import './index.css'

const Cart = () => {
  const value = useContext(CartContext)
  const {cartList, isCartLoading} = value

  const showEmptyView = cartList.length === 0

  // "We have not asked yet" and "we asked, and it is empty" look identical
  // from here — an empty list. Only isCartLoading tells them apart.
  const renderCart = () => {
    if (isCartLoading) {
      return (
        <div className="cart-loader-container" data-testid="loader">
          <BeatLoader color="#3b82f6" />
        </div>
      )
    }
    if (showEmptyView) {
      return <EmptyCartView />
    }
    return (
      <div className="cart-content-container">
        <h1 className="cart-heading">My Cart</h1>
        <CartListView />
        <CartSummary />
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="cart-container">{renderCart()}</div>
    </>
  )
}

export default Cart
