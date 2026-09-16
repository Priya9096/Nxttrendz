import {useState, useEffect} from 'react'
import {useNavigate, useParams} from 'react-router'
import BeatLoader from 'react-spinners/BeatLoader'

import SellerLayout from '../SellerLayout'
import SellerProductsBar from '../SellerProductsBar'

import {apiFetch} from '../../api'

import './index.css'

// ============================================================================
// Part 1 — Add Product     POST  /api/products/
//          Edit Product    GET   /api/products/<id>/   to fill the form
//                          PATCH /api/products/<id>/   to save the change
// ============================================================================
// One component, two jobs. The id in the URL is what tells them apart:
//
//   /dashboard/products/new        no id      -> POST, an empty form
//   /dashboard/products/12/edit    id = 12    -> GET first, then PATCH
//
// Never send `seller`. The server takes the owner from the login token.
// ============================================================================

// The two dropdowns have fixed choices, so a typo can never reach the database.
const CATEGORY_OPTIONS = [
  'Clothing',
  'Electronics',
  'Appliances',
  'Grocery',
  'Toys',
]

const AVAILABILITY_OPTIONS = ['In Stock', 'Out of Stock']

// One entry per box on the form. Everything is a string, because that is what
// an <input> holds — Django parses the number, and says so if it cannot.
const EMPTY_FORM = {
  title: '',
  brand: '',
  category: 'Clothing',
  price: '',
  image_url: '',
  rating: '',
  availability: 'In Stock',
  total_reviews: '',
  description: '',
  is_prime: false,
}

const ProductForm = () => {
  const {id} = useParams()
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  // What the server sent us, kept aside so PATCH can send only what changed.
  const [original, setOriginal] = useState(null)

  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  // The 400 body, field by field: {"price": ["A valid number is required."]}
  const [errors, setErrors] = useState({})

  const [searchInput, setSearchInput] = useState('')

  // Read the product first, then copy each field from the answer into its box.
  // The boxes must open full, with real values in them — not placeholders.
  useEffect(() => {
    const getProduct = async () => {
      const response = await apiFetch(`/api/products/${id}/`)
      if (response.ok) {
        const data = await response.json()
        const loaded = {
          title: data.title,
          brand: data.brand,
          category: data.category ?? '',
          // "30.00" arrives as a string. Kept exactly as it came, so an
          // untouched box never counts as a change.
          price: data.price,
          image_url: data.image_url,
          rating: String(data.rating),
          availability: data.availability,
          total_reviews: String(data.total_reviews),
          description: data.description,
          is_prime: data.is_prime,
        }
        setForm(loaded)
        setOriginal(loaded)
      }
      setIsLoading(false)
    }

    if (isEdit) {
      getProduct()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // One handler for every box: each keystroke updates its own key in state.
  const onChangeField = event => {
    const {name, value, type, checked} = event.target
    setForm(prevForm => ({
      ...prevForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // POST wants the whole product. The optional numbers are left out when their
  // box is empty, so Django can apply its own defaults instead of being handed
  // an empty string it cannot read as a number.
  const buildCreateBody = () => {
    const body = {
      title: form.title,
      brand: form.brand,
      category: form.category,
      price: form.price,
      image_url: form.image_url,
      availability: form.availability,
      description: form.description,
      is_prime: form.is_prime,
    }
    if (form.rating !== '') {
      body.rating = form.rating
    }
    if (form.total_reviews !== '') {
      body.total_reviews = form.total_reviews
    }
    return body
  }

  // PATCH wants only what the seller actually touched. Every field left out
  // stays exactly as it was.
  const buildPatchBody = () => {
    const body = {}
    Object.keys(form).forEach(key => {
      if (form[key] !== original[key]) {
        body[key] = form[key]
      }
    })
    return body
  }

  const onSubmit = async event => {
    event.preventDefault()
    setErrors({})

    const body = isEdit ? buildPatchBody() : buildCreateBody()

    // Nothing was changed, so there is nothing to send.
    if (isEdit && Object.keys(body).length === 0) {
      navigate('/dashboard/products')
      return
    }

    setIsSaving(true)
    // Save sends it once — one request, carrying the whole form.
    const response = await apiFetch(
      isEdit ? `/api/products/${id}/` : '/api/products/',
      {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      },
    )
    setIsSaving(false)

    if (response.ok) {
      // Back to the list, which reads itself again on the way in — only then
      // does the new row (or the new price) appear.
      navigate('/dashboard/products')
      return
    }

    // A 400 names the bad field. Show it, and keep what was typed.
    const data = await response.json()
    setErrors(data)
  }

  const renderError = field => {
    const message = errors[field]
    if (message === undefined) {
      return null
    }
    return (
      <p className="form-error">
        {Array.isArray(message) ? message[0] : message}
      </p>
    )
  }

  const renderTextField = (field, label, options = {}) => (
    <div className="form-field">
      <label className="form-label" htmlFor={field}>
        {label}
      </label>
      <input
        id={field}
        name={field}
        type={options.type ?? 'text'}
        className="form-input"
        placeholder={options.placeholder ?? ''}
        value={form[field]}
        onChange={onChangeField}
      />
      {renderError(field)}
    </div>
  )

  const renderSelectField = (field, label, choices) => (
    <div className="form-field">
      <label className="form-label" htmlFor={field}>
        {label}
      </label>
      <select
        id={field}
        name={field}
        className="form-input"
        value={form[field]}
        onChange={onChangeField}
      >
        {/* A product loaded from the database may hold a category that is not
            in our list. Keep it, instead of silently rewriting it. */}
        {choices.includes(form[field]) === false && (
          <option value={form[field]}>{form[field]}</option>
        )}
        {choices.map(choice => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
      {renderError(field)}
    </div>
  )

  const renderForm = () => (
    <form className="seller-card product-form" onSubmit={onSubmit}>
      <h2 className="seller-card-heading">
        {isEdit ? 'Edit Product' : 'Add a Product'}
      </h2>

      <div className="form-grid">
        {renderTextField('title', 'TITLE', {placeholder: 'Product name'})}
        {renderTextField('brand', 'BRAND', {placeholder: 'Brand'})}

        {renderSelectField('category', 'CATEGORY', CATEGORY_OPTIONS)}
        {renderTextField('price', 'PRICE (RS)', {placeholder: '999.00'})}

        {renderTextField('image_url', 'IMAGE URL', {
          placeholder: 'https://...',
        })}
        {renderTextField('rating', 'RATING', {placeholder: '4.0'})}

        {renderSelectField(
          'availability',
          'AVAILABILITY',
          AVAILABILITY_OPTIONS,
        )}
        {renderTextField('total_reviews', 'TOTAL REVIEWS', {placeholder: '0'})}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="description">
          DESCRIPTION
        </label>
        <textarea
          id="description"
          name="description"
          className="form-input form-textarea"
          rows="4"
          value={form.description}
          onChange={onChangeField}
        />
        {renderError('description')}
      </div>

      <label className="form-checkbox-row" htmlFor="is_prime">
        <input
          id="is_prime"
          name="is_prime"
          type="checkbox"
          checked={form.is_prime}
          onChange={onChangeField}
        />
        <span className="form-checkbox-text">
          Prime deal – shown in the Exclusive Prime Deals strip, and hidden from
          visitors who are not logged in.
        </span>
      </label>

      {/* A 400 with no field name — "detail" — belongs to the whole form. */}
      {errors.detail !== undefined && (
        <p className="seller-error">{errors.detail}</p>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="seller-btn-primary"
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save Product'}
        </button>
        <button
          type="button"
          className="seller-btn-secondary form-cancel"
          onClick={() => navigate('/dashboard/products')}
        >
          Cancel
        </button>
      </div>
    </form>
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="seller-loader" data-testid="loader">
          <BeatLoader color="#6d1d9c" />
        </div>
      )
    }
    // An id that is not yours, or does not exist, never fills the form.
    if (isEdit && original === null) {
      return (
        <div className="seller-card">
          <p className="seller-error">
            That product could not be opened. It may have been deleted, or it
            may belong to another seller.
          </p>
        </div>
      )
    }
    return renderForm()
  }

  return (
    <SellerLayout
      heading="My Products"
      subtitle="Add, edit and remove the products you sell."
      activeTab="products"
    >
      <SellerProductsBar
        searchInput={searchInput}
        onChangeSearchInput={event => setSearchInput(event.target.value)}
        onSubmitSearch={event => {
          event.preventDefault()
          navigate(`/dashboard/products?page=1&search=${searchInput}`)
        }}
      />
      {renderContent()}
    </SellerLayout>
  )
}

export default ProductForm
