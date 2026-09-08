const { app, BrowserWindow, globalShortcut, components, ipcMain, session, Menu, dialog } = require('electron');
const path = require('node:path');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

app.setAppUserModelId('lightvoyage'); 

ipcMain.handle("get-location", async () => {
    return await getLocation();
});

if (require('electron-squirrel-startup')) app.quit();

app.setPath('userData', path.join(app.getPath('appData'), 'LightVoyage'));

let mainWindow = null;
let sharedBlocker = null;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

ipcMain.on('go-back', (event) => {
    const webContents = event.sender;
    if (webContents.canGoBack()) webContents.goBack();
});

async function loadDRMComponents() {
    await components.whenReady();
    console.log('Widevine component status:', components.status());
}

function configureSessionPermissions(ses) {
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(['media', 'fullscreen', 'notifications'].includes(permission));
    });
    ses.setPermissionCheckHandler((webContents, permission) => {
        return ['media', 'fullscreen', 'notifications'].includes(permission);
    });
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            webviewTag: true,
            nodeIntegration: false,
            contextIsolation: true,
            plugins: true,
            preload: path.join(__dirname, 'preload.js'),
            frame: false,
            vibrancy: 'sidebar',
            visualEffectState: 'active',
        },
        icon: path.join(__dirname, 'LogoMinimal.ico')
    });
    
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(permission === "geolocation");
    });

    win.setProgressBar(0.5); 
    win.maximize();
    win.show();

    return win;
};

function updateNavigationState(webContents) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const navHistory = webContents.navigationHistory;
    mainWindow.webContents.send('nav-state-changed', {
        canGoBack: navHistory.canGoBack(),
        canGoForward: navHistory.canGoForward(),
        currentUrl: webContents.getURL(),
        history: navHistory.getAllEntries()
    });
}


app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
        const webviewSession = contents.session;
        
        configureSessionPermissions(webviewSession);
        webviewSession.setUserAgent(USER_AGENT);
        
        if (sharedBlocker) {
            sharedBlocker.enableBlockingInSession(webviewSession);
        }


        contents.on('context-menu', (event, params) => {
            if (params.mediaType === 'image' && params.srcURL) {
                const contextMenu = Menu.buildFromTemplate([
                    {
                        label: 'Save Image As...',
                        click: async () => {

                            const { filePath } = await dialog.showSaveDialog(mainWindow, {
                                title: 'Save Image As',
                                defaultPath: 'downloaded_image.jpg',
                                filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
                            });

                            if (filePath) {
                                webviewSession.once('will-download', (downloadEvent, item) => {
                                    item.setSavePath(filePath);
                                });


                                contents.downloadURL(params.srcURL);
                            }
                        }
                    }
                ]);
                

                contextMenu.popup({ window: mainWindow });
            }
        });

        contents.on('dom-ready', () => {
            const adStyles = `
                .video-ads, .ytp-ad-module, .ytp-ad-overlay-container, 
                ytd-promoted-video-renderer, ytd-display-ad-renderer,
                #player-ads, #masthead-ad { display: none !important; }
            `;
            contents.insertCSS(adStyles);
        });

        contents.setWindowOpenHandler(({ url }) => {
            contents.hostWebContents?.send('open-url-in-new-tab', url);
            return { action: 'deny' };
        });
    }
    contents.on('did-finish-navigation', () => {
        updateNavigationState(contents);
    });
});



ipcMain.on('nav-back', (event) => {
    const nav = event.sender.navigationHistory;
    if (nav.canGoBack()) nav.goBack();
});

ipcMain.on('nav-forward', (event) => {
    const nav = event.sender.navigationHistory;
    if (nav.canGoForward()) nav.goForward();
});

ipcMain.on('nav-go-to', (event, index) => {
    event.sender.navigationHistory.goToIndex(index);
});

app.whenReady().then(async () => {
    await loadDRMComponents();
    configureSessionPermissions(session.defaultSession);
    
    try {
        sharedBlocker = await ElectronBlocker.fromLists(fetch, [
            'https://easylist.to',
            'https://githubusercontent.com',
            'https://githubusercontent.com'
        ], {
            enableCosmeticFiltering: true
        });
        
        sharedBlocker.enableBlockingInSession(session.defaultSession);
        console.log('Advanced Ad blocker initialized!');
    } catch (error) {
        console.error('Failed to load advanced ad blocker:', error);
    }

    mainWindow = createWindow();
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    Menu.setApplicationMenu(null); 

    mainWindow.on('app-command', (event, command) => {
        if (command === 'browser-backward' && mainWindow.webContents.canGoBack()) {
            mainWindow.webContents.goBack();
        } else if (command === 'browser-forward' && mainWindow.webContents.canGoForward()) {
            mainWindow.webContents.goForward();
        }
    });

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.openDevTools();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createWindow();
            mainWindow.loadFile(path.join(__dirname, 'index.html'));
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
