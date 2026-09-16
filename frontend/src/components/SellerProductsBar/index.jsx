import {Link} from 'react-router'

import './index.css'

// The row above the product table: one search box, and the button that opens
// the Add Product form. Both the list and the form show it, so it lives here.
const SellerProductsBar = props => {
  const {searchInput, onChangeSearchInput, onSubmitSearch} = props

  return (
    <div className="products-bar">
      <form className="products-search" onSubmit={onSubmitSearch}>
        <input
          type="search"
          className="products-search-input"
          placeholder="Search your products"
          value={searchInput}
          onChange={onChangeSearchInput}
        />
        <button type="submit" className="products-search-btn">
          Search
        </button>
      </form>

      <Link to="/dashboard/products/new" className="products-add-btn">
        + Add Product
      </Link>
    </div>
  )
}

export default SellerProductsBar
