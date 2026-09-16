import {useState} from 'react'
import {Link, Navigate} from 'react-router'

import {apiFetch, saveTokens, getAccessToken} from '../../api'

import './index.css'

const LoginForm = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showSubmitError, setShowSubmitError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const onChangeUsername = event => {
    setUsername(event.target.value)
  }

  const onChangePassword = event => {
    setPassword(event.target.value)
  }

  const renderPasswordField = () => (
    <>
      <label className="input-label" htmlFor="password">
        PASSWORD
      </label>
      <input
        type="password"
        id="password"
        className="password-input-field"
        value={password}
        onChange={onChangePassword}
        placeholder="Password"
      />
    </>
  )

  const renderUsernameField = () => (
    <>
      <label className="input-label" htmlFor="username">
        USERNAME
      </label>
      <input
        type="text"
        id="username"
        className="username-input-field"
        value={username}
        onChange={onChangeUsername}
        placeholder="Username"
      />
    </>
  )
  // Django's login returns a *pair* of tokens, so we keep both.
  const onSubmitSuccess = tokens => {
    saveTokens(tokens)
    // A full page load, not navigate(). App reads the cart once, on mount —
    // and by now it has already mounted, with no token to read it with. Without
    // this reload the cart would stay empty until the next manual refresh.
    window.location.replace('/')
  }
  const onSubmitFailure = message => {
    setShowSubmitError(true)
    setErrorMsg(message)
  }

  const submitForm = async event => {
    event.preventDefault()
    const userDetails = {username, password}
    // POST /api/users/login/ — the only request in the app that sends a
    // password. Everything after this sends the token instead.
    const response = await apiFetch('/api/users/login/', {
      method: 'POST',
      body: JSON.stringify(userDetails),
    })
    const data = await response.json()
    if (response.ok === true) {
      // SimpleJWT answers with {access, refresh}
      onSubmitSuccess({access: data.access, refresh: data.refresh})
    } else {
      // ...and puts its failure message in `detail`, not `error_msg`
      onSubmitFailure(data.detail ?? 'Login failed. Please try again.')
    }
  }
  if (getAccessToken() !== undefined) {
    return <Navigate to="/" />
  }
  return (
    <div className="login-form-container">
      <img
        src="https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/nxt-trendz-logo.png"
        className="login-website-logo-mobile-img"
        alt="website logo"
      />
      <img
        src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-login-img.png"
        className="login-img"
        alt="website login"
      />
      <form className="form-container" onSubmit={submitForm}>
        <img
          src="https://s3.ap-south-1.amazonaws.com/new-assets.ccbp.in/frontend/loading-data/niat_react_js/niat_coding_questions/nxt-trendz-logo.png"
          className="login-website-logo-desktop-img"
          alt="website logo"
        />
        <div className="input-container">{renderUsernameField()}</div>
        <div className="input-container">{renderPasswordField()}</div>
        <button type="submit" className="login-button">
          Login
        </button>
        {showSubmitError && <p className="error-message">*{errorMsg}</p>}

        <p className="form-footer-text">
          New to Nxt Trendz?{' '}
          <Link className="form-footer-link" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}

export default LoginForm
