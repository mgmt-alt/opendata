import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { FiltersProvider } from './lib/store.jsx'
import './styles.css'

// HashRouter keeps deep links working on static hosts (GitHub Pages) with no server config.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <FiltersProvider>
        <App />
      </FiltersProvider>
    </HashRouter>
  </React.StrictMode>,
)
