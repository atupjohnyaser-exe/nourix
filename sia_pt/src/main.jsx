import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Pick the saved theme, or follow the device setting the first time.
let theme
try { theme = localStorage.getItem('theme') } catch {}
if (!theme) theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
document.documentElement.dataset.theme = theme

createRoot(document.getElementById('root')).render(<App />)
