import {useState, useEffect} from 'react'
import BeatLoader from 'react-spinners/BeatLoader'

import Header from '../Header'

// apiFetch is the same helper every screen has used since Session 3. It adds
// the base URL, the JSON header, and the Authorization header when a token
// exists — so a protected endpoint needs nothing extra from you.
import {apiFetch} from '../../api'

import './index.css'

// ============================================================================
// My Profile          GET /api/users/profile/
// ============================================================================
// What the endpoint answers (log in first — it is IsAuthenticated):
//   {"username": "Priya", "email": "Priya@shop.com", "user_type": "seller"}
// ============================================================================

const Profile = () => {
  // profile is null until Django answers. isLoading tells "not asked yet"
  // apart from "asked, and there is nothing" — same idea as the cart spinner.
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const getProfile = async () => {
    // The same four lines as getCart in App.jsx, with a different URL.
    const response = await apiFetch('/api/users/profile/')
    if (response.ok) {
      const data = await response.json()
      setProfile(data)
    }
    // Whether it worked or not, we have stopped waiting.
    setIsLoading(false)
  }

  useEffect(() => {
    getProfile()
  }, [])

  const renderProfile = () => {
    if (isLoading) {
      return (
        <div className="profile-loader" data-testid="loader">
          <BeatLoader color="#3b82f6" />
        </div>
      )
    }

    if (profile === null) {
      return <p className="profile-error">Could not load your profile.</p>
    }

    return (
      <div className="profile-card">
        <div className="profile-avatar">
          {profile.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="profile-details">
          <h1 className="profile-name">{profile.username}</h1>
          <p className="profile-email">{profile.email}</p>
          <p className="profile-type">{profile.user_type}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="profile-container">
        <h1 className="profile-heading">My Profile</h1>
        {renderProfile()}
      </div>
    </>
  )
}

export default Profile
