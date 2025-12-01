import React from 'react';

export default function App() {
  console.log("App is running!"); // 这行会在控制台打印日志
  return (
    <div style={{ color: 'red', fontSize: '30px', padding: '50px' }}>
      <h1>测试成功！</h1>
      <p>如果你能看到这行字，说明环境没问题，是之前的代码有 Bug。</p>
    </div>
  );
}
