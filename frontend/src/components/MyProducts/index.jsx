import {useState, useEffect} from 'react'
import {Link, useSearchParams} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import SellerLayout from '../SellerLayout'
import SellerProductsBar from '../SellerProductsBar'

import {apiFetch} from '../../api'
import {formatRupees} from '../../format'

import './index.css'

// ============================================================================
// Part 1 — My Products      GET /api/seller/products/?page=1&search=
//                           DELETE /api/products/<id>/
// ============================================================================
// What comes back:
//   count         how many products you own
//   total_pages   how many pages the list needs, printed in the footer
//   results       the products on this page — id, title, brand, category,
//                 rating, price, availability, image_url
//
// Only your own products come back. The server decides that, from the token.
// ============================================================================

const MyProducts = () => {
  // The page number and the search words live in the browser's URL, not in
  // useState. Reload the page, come back from Edit, share the link — the same
  // question is asked again, because the question is in the address bar.
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const search = searchParams.get('search') ?? ''

  // What is being typed, and what we have actually asked Django for. Only the
  // second one is in the URL, and only the second one triggers a request.
  const [searchInput, setSearchInput] = useState(search)

  const [products, setProducts] = useState([])
  const [count, setCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Which product the Delete confirmation is asking about. null = no dialog.
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getProducts = async () => {
    setIsLoading(true)
    // The server does the filtering and the paging. Never filter in the
    // browser: page 1 of 11 does not contain the row you are looking for.
    const response = await apiFetch(
      `/api/seller/products/?page=${page}&search=${encodeURIComponent(search)}`,
    )
    if (response.ok) {
      const data = await response.json()
      setProducts(data.results)
      setCount(data.count)
      setTotalPages(data.total_pages)
    }
    setIsLoading(false)
  }

  // One request when the page opens, and one more whenever the question in the
  // URL changes.
  useEffect(() => {
    getProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  const onSubmitSearch = event => {
    event.preventDefault()
    // A new search always starts on page 1 — page 7 of the old list means
    // nothing in the new one.
    setSearchParams({page: 1, search: searchInput})
  }

  const goToPage = nextPage => {
    setSearchParams({page: nextPage, search})
  }

  const onClickDelete = async () => {
    setIsDeleting(true)
    const response = await apiFetch(`/api/products/${productToDelete.id}/`, {
      method: 'DELETE',
    })
    setIsDeleting(false)
    setProductToDelete(null)

    // 204 is the whole answer. There is no body to read.
    if (response.status === 204) {
      // Deleting the last row of a page would leave us looking at an empty
      // page that no longer exists, so step back one.
      if (products.length === 1 && page > 1) {
        goToPage(page - 1)
        return
      }
      // The row stays on the screen until the list is read again.
      getProducts()
    }
  }

  const renderRow = product => (
    <li className="product-row" key={product.id}>
      <img
        className="product-row-image"
        src={product.image_url}
        alt={product.title}
      />

      <div className="product-row-text">
        <p className="product-row-title">{product.title}</p>
        <p className="product-row-meta">
          {product.brand} &nbsp;•&nbsp; {product.category} &nbsp;•&nbsp;{' '}
          {product.rating}★ &nbsp;•&nbsp;{' '}
          <span
            className={
              product.availability === 'In Stock'
                ? 'product-row-stock'
                : 'product-row-out-of-stock'
            }
          >
            {product.availability}
          </span>
        </p>
      </div>

      <p className="product-row-price">{formatRupees(product.price)}</p>

      <div className="product-row-actions">
        <Link
          to={`/dashboard/products/${product.id}/edit`}
          className="product-row-edit"
        >
          Edit
        </Link>
        <button
          type="button"
          className="product-row-delete"
          onClick={() => setProductToDelete(product)}
        >
          Delete
        </button>
      </div>
    </li>
  )

  const renderPagination = () => (
    <div className="product-pagination">
      <button
        type="button"
        className="product-pagination-btn"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>
      <p className="product-pagination-text">
        Page {page} of {totalPages} &nbsp;•&nbsp; {count} products
      </p>
      <button
        type="button"
        className="product-pagination-btn"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  )

  const renderEmptyView = () => (
    <div className="products-empty">
      <h2 className="products-empty-heading">
        {search === '' ? 'No products yet' : 'No products match that search'}
      </h2>
      <p className="products-empty-text">
        {search === ''
          ? 'Everything you list shows up here, and in the shop everybody sees.'
          : `Nothing of yours matches “${search}”.`}
      </p>
      <Link to="/dashboard/products/new" className="products-add-btn">
        + Add Product
      </Link>
    </div>
  )

  const renderList = () => {
    // Nothing is drawn before the answer arrives — an empty list and "we have
    // not asked yet" look the same from here.
    if (isLoading) {
      return (
        <div className="seller-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }

    if (products.length === 0) {
      return renderEmptyView()
    }

    return (
      <div className="seller-card products-table">
        <ul className="product-rows">{products.map(renderRow)}</ul>
        {renderPagination()}
      </div>
    )
  }

  // Asked before anything is sent, and it names the product: a delete cannot
  // be undone.
  const renderDeleteConfirm = () => (
    <div className="delete-overlay">
      <div className="delete-dialog">
        <h2 className="delete-dialog-heading">Delete this product?</h2>
        <p className="delete-dialog-text">
          <span className="delete-dialog-title">{productToDelete.title}</span>{' '}
          will be removed from the shop. This cannot be undone — but it stays
          inside any order that already contains it.
        </p>
        <div className="delete-dialog-actions">
          <button
            type="button"
            className="seller-btn-secondary"
            onClick={() => setProductToDelete(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-dialog-confirm"
            onClick={onClickDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <SellerLayout
      heading="My Products"
      subtitle="Add, edit and remove the products you sell."
      activeTab="products"
    >
      <SellerProductsBar
        searchInput={searchInput}
        onChangeSearchInput={event => setSearchInput(event.target.value)}
        onSubmitSearch={onSubmitSearch}
      />
      {renderList()}
      {productToDelete !== null && renderDeleteConfirm()}
    </SellerLayout>
  )
}

export default MyProducts
