import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 先把 css 注释掉，防止因为找不到文件而白屏
// import './style.css' 

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
