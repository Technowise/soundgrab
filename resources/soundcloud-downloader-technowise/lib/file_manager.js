// file_manager.js - SoundCloud Downloader - Technowise's module
// author: Technowise
var {Cc, Ci, Cu} = require("chrome");
var {FileUtils} = Cu.import("resource://gre/modules/FileUtils.jsm");

exports.downloadFile = function(uriToFile, saveToFile)
{
    try
	{
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var win = wm.getMostRecentWindow("navigator:browser");
    }
    catch(err) {}

	var filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	filePicker.init(win, "Please choose path to download", filePicker.modeSave);//modeGetFolder would give only folder selection
	filePicker.appendFilters(filePicker.filterAudio);
	filePicker.defaultString = saveToFile;

	rv = filePicker.show();
	if (rv == filePicker.returnOK || rv == filePicker.returnReplace)
	{
		Cu.import("resource://gre/modules/Downloads.jsm");
		Cu.import("resource://gre/modules/osfile.jsm")
		Cu.import("resource://gre/modules/Task.jsm");
		saveToPath = FileUtils.File( filePicker.file.path );

		var options = {
			source: uriToFile,
			target: saveToPath
		};

		Task.spawn(function ()
		{
			let list = yield Downloads.getList(Downloads.ALL);
			var d = yield Downloads.createDownload(options);
			list.add(d);//add download to the list.
			yield d.start();// lets start the download ...
			var res = d.whenSucceeded();
			yield res;// ... and wait fort to finish
		}).then(null, Cu.reportError);
	}
	else
	{
		//hey user, you did not want the download.
	}
}

exports.downloadFiles = function(files)
{
    try
	{
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var win = wm.getMostRecentWindow("navigator:browser");
    }
    catch(err) {}

	var filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	filePicker.init(win, "Please choose path to download set", filePicker.modeGetFolder);
	rv = filePicker.show();

	if ( rv == filePicker.returnOK )
	{
		Cu.import("resource://gre/modules/Downloads.jsm");
		Cu.import("resource://gre/modules/osfile.jsm")
		Cu.import("resource://gre/modules/Task.jsm");

		for( i = 0; i < files.length; i++)
		{
			Task.spawn(function ()
			{
				var filePath = OS.Path.join( filePicker.file.path, files[i].downloadFilename);
				var saveToPath = FileUtils.File( filePath );
				var options = {
					source: files[i].uriToFile,
					target: saveToPath
				};
				let list = yield Downloads.getList(Downloads.ALL);
				let d = yield Downloads.createDownload(options);
				list.add(d);//add download to the list.
				yield d.start();// lets start the download ...
				let res = d.whenSucceeded();
				yield res;// ... and wait fort to finish
			}).then(null, Cu.reportError);
		}
	}
}
