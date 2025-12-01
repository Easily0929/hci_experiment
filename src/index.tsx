import React from 'react'
import ReactDOM from 'react-dom/client'
// 确保引入的文件名是 './App'，且你的 App.tsx 是默认导出 (export default)
import App from './App'
// 如果你有 index.css 可以在这里引入，没有也没关系
import './style.css' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
