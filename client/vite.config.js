import { defineConfig } from 'vite'; // Import defineConfig() from 'vite' library which wraps
                                     // the config object to give better type safety, autocompletion, and IDE support. 

import react from '@vitejs/plugin-react'; // Imported to enable React for vite (JSX, fast refrehes, etc.)

export default defineConfig({
  plugins: [react()], // register vite plugins here (only 'react' needed right now)
  base: '/',          // needed for Render and production paths
  server: {           // NOTE: this shouldn't run in a production environment and should ONLY run on localhost
    port: 3000,       //       frontend server port for localhost (EDIT if using different port!)
    open: true        //       (optional) auto-opens browser when server starts
  }
});
