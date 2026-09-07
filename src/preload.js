const { ipcRenderer, contextBridge } = require('electron');

window.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SEARCH_INPUT' || event.data.type === 'LOAD_URL')) {
    ipcRenderer.sendToHost(event.data.type, event.data);
  }
});

contextBridge.exposeInMainWorld('browserAPI', {
  goBack: () => ipcRenderer.send('nav-back'),
  goForward: () => ipcRenderer.send('nav-forward'),
  goToIndex: (index) => ipcRenderer.send('nav-go-to', index),
  

  onStateChange: (callback) => ipcRenderer.on('nav-state-changed', (event, state) => callback(state))
});