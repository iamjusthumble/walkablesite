import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { faqs } from './faqs.js'
export { faqs }
export function render(path = '/') { return renderToString(<App pagePath={path}/>) }
