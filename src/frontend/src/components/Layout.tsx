import {
  Alignment,
  Classes,
  Icon,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  type IconName,
} from '@blueprintjs/core'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

// A router link styled as a minimal Blueprint button, so it keeps real link
// behaviour (middle-click, copy address) and gets the active highlight.
function NavButton({
  to,
  icon,
  end,
  children,
}: {
  to: string
  icon: IconName
  end?: boolean
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [Classes.BUTTON, Classes.MINIMAL, isActive && Classes.ACTIVE]
          .filter(Boolean)
          .join(' ')
      }
    >
      <Icon icon={icon} />
      <span className={Classes.BUTTON_TEXT}>{children}</span>
    </NavLink>
  )
}

function Layout() {
  return (
    <>
      <Navbar className="site-navbar">
        <NavbarGroup align={Alignment.START}>
          <NavbarHeading>
            <Link to="/" className="site-title">
              <Icon icon="map" />
              Itinerary Map
            </Link>
          </NavbarHeading>
          <NavbarDivider />
          <nav aria-label="Main" className="site-nav">
            <NavButton to="/" icon="home" end>
              Home
            </NavButton>
            <NavButton to="/plan" icon="path-search">
              Plan a trip
            </NavButton>
          </nav>
        </NavbarGroup>
      </Navbar>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}

export default Layout
