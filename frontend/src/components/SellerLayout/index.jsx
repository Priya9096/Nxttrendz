import {useContext} from 'react'
import {Link} from 'react-router'

import Header from '../Header'
import UserContext from '../../context/UserContext'

import './index.css'

// The three tabs at the top of the seller's area.
//
// The Orders tab is the *seller's* list — the orders that contain their
// products (GET /api/seller/orders/). The buyer's own list, My Orders, is the
// "Orders" link in the header, and the two answer different questions:
//
//   what I bought           GET /api/orders/         -> /orders
//   what was bought from me GET /api/seller/orders/  -> /dashboard/orders
const tabs = [
  {id: 'overview', label: 'Overview', path: '/dashboard'},
  {id: 'products', label: 'My Products', path: '/dashboard/products'},
  {id: 'orders', label: 'Orders', path: '/dashboard/orders'},
]

// Everything the seller screens share: the page frame, the heading, the tabs,
// and the one check that this account is allowed to be here.
const SellerLayout = props => {
  const {heading, subtitle, activeTab, children} = props
  const {user, isUserLoading} = useContext(UserContext)

  const renderTabs = () => (
    <ul className="seller-tabs">
      {tabs.map(tab => (
        <li className="seller-tab" key={tab.id}>
          <Link
            to={tab.path}
            className={
              tab.id === activeTab
                ? 'seller-tab-link seller-tab-link-active'
                : 'seller-tab-link'
            }
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  )

  const renderContent = () => {
    // Until the profile arrives we do not know who this is, so we claim
    // nothing. The spinner belongs to the screen, not to this decision.
    if (isUserLoading) {
      return null
    }

    if (user !== null && user.user_type !== 'seller') {
      return (
        <div className="seller-card seller-not-allowed">
          <h2 className="seller-not-allowed-heading">Sellers only</h2>
          <p className="seller-not-allowed-text">
            This account is a customer account. Register as a seller to list
            products of your own.
          </p>
          <Link to="/products" className="seller-not-allowed-link">
            Back to the shop
          </Link>
        </div>
      )
    }

    return children
  }

  return (
    <>
      <Header />
      <div className="seller-page">
        <div className="seller-page-content">
          <h1 className="seller-heading">{heading}</h1>
          <p className="seller-subtitle">{subtitle}</p>
          {renderTabs()}
          {renderContent()}
        </div>
      </div>
    </>
  )
}

export default SellerLayout
