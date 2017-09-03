const electron = require('electron');
const remote = electron.remote;
const {app, BrowserWindow, ipcMain} = electron;
const SteamUser = require('steam-user');
const locals = {appname: "Steam Account Manager"};
const pug = require('electron-pug')({pretty: true}, locals);
const path = require('path');
const url = require('url');
const fs = require('fs');

let win
let wbCon
let codeCallbackLogin

global.functions = {
}

ipcMain.on("ping",(event,arg)=>{
	event.sender.send("ping");
	console.log("ping");
});

function createWindow () {
  win = new BrowserWindow({width: 800, height: 600/*,frame:false*/,autoHideMenuBar: true,title:locals.appname,show:false});
  wbCon = win.webContents;
	win.once('ready-to-show', () => {
	  win.show()
	})
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'files/home.pug'),
    protocol: 'file:',
    slashes: true
  }))

  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null
  })
}

ipcMain.on("win-close",()=>{
	win.close();
});
ipcMain.on("win-min",()=>{
	win.minimize();
});
ipcMain.on("win-max",()=>{
	if(!win.isMaximized())
		win.maximize();
	else
		win.unmaximize();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
