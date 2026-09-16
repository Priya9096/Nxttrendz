import {BrowserRouter, Route, Routes} from 'react-router'
import {useState, useEffect} from 'react'

import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Home from './components/Home'
import Products from './components/Products'
import Cart from './components/Cart'
import NotFound from './components/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import ProductItemDetails from './components/ProductItemDetails'
import Profile from './components/Profile'
import SellerDashboard from './components/SellerDashboard'
import MyProducts from './components/MyProducts'
import SellerOrders from './components/SellerOrders'
import ProductForm from './components/ProductForm'
import Checkout from './components/Checkout'
import MyOrders from './components/MyOrders'
import OrderDetails from './components/OrderDetails'

import CartContext from './context/CartContext'
import UserContext from './context/UserContext'

import {apiFetch, getAccessToken} from './api'

import './App.css'

// Django's cart row and our cart screen name the same facts differently, so the
// translation happens here, once. Nothing below this line knows the API names.
//
//   id         the CartItem's id — the row. PATCH and DELETE address this.
//   productId  the Product's id — the thing. "Add to cart" sends this.
const formatCartItem = item => ({
  id: item.id,
  productId: item.product,
  title: item.product_title,
  brand: item.product_brand,
  imageUrl: item.product_image_url,
  // DRF sends a decimal as a string: "62990.00". Number() here means every
  // screen below can just multiply.
  price: Number(item.product_price),
  quantity: item.quantity,
})

const App = () => {
  // Still the array every cart screen reads — but Django fills it now, and
  // nothing writes to it except getCart.
  const [cartList, setCartList] = useState([])

  // True while the cart is being read for the first time. Cart/index.jsx
  // already shows a spinner while it is set, so "we have not asked yet" never
  // looks like "the cart is empty".
  const [isCartLoading, setIsCartLoading] = useState(true)

  // Who is logged in. One read, on mount, shared by every screen that needs to
  // know whether this account is a seller.
  const [user, setUser] = useState(null)
  const [isUserLoading, setIsUserLoading] = useState(true)

  // The one reader. Every writer below finishes by calling it, so the screen
  // shows what Django stored — not what we assumed it stored.
  const getCart = async () => {
    const response = await apiFetch('/api/cart/')
    if (response.ok) {
      const data = await response.json()
      setCartList(data.items.map(formatCartItem))
    }
  }

  const getProfile = async () => {
    const response = await apiFetch('/api/users/profile/')
    if (response.ok) {
      setUser(await response.json())
    }
  }

  // The cart and the profile are read once, when the app mounts.
  useEffect(() => {
    const loadApp = async () => {
      // On the login screen there is no token yet, and /api/cart/ would answer
      // 401. No token, no cart to ask for.
      if (getAccessToken() !== undefined) {
        await Promise.all([getCart(), getProfile()])
      }
      setIsCartLoading(false)
      setIsUserLoading(false)
    }
    loadApp()
  }, [])

  // POST /api/cart/add/ — the server decides whether this is a new row or a
  // top-up of one already there, so the "is it in the cart?" check that used to
  // live here is gone.
  const addCartItem = async product => {
    await apiFetch('/api/cart/add/', {
      method: 'POST',
      body: JSON.stringify({
        product: product.id,
        quantity: product.quantity ?? 1,
      }),
    })
    getCart()
  }

  // DELETE /api/cart/items/<id>/ — the cart item's id, not the product's.
  const deleteCartItem = async id => {
    await apiFetch(`/api/cart/items/${id}/`, {method: 'DELETE'})
    getCart()
  }

  // Both quantity buttons still go through here. PATCH sets the quantity, it
  // does not nudge it — which is why the two callers read the row first.
  const updateCartItemQuantity = async (id, quantity) => {
    await apiFetch(`/api/cart/items/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({quantity}),
    })
    getCart()
  }

  const incrementCartItemQuantity = id => {
    const cartItem = cartList.find(each => each.id === id)
    updateCartItemQuantity(id, cartItem.quantity + 1)
  }

  const decrementCartItemQuantity = id => {
    const cartItem = cartList.find(each => each.id === id)
    // A quantity of 0 is not a smaller cart, it is a row that should be gone.
    if (cartItem.quantity === 1) {
      deleteCartItem(id)
      return
    }
    updateCartItemQuantity(id, cartItem.quantity - 1)
  }

  return (
    <BrowserRouter>
      <UserContext.Provider value={{user, isUserLoading}}>
        <CartContext.Provider
          value={{
            cartList,
            isCartLoading,
            addCartItem,
            deleteCartItem,
            incrementCartItemQuantity,
            decrementCartItemQuantity,
            // Checkout empties the cart on the server, so it needs a way to
            // read it back afterwards — same reader as every other writer.
            getCart,
          }}
        >
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            {/* Public, like /login — you cannot have a token yet. */}
            <Route path="/register" element={<RegisterForm />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute>
                  <ProductItemDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ---- Part 2 — the other half of the shop: buying ---------- */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <MyOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetails />
                </ProtectedRoute>
              }
            />

            {/* ---- Parts 1 and 3 — the seller's side of the shop -------- */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/products"
              element={
                <ProtectedRoute>
                  <MyProducts />
                </ProtectedRoute>
              }
            />
            {/* What people bought from you — not the same list as /orders. */}
            <Route
              path="/dashboard/orders"
              element={
                <ProtectedRoute>
                  <SellerOrders />
                </ProtectedRoute>
              }
            />
            {/* Two routes, one form: with an id it edits, without it adds. */}
            <Route
              path="/dashboard/products/new"
              element={
                <ProtectedRoute>
                  <ProductForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/products/:id/edit"
              element={
                <ProtectedRoute>
                  <ProductForm />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartContext.Provider>
      </UserContext.Provider>
    </BrowserRouter>
  )
}

export default App
