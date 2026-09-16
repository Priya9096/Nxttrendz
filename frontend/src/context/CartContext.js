import React from 'react'

// The shape every cart screen relies on. These defaults are only what a
// component sees if it is ever rendered outside the Provider — App.jsx
// supplies the real values.
const CartContext = React.createContext({
  cartList: [],
  isCartLoading: false,
  addCartItem: () => {},
  deleteCartItem: () => {},
  incrementCartItemQuantity: () => {},
  decrementCartItemQuantity: () => {},
  getCart: () => {},
})

export default CartContext
