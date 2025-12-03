import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 只要你的 index.html 里有 <script src="cdn.tailwindcss...">，样式就会生效
// import './style.css'  <-- 除非你确定有这个文件，否则不要解开注释

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
