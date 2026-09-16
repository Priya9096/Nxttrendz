import {useState, useEffect, useContext} from 'react'
import {Link} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import SellerLayout from '../SellerLayout'
import UserContext from '../../context/UserContext'

import {apiFetch} from '../../api'
import {formatRupees} from '../../format'

import './index.css'

// ============================================================================
// Part 3 — Dashboard      GET /api/seller/summary/
// ============================================================================
// One call fills the whole screen: four cards, the seven-bar chart and both
// panels. Nothing on this page is added up in the browser — the numbers arrive
// finished, and this component prints them.
//
//   revenue            money earned, cancelled items left out
//   orders             how many orders contain one of your products
//   units_sold         how many pieces you have sold in total
//   products           how many products you have listed
//   awaiting_shipment  paid items you still have to send
//   last_7_days        one amount per day, so the bars can be drawn
//   by_status          how many are placed, shipped, delivered, cancelled
//   top_products       your best sellers, with pieces sold and money made
// ============================================================================

const STATUS_ROWS = [
  {key: 'placed', label: 'Placed'},
  {key: 'shipped', label: 'Shipped'},
  {key: 'delivered', label: 'Delivered'},
  {key: 'cancelled', label: 'Cancelled'},
]

const SellerDashboard = () => {
  const {user} = useContext(UserContext)

  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getSummary = async () => {
      const response = await apiFetch('/api/seller/summary/')
      if (response.ok) {
        setSummary(await response.json())
      }
      setIsLoading(false)
    }
    getSummary()
  }, [])

  const renderStatCards = () => {
    const {revenue, orders, units_sold: unitsSold, products} = summary
    // The only arithmetic on this page, and it is presentation: one number
    // divided by another number that both arrived from the server.
    const average = orders > 0 ? Number(revenue) / orders : 0

    return (
      <ul className="stat-cards">
        <li className="seller-card stat-card">
          <p className="stat-label">REVENUE</p>
          <p className="stat-value">{formatRupees(revenue)}</p>
          <p className="stat-note">Cancelled items excluded</p>
        </li>
        <li className="seller-card stat-card">
          <p className="stat-label">ORDERS</p>
          <p className="stat-value">{orders}</p>
          <p className="stat-note">{formatRupees(average)} average</p>
        </li>
        <li className="seller-card stat-card">
          <p className="stat-label">UNITS SOLD</p>
          <p className="stat-value">{unitsSold}</p>
          <p className="stat-note">Across all your products</p>
        </li>
        <li className="seller-card stat-card">
          <p className="stat-label">PRODUCTS LISTED</p>
          <p className="stat-value">{products}</p>
          <p className="stat-note">In your catalogue</p>
        </li>
      </ul>
    )
  }

  // The yellow strip only appears when there is something to do, and it is a
  // link: "1 item waiting" jumps straight to the orders.
  const renderAwaitingStrip = () => {
    const waiting = summary.awaiting_shipment
    if (waiting === 0) {
      return null
    }
    return (
      <div className="awaiting-strip">
        <p className="awaiting-text">
          <span className="awaiting-count">{waiting}</span>{' '}
          {waiting === 1 ? 'item' : 'items'} waiting to be shipped.
        </p>
        {/* Straight to the rows that are waiting, not to the whole list. */}
        <Link to="/dashboard/orders?status=placed" className="awaiting-link">
          Go to orders
        </Link>
      </div>
    )
  }

  // Always seven bars, empty days included — a chart drawn only from the days
  // that sold something cannot show a quiet week.
  const renderChart = () => {
    const days = summary.last_7_days
    const amounts = days.map(day => Number(day.revenue))
    const highest = Math.max(...amounts)

    return (
      <div className="seller-card chart-card">
        <h2 className="seller-card-heading">Last 7 Days</h2>
        <ul className="chart">
          {days.map(day => {
            const amount = Number(day.revenue)
            // Tallest bar is full height; the rest are drawn against it.
            const height = highest > 0 ? (amount / highest) * 100 : 0
            return (
              <li className="chart-column" key={day.date}>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar"
                    style={{height: `${height}%`}}
                    title={formatRupees(amount)}
                  />
                </div>
                <p className="chart-day">{day.label}</p>
                <p className="chart-amount">
                  {amount > 0 ? formatRupees(amount) : '—'}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  const renderTopProducts = () => (
    <div className="seller-card panel">
      <h2 className="seller-card-heading">Top Products</h2>
      {summary.top_products.length === 0 ? (
        <p className="panel-empty">Nothing sold yet.</p>
      ) : (
        <ul className="top-products">
          {summary.top_products.map((product, index) => (
            <li className="top-product" key={`${product.title}-${index}`}>
              <span className="top-product-rank">{index + 1}</span>
              <p className="top-product-title">{product.title}</p>
              <p className="top-product-units">
                {product.units} {product.units === 1 ? 'unit' : 'units'}
              </p>
              <p className="top-product-revenue">
                {formatRupees(product.revenue)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const renderByStatus = () => (
    <div className="seller-card panel">
      <h2 className="seller-card-heading">Items by Status</h2>
      <ul className="status-rows">
        {STATUS_ROWS.map(row => (
          <li className="status-row" key={row.key}>
            <p className="status-row-label">{row.label}</p>
            <p className="status-row-count">{summary.by_status[row.key]}</p>
          </li>
        ))}
      </ul>
    </div>
  )

  const renderOverview = () => {
    if (isLoading) {
      return (
        <div className="seller-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }

    if (summary === null) {
      return (
        <div className="seller-card">
          <p className="seller-error">
            The dashboard could not be loaded. Log in again and retry.
          </p>
        </div>
      )
    }

    return (
      <>
        {renderStatCards()}
        {renderAwaitingStrip()}
        {renderChart()}
        <div className="panels">
          {renderTopProducts()}
          {renderByStatus()}
        </div>
      </>
    )
  }

  return (
    <SellerLayout
      heading="Seller Dashboard"
      subtitle={user === null ? '' : `Signed in as ${user.username}`}
      activeTab="overview"
    >
      {renderOverview()}
    </SellerLayout>
  )
}

export default SellerDashboard
