import React from 'react'

// Who is logged in — read once, in App.jsx, from GET /api/users/profile/.
//
// The Header needs it to decide whether to show the Dashboard link at all: a
// customer should not see a door that answers 403.
const UserContext = React.createContext({
  user: null,
  isUserLoading: false,
})

export default UserContext
