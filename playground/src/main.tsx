import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
// import App from './App';

const App = () => <div>hello tycho!!</div>;

ReactDOM.render(<App />, document.getElementById('root'));

console.log('🚀 ~ file: main.tsx run', import.meta.url);

// @ts-ignore
import.meta.hot.accept((...args) => {
  console.log(
    '🚀 ~ file: main.tsx:16 ~ import.meta.hot.accept ~ accept:',
    import.meta.url,
    args
  );
});
