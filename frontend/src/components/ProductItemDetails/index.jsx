import {useState, useEffect, useContext} from 'react'
import {Link, useParams} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'
import {BsPlusSquare, BsDashSquare} from 'react-icons/bs'

import CartContext from '../../context/CartContext'

import Header from '../Header'

import {apiFetch} from '../../api'

import './index.css'

const apiStatusConstants = {
  initial: 'INITIAL',
  success: 'SUCCESS',
  failure: 'FAILURE',
  inProgress: 'IN_PROGRESS',
}

const ProductItemDetails = () => {
  const [productData, setProductData] = useState({})
  const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial)
  const [quantity, setQuantity] = useState(1)
  const {id} = useParams()
  const value = useContext(CartContext)
  const {addCartItem} = value

  const onClickAddToCart = () => {
    addCartItem({...productData, quantity})
  }

  // Only the fields our detail endpoint actually returns. The old API also
  // sent availability, a description and a review count — ours does not, so
  // the screen no longer shows them.
  const getFormattedData = data => ({
    brand: data.brand,
    id: data.id,
    imageUrl: data.imageUrl,
    price: data.price,
    rating: data.rating,
    title: data.title,
  })

  useEffect(() => {
    const getProductData = async () => {
      setApiStatus(apiStatusConstants.inProgress)

      const response = await apiFetch(`/api/products/${id}/`)
      if (response.ok) {
        const fetchedData = await response.json()
        const updatedData = getFormattedData(fetchedData)
        setProductData(updatedData)
        setApiStatus(apiStatusConstants.success)
      } else {
        // A wrong id gives 404 — and so does a prime product asked for without
        // a login, because the backend hides those rows from visitors.
        setApiStatus(apiStatusConstants.failure)
      }
    }
    getProductData()
  }, [id])

  const onDecrementQuantity = () => {
    setQuantity(prevQuantity =>
      prevQuantity > 1 ? prevQuantity - 1 : prevQuantity,
    )
  }

  const onIncrementQuantity = () => {
    setQuantity(prevQuantity => prevQuantity + 1)
  }

  const renderLoadingView = () => (
    <div className="products-details-loader-container" data-testid="loader">
      <BeatLoader color="#ffffff" />
    </div>
  )

  const renderFailureView = () => (
    <div className="product-details-error-view-container">
      <img
        alt="error view"
        src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-error-view-img.png"
        className="error-view-image"
      />
      <h1 className="product-not-found-heading">Product Not Found</h1>
      <Link to="/products">
        <button type="button" className="button">
          Continue Shopping
        </button>
      </Link>
    </div>
  )

  const renderProductDetailsView = () => {
    const {brand, imageUrl, price, rating, title} = productData

    return (
      <div className="product-details-success-view">
        <div className="product-details-container">
          <img src={imageUrl} alt="product" className="product-image" />
          <div className="product">
            <h1 className="product-name">{title}</h1>
            <p className="price-details">Rs {price}/-</p>
            <div className="rating-and-reviews-count">
              <div className="rating-container">
                <p className="rating">{rating}</p>
                <img
                  src="https://assets.ccbp.in/frontend/react-js/star-img.png"
                  alt="star"
                  className="star"
                />
              </div>
            </div>
            <br></br>
            <div className="label-value-container">
              <p className="label">Brand:</p>
              <p className="value">{brand}</p>
            </div>
            <hr className="horizontal-line" />
            <div className="quantity-container">
          
            </div>
           
            <button
              type="button"
              className="button add-to-cart-btn"
              onClick={onClickAddToCart}
            >
              ADD TO CART
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderProductDetails = () => {
    switch (apiStatus) {
      case apiStatusConstants.success:
        return renderProductDetailsView()
      case apiStatusConstants.failure:
        return renderFailureView()
      case apiStatusConstants.inProgress:
        return renderLoadingView()
      default:
        return null
    }
  }

  return (
    <>
      <Header />
      <div className="product-item-details-container">
        {renderProductDetails()}
      </div>
    </>
  )
}

export default ProductItemDetails
