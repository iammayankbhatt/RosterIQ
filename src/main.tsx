import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import AtRisk from './pages/AtRisk'
import DesignKit from './pages/DesignKit'
import Employees from './pages/Employees'
import NotFound, { ErrorPage } from './pages/NotFound'
import Home from './pages/Home'
import Roster from './pages/Roster'
import StaffApp from './pages/StaffApp'
import SeedPage from './pages/SeedPage'
import './index.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/roster', element: <Roster /> },
      { path: '/at-risk', element: <AtRisk /> },
      { path: '/employees', element: <Employees /> },
      { path: '/staff-app', element: <StaffApp /> },
      { path: '/seed', element: <SeedPage /> },
      { path: '/kit', element: <DesignKit /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
