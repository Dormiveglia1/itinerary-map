import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './routes.tsx'
import { TripProvider } from './trip/TripProvider.tsx'

const router = createBrowserRouter(routes)

function App() {
  return (
    <TripProvider>
      <RouterProvider router={router} />
    </TripProvider>
  )
}

export default App
