import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { MantineProvider } from '@mantine/core'

import { appWindow } from '@tauri-apps/api/window'
import { emit, listen } from '@tauri-apps/api/event'

const root = ReactDOM.createRoot(document.getElementById('root')!)
export function renderRoot() {
  root.render(
    <React.StrictMode>
      <MantineProvider
          withGlobalStyles
          withNormalizeCSS
          emotionOptions={{ key: "mantine", prepend: false }}
          theme={{
            colorScheme: "light",
          }}
        >
        <App />
      </MantineProvider>
    </React.StrictMode>
  )
}
renderRoot()

// this allows `window.innerHeight` to be updated when window size changes
window.addEventListener('resize', renderRoot);



// FIXME: top-level await not allowed when build

// {
//   const r = await listen('hide-window', event => {
//     appWindow.hide()
//   })
// }
// {
//   const r = await listen('show-window', event => {
//     appWindow.show()
//   })
// }
