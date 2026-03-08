const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('carecircle', {
  platform: process.platform,
});
