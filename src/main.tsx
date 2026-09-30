import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import { MotionConfig } from 'framer-motion'
import './index.css'
import { AppProvider } from './context/AppContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'

const queryClient = new QueryClient()

window.addEventListener('auth:cleared', () => {
  queryClient.clear();
});
window.addEventListener('auth:unauthorized', () => {
  queryClient.clear();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
      <AppProvider>
          <App />
          <Toaster position="top-center" toastOptions={{
            style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }
          }} />
        </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
)
