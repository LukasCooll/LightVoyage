const{app,BrowserWindow,globalShortcut,components,ipcMain,session}=require('electron');
const path=require('node:path');

if(require('electron-squirrel-startup'))app.quit();

app.setPath('userData', path.join(app.getPath('appData'), 'LightVoyage'));

let mainWindow=null;

const USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

ipcMain.on('go-back',(event)=>{
    const webContents=event.sender;
    if(webContents.canGoBack())webContents.goBack();
});

async function loadDRMComponents(){
    await components.whenReady();
    console.log('Widevine component status:',components.status());
}

function configureSessionPermissions(ses){
    ses.setPermissionRequestHandler((webContents,permission,callback)=>{
        callback(['media','fullscreen','notifications'].includes(permission));
    });
    ses.setPermissionCheckHandler((webContents,permission)=>{
        return ['media','fullscreen','notifications'].includes(permission);
    });
}

const createWindow=()=>{
    return new BrowserWindow({
        width:800,
        height:600,
        webPreferences:{
            webviewTag:true,
            nodeIntegration:false,
            contextIsolation:true,
            plugins:true,
            preload:path.join(__dirname,'preload.js')
        },
        icon:path.join(__dirname,'LogoMinimal.ico')
    });
};

function updateNavigationState(webContents){
    if(!mainWindow||mainWindow.isDestroyed())return;
    const navHistory=webContents.navigationHistory;
    mainWindow.webContents.send('nav-state-changed',{
        canGoBack:navHistory.canGoBack(),
        canGoForward:navHistory.canGoForward(),
        currentUrl:webContents.getURL(),
        history:navHistory.getAllEntries()
    });
}

app.on('web-contents-created',(event,contents)=>{
    if(contents.getType()==='webview'){
        configureSessionPermissions(contents.session);
        contents.session.setUserAgent(USER_AGENT);
    }
    contents.on('did-finish-navigation',()=>{
        updateNavigationState(contents);
    });
});

ipcMain.on('nav-back',(event)=>{
    const nav=event.sender.navigationHistory;
    if(nav.canGoBack())nav.goBack();
});

ipcMain.on('nav-forward',(event)=>{
    const nav=event.sender.navigationHistory;
    if(nav.canGoForward())nav.goForward();
});

ipcMain.on('nav-go-to',(event,index)=>{
    event.sender.navigationHistory.goToIndex(index);
});

app.whenReady().then(async()=>{
    await loadDRMComponents();
    configureSessionPermissions(session.defaultSession);
    mainWindow=createWindow();
    mainWindow.loadFile(path.join(__dirname,'index.html'));

    mainWindow.on('app-command',(event,command)=>{
        if(command==='browser-backward'&&mainWindow.webContents.canGoBack()){
            mainWindow.webContents.goBack();
        }else if(command==='browser-forward'&&mainWindow.webContents.canGoForward()){
            mainWindow.webContents.goForward();
        }
    });

    globalShortcut.register('CommandOrControl+Shift+I',()=>{
        if(mainWindow&&!mainWindow.isDestroyed()){
            mainWindow.webContents.openDevTools();
        }
    });

    app.on('activate',()=>{
        if(BrowserWindow.getAllWindows().length===0){
            mainWindow=createWindow();
            mainWindow.loadFile(path.join(__dirname,'index.html'));
        }
    });
});

app.on('window-all-closed',()=>{
    if(process.platform!=='darwin')app.quit();
});

app.on('will-quit',()=>{
    globalShortcut.unregisterAll();
});