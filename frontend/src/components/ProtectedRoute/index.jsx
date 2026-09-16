import {Navigate} from 'react-router'

import {getAccessToken} from '../../api'

// A convenience gate, not a security boundary: it only decides which screen to
// show. The real lock is on the server — Django checks the token on every call.
const ProtectedRoute = ({children}) => {
  const token = getAccessToken()
  if (token === undefined) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedRoute
