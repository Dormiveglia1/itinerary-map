import { Link, NavLink, Outlet } from 'react-router'

function Layout() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="site-title">
          Itinerary Map
        </Link>
        <nav aria-label="Main">
          <NavLink to="/plan" end>
            Plan a trip
          </NavLink>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}

export default Layout
