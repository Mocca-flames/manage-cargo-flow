import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ToastProvider } from './components/toast'
import { OfflineBanner } from './components/OfflineBanner'
import { UpdateToast } from './components/UpdateToast'
import { router } from './router'
import './styles/index.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <OfflineBanner />
      <RouterProvider router={router} />
      <UpdateToast />
    </ToastProvider>
  </StrictMode>,
)
