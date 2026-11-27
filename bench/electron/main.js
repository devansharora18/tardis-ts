const { app, BrowserWindow } = require('electron')

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('no-sandbox')

function createWindow() {
  const window = new BrowserWindow({
    width: 1000,
    height: 760,
    show: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  window.loadFile('renderer/index.html')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
