/* React entry point for your app via Vite (instead of index.js from Create React App / React-scripts) */

import React          from 'react';            // Access to React features like JSX, hooks, and component logic
import { createRoot } from 'react-dom/client'; // used to render the <App/> into the browser DOM
import { Provider }   from "react-redux";      // ensures Redux store is accessible to all components wrapped by <Provider> 

import App   from './App/App';                 // main App component which is the root of UI
import store from './Store/store';             // import configured redux store (source of all truth)

const rootElement = document.getElementById('root'); // references <div id="root"> in index.html where app will be mounted
const root        = createRoot(rootElement);         // Create a React root using DOM element — needed for React 18+

root.render( // Renders React app in <React.StrictMode> (which helps detect issues during development)
  <React.StrictMode>
    <Provider store={store} > {/* Ensures 'store' is available throughout <App /> */}
        <App />
    </Provider>
  </React.StrictMode>
); 