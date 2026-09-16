import {useState, useEffect} from 'react'
import BeatLoader from 'react-spinners/BeatLoader'

import ProductCard from '../ProductCard'

import {apiFetch} from '../../api'

import './index.css'

import ProductsHeader from '../ProductsHeader'
import FiltersGroup from '../FiltersGroup'

// categoryId is the value we send to Django, so it holds the category name our
// backend stores — not the numeric id the old API wanted.
const categoryOptions = [
  {
    name: 'Clothing',
    categoryId: 'Clothing',
  },
  {
    name: 'Electronics',
    categoryId: 'Electronics',
  },
  {
    name: 'Appliances',
    categoryId: 'Appliances',
  },
  {
    name: 'Grocery',
    categoryId: 'Grocery',
  },
  {
    name: 'Toys',
    categoryId: 'Toys',
  },
]

// optionId is the value we send as `ordering`. A leading - means descending.
const sortbyOptions = [
  {
    optionId: '-price',
    displayText: 'Price (High-Low)',
  },
  {
    optionId: 'price',
    displayText: 'Price (Low-High)',
  },
]

const ratingsList = [
  {
    ratingId: '4',
    imageUrl:
      'https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/rating-4.png',
  },
  {
    ratingId: '3',
    imageUrl:
      'https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/rating-3.png',
  },
  {
    ratingId: '2',
    imageUrl:
      'https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/rating-2.png',
  },
  {
    ratingId: '1',
    imageUrl:
      'https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/rating-1.png',
  },
]

// must match page_size in backend/products/pagination.py
const PAGE_SIZE = 5

const AllProductsSection = () => {
  const [productsList, setProductsList] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeOptionId, setActiveOptionId] = useState(
    sortbyOptions[0].optionId,
  )
  const [activeCategoryId, setActiveCategoryId] = useState('')

  // Two states for one search box: what is being typed, and what we have
  // actually asked Django for. Only the second one triggers a request.
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [activeRatingId, setActiveRatingId] = useState('')

  // pagination state, driven by the count/next/previous keys the API returns
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)

  const changeSortby = optionId => {
    setActiveOptionId(optionId)
    setCurrentPage(1)
  }
  useEffect(() => {
    const getProducts = async () => {
      setIsLoading(true)
      // Every name in this URL is one Django agreed to answer to:
      // ordering, category, search and rating.
      const url =
        `/api/products/?page=${currentPage}&ordering=${activeOptionId}` +
        `&category=${activeCategoryId}&search=${searchQuery}` +
        `&rating=${activeRatingId}`

      // apiFetch, not fetch: this page is behind a login, and without the
      // token Django answers as if we were a visitor — 48 products, not 54.
      const response = await apiFetch(url)
      if (response.ok) {
        const fetchedData = await response.json()
        // DRF pagination wraps the rows in `results`
        const formattedData = fetchedData.results.map(product => ({
          title: product.title,
          brand: product.brand,
          price: product.price,
          id: product.id,
          imageUrl: product.imageUrl,
          rating: product.rating,
        }))
        setProductsList(formattedData)
        setTotalProducts(fetchedData.count)
        setHasNextPage(fetchedData.next !== null)
        setHasPrevPage(fetchedData.previous !== null)
      }
      setIsLoading(false)
    }
    getProducts()
  }, [
    activeOptionId,
    activeCategoryId,
    searchQuery,
    activeRatingId,
    currentPage,
  ])

  const clearFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setActiveCategoryId('')
    setActiveRatingId('')
    setCurrentPage(1)
  }

  const changeRating = ratingId => {
    setActiveRatingId(ratingId)
    setCurrentPage(1)
  }

  const changeCategory = categoryId => {
    setActiveCategoryId(categoryId)
    setCurrentPage(1)
  }

  // Typing only updates the box. Nothing is sent until Enter.
  const changeSearchInput = input => {
    setSearchInput(input)
  }

  // FiltersGroup calls this with no argument, so it reads the box itself.
  const enterSearchInput = () => {
    setSearchQuery(searchInput)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalProducts / PAGE_SIZE)

  const onClickNext = () => {
    if (hasNextPage) {
      setCurrentPage(prevPage => prevPage + 1)
    }
  }

  const onClickPrevious = () => {
    if (hasPrevPage) {
      setCurrentPage(prevPage => prevPage - 1)
    }
  }

  const renderPagination = () => (
    <div className="pagination-container">
      <button
        type="button"
        className="pagination-button"
        onClick={onClickPrevious}
        disabled={!hasPrevPage}
      >
        Previous
      </button>
      <p className="pagination-text">
        {currentPage} of {totalPages}
      </p>
      <button
        type="button"
        className="pagination-button"
        onClick={onClickNext}
        disabled={!hasNextPage}
      >
        Next
      </button>
    </div>
  )

  const renderProductsList = () => {
    if (isLoading) {
      return (
        <div className="products-loader-container">
          <BeatLoader color="#0b69ff" size={15} />
        </div>
      )
    }

    const shouldShowProductsList = productsList.length > 0

    return shouldShowProductsList ? (
      <div className="all-products-container">
        <ProductsHeader
          activeOptionId={activeOptionId}
          sortbyOptions={sortbyOptions}
          updateActiveOptionId={changeSortby}
        />
        <ul className="products-list">
          {productsList.map(product => (
            <ProductCard productData={product} key={product.id} />
          ))}
        </ul>
        {renderPagination()}
      </div>
    ) : (
      <div className="no-products-view">
        <img
          src="https://assets.ccbp.in/frontend/react-js/nxt-trendz/nxt-trendz-no-products-view.png"
          className="no-products-img"
          alt="no products"
        />
        <h1 className="no-products-heading">No Products Found</h1>
        <p className="no-products-description">
          We could not find any products. Try other filters.
        </p>
      </div>
    )
  }

  return (
    <div className="all-products-section">
      <FiltersGroup
        searchInput={searchInput}
        categoryOptions={categoryOptions}
        ratingsList={ratingsList}
        changeSearchInput={changeSearchInput}
        enterSearchInput={enterSearchInput}
        activeCategoryId={activeCategoryId}
        activeRatingId={activeRatingId}
        changeCategory={changeCategory}
        changeRating={changeRating}
        clearFilters={clearFilters}
      />
      {renderProductsList()}
    </div>
  )
}

export default AllProductsSection
