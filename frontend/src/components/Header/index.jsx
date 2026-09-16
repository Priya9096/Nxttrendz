import {Link} from 'react-router'
import {useNavigate} from 'react-router'

import CartContext from '../../context/CartContext'
import UserContext from '../../context/UserContext'

import {apiFetch, clearTokens, getRefreshToken} from '../../api'

import './index.css'
import {useContext} from 'react'

const Header = () => {
  const navigate = useNavigate()
  const value = useContext(CartContext)
  const {cartList} = value

  // A customer has no products to manage, so they do not get the link. The
  // server refuses them either way — this only keeps the door out of sight.
  const {user} = useContext(UserContext)
  const isSeller = user !== null && user.user_type === 'seller'

  const onClickLogout = async () => {
    // Step 1 — tell Django to end the session (it blacklists the refresh token)
    const refresh = getRefreshToken()
    if (refresh !== undefined) {
      await apiFetch('/api/users/logout/', {
        method: 'POST',
        body: JSON.stringify({refresh}),
      })
    }
    // Step 2 — only now forget the tokens in this browser
    clearTokens()
    navigate('/login', {replace: true})
  }
  const renderCartItemsCount = () => {
    const cartListCount = cartList.length
    return (
      <>
        {cartListCount > 0 ? (
          <span className="cart-count-badge">{cartListCount}</span>
        ) : null}
      </>
    )
  }

  return (
    <nav className="nav-header">
      <div className="nav-content">
        <div className="nav-bar-mobile-logo-container">
          <Link to="/">
            <img
              className="website-logo"
              src="https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/nxt-trendz-logo.png"
              alt="website logo"
            />
          </Link>

          <button type="button" className="nav-mobile-btn">
            <img
              src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-log-out-img.png"
              alt="nav logout"
              className="nav-bar-img"
            />
          </button>
        </div>

        <div className="nav-bar-large-container">
          <Link to="/">
            <img
              className="website-logo"
              src="https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/nxt-trendz-logo.png"
              alt="website logo"
            />
          </Link>
          <ul className="nav-menu">
            <li className="nav-menu-item">
              <Link to="/" className="nav-link">
                Home
              </Link>
            </li>

            <li className="nav-menu-item">
              <Link to="/products" className="nav-link">
                Products
              </Link>
            </li>

            <li className="nav-menu-item">
              <Link to="/cart" className="nav-link">
                Cart
                {renderCartItemsCount()}
              </Link>
            </li>

            <li className="nav-menu-item">
              <Link to="/orders" className="nav-link">
                Orders
              </Link>
            </li>

            {isSeller && (
              <li className="nav-menu-item">
                <Link to="/dashboard" className="nav-link nav-link-dashboard">
                  Dashboard
                </Link>
              </li>
            )}
          </ul>
          <button
            type="button"
            className="logout-desktop-btn"
            onClick={onClickLogout}
          >
            Logout
          </button>
        </div>
      </div>
      <div className="nav-menu-mobile">
        <ul className="nav-menu-list-mobile">
          <li className="nav-menu-item-mobile">
            <Link to="/" className="nav-link">
              <img
                src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-home-icon.png"
                alt="nav home"
                className="nav-bar-img"
              />
            </Link>
          </li>

          <li className="nav-menu-item-mobile">
            <Link to="/products" className="nav-link">
              <img
                src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-products-icon.png"
                alt="nav products"
                className="nav-bar-img"
              />
            </Link>
          </li>
          <li className="nav-menu-item-mobile">
            <Link to="/cart" className="nav-link">
              <img
                src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-cart-icon.png"
                alt="nav cart"
                className="nav-bar-img"
              />
              {renderCartItemsCount()}
            </Link>
          </li>

          <li className="nav-menu-item-mobile">
            <Link to="/orders" className="nav-link nav-link-mobile-text">
              Orders
            </Link>
          </li>

          {isSeller && (
            <li className="nav-menu-item-mobile">
              <Link
                to="/dashboard"
                className="nav-link nav-link-mobile-text nav-link-dashboard"
              >
                Dashboard
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Header
