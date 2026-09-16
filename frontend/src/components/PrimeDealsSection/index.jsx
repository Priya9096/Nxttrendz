import {useState, useEffect} from 'react'
import BeatLoader from 'react-spinners/BeatLoader'

import ProductCard from '../ProductCard'

import {apiFetch} from '../../api'

import './index.css'

const apiStatusConstants = {
  initial: 'INITIAL',
  success: 'SUCCESS',
  failure: 'FAILURE',
  inProgress: 'IN_PROGRESS',
}

// The deals strip is a teaser, not a browsable list. Ask for as many as it has
// room for — otherwise DRF's default page of 5 quietly decides for us.
const PRIME_DEALS_COUNT = 6

const PrimeDealsSection = () => {
  const [apiResponse, setApiResponse] = useState({
    status: apiStatusConstants.initial,
    data: null,
    errorMsg: null,
  })

  useEffect(() => {
    const getPrimeDeals = async () => {
      // Before the fetch operation, set API status to inProgress
      setApiResponse({
        status: apiStatusConstants.inProgress,
        data: null,
        errorMsg: null,
      })

      // apiFetch adds the base URL and the Authorization header for us.
      // ?is_prime=true is the whole request — the same products endpoint,
      // asked a narrower question.
      const response = await apiFetch(
        `/api/products/?is_prime=true&page_size=${PRIME_DEALS_COUNT}`,
      )
      const fetchedData = await response.json()
      if (response.ok) {
        // DRF pagination wraps the rows in `results`, and our serializer
        // already sends imageUrl.
        const formattedData = fetchedData.results.map(product => ({
          title: product.title,
          brand: product.brand,
          price: product.price,
          id: product.id,
          imageUrl: product.imageUrl,
          rating: product.rating,
        }))
        // Set API status to success and store the formatted data
        setApiResponse(prevApiResponse => ({
          ...prevApiResponse,
          status: apiStatusConstants.success,
          data: formattedData,
        }))
      } else {
        // A 401 lands here: no token, or an expired one. The failure view is
        // the "register for Prime" banner — exactly the right thing to show
        // someone who is not entitled to the deals.
        setApiResponse(prevApiResponse => ({
          ...prevApiResponse,
          status: apiStatusConstants.failure,
          errorMsg: fetchedData.detail,
        }))
      }
    }

    // Call the async function inside useEffect
    getPrimeDeals()
  }, [])

  const renderPrimeDealsListView = () => {
    const {data} = apiResponse

    return (
      <div>
        <h1 className="primedeals-list-heading">Exclusive Prime Deals</h1>
        <ul className="products-list">
          {data.map(product => (
            <ProductCard productData={product} key={product.id} />
          ))}
        </ul>
      </div>
    )
  }

  const renderPrimeDealsFailureView = () => {
    return (
      <img
        src="https://assets.ccbp.in/frontend/react-js/exclusive-deals-banner-img.png"
        alt="register prime"
        className="register-prime-img"
      />
    )
  }

  const renderLoadingView = () => (
    <div className="primedeals-loader-container">
      <BeatLoader color="#6d1d9c" />
    </div>
  )

  const renderPrimeDeals = () => {
    const {status} = apiResponse
    switch (status) {
      case apiStatusConstants.success:
        return renderPrimeDealsListView()
      case apiStatusConstants.failure:
        return renderPrimeDealsFailureView()
      case apiStatusConstants.inProgress:
        return renderLoadingView()
      default:
        return null
    }
  }

  return <>{renderPrimeDeals()}</>
}

export default PrimeDealsSection
