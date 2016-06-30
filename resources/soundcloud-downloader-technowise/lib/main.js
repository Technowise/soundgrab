// This is an active module of the Technowise Add-on
var {Cc, Ci, Cu} = require("chrome");
var mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
var data = require("self").data;
var tabs = require("tabs");
var fileMgr = require("file_manager.js");
var pageMod = require("page-mod");
var Request = require("request").Request;
var playlistTrackStreams = [];
var simpleStorage = require("simple-storage");
const prefSet = require("simple-prefs");  //Simple-prefs module
simpleStorage.storage.toolbarEnabled = prefSet.prefs.toolbarEnabled;
var clientId = 'a3e059563d7fd3372b49b37f00a00bcf';
var clientId2 = '02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea';
var urlContext = ["*.soundcloud.com"];
var initDl = null;
function onPrefChange(prefName) {        //Listen for changes

	if( prefName == 'toolbarEnabled')
	{
		simpleStorage.storage.toolbarEnabled = prefSet.prefs[prefName];
	}

	if( simpleStorage.storage.toolbarEnabled == true )
	{
		addToolbarButton();
	}
	else
	{
		removeToolbarButton();
	}
}
prefSet.on("toolbarEnabled", onPrefChange);

exports.main = function(options, callbacks)
{
	if( typeof simpleStorage.storage.toolbarEnabled == 'undefined' )
	{
		simpleStorage.storage.toolbarEnabled = false;//Default toolbar disabled.
	}
	onPrefChange('toolbarEnabled');

	if (options.loadReason === 'install')
	{
        tabs.open("http://soundcloud-downloader.technowise.in/?reason=firstload");
    }
	else if (options.loadReason === 'upgrade')
	{
        tabs.open("http://soundcloud-downloader.technowise.in/?reason=updated");
    }

    function initiateDownload(downloadFile, alternateRequestUrl)
    {
		showProgressIcon();
		trackId = null;
		Request({
		  url: downloadFile.requestURL,
		  onComplete: function(response)
		  {
			if (response.json.id)
			{
				var kind = response.json.kind.toString();

				if( kind == 'track')
				{
					trackId = response.json.id.toString();

					if( typeof alternateRequestUrl != 'undefined')
					{
						requestURL = alternateRequestUrl;
					}
					else
					{
						requestURL = "https://api.soundcloud.com/i1/tracks/"+trackId+"/streams?client_id="+clientId;
						if( downloadFile.secretToken != '')
						{
							requestURL = requestURL + '&secret_token=' + downloadFile.secretToken;
						}
					}

					RequestTrack = 	Request({
						url: requestURL,
						onComplete: function (response)
						{
							hideProgressIcon();

							if( response.status != 200 )
							{
								altReqUrl = 'https://soundcloudlogger.appspot.com/getstreams?track_id='+trackId;
								initiateDownload(downloadFile, altReqUrl);//Try again with alternate request URL
							}
							else if (response.json.http_mp3_128_url)
							{
								fileMgr.downloadFile(response.json.http_mp3_128_url, downloadFile.name);
							}
							else if( typeof alternateRequestUrl == 'undefined' )
							{
								altReqUrl = 'https://soundcloudlogger.appspot.com/getstreams?track_id='+trackId;
								initiateDownload(downloadFile, altReqUrl);//Try again with alternate request URL
							}
							else//if( response.json.rtmp_mp3_128_url )
							{
								tabs.open("http://soundcloud-downloader.technowise.in/downloadna.php?url="+response.json.rtmp_mp3_128_url);
							}
						}
					});
					RequestTrack.get();
				}
				else if ( kind == 'playlist')
				{
					playlistTrackStreams = [];
					playlistId = response.json.id.toString();
					tracks = response.json.tracks;
					if( tracks.length > 0 )
					{
						getPlaylistTrackStreams( tracks, 0, downloadFile.secretToken );
					}
				}
			}
		  }
		}).get();
	}

	initDl = initiateDownload;

	function getPlaylistTrackStreams( tracks, index, secretToken, alternateRequestUrl )//Get each of songs in the tracks list(SoundCloud Set).
	{
		showProgressIcon();
		trackId = tracks[index].id.toString();

		if( typeof alternateRequestUrl != 'undefined')
		{
			requestURL = alternateRequestUrl;
		}
		else
		{
			requestURL = "https://api.soundcloud.com/i1/tracks/"+trackId+"/streams?client_id="+clientId;
			downloadFilename = tracks[index].title.toString().replace(/[^a-z0-9-!()\[\]]/gi, ' ');
			if( secretToken != '')
			{
				requestURL = requestURL + '&secret_token=' + downloadFile.secretToken;
			}
		}

		RequestTrack = 	Request({
			url: requestURL,
			onComplete: function (response)
			{
				if (response.json.http_mp3_128_url)
				{
					playlistTrackStreams.push({"uriToFile":response.json.http_mp3_128_url, "downloadFilename": (index+1)+' - '+downloadFilename+'.mp3'});
					if( tracks.length > index+1 )
					{
						getPlaylistTrackStreams( tracks, index+1, secretToken );
					}
					else
					{
						hideProgressIcon();
						fileMgr.downloadFiles(playlistTrackStreams);
					}
				}
				else if( typeof alternateRequestUrl == 'undefined' )
				{
					altReqUrl = 'https://soundcloudlogger.appspot.com/getstreams?track_id='+trackId;
					getPlaylistTrackStreams( tracks, index, secretToken, altReqUrl );
				}
			}
		});
		RequestTrack.get();
	}

	function logDownloadUrl( downloadedTrackUrl )
	{
		Request({
		  url: 'https://soundcloudlogger.appspot.com/?url='+downloadedTrackUrl,
		  onComplete: function(response)
		  {
			//nothing to do here.
		  }
		}).get();
	}

	pageMod.PageMod({
		include: urlContext,
		contentScriptFile: [data.url("jquery-2.1.4.min.js"), data.url("soundclouddownloadertechnowise.user.js")],
		onAttach: function(worker) {
			worker.port.on("gotSound", initiateDownload );
			worker.port.on("logDownload", logDownloadUrl );
		}
    });
    /*
    var contextMenu = require("context-menu");
    var menuItem = contextMenu.Item({
		label: "Download this sound",
		context: [  contextMenu.URLContext(urlContext),  contextMenu.SelectorContext("button.sc-button-download") ],
		contentScriptFile: [data.url("get_sound.js")],
		onMessage: initiateDownload
    });*/

};

exports.onUnload = function( reason )
{
	removeToolbarButton();
}

function addToolbarButton()
{
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var navBar = document.getElementById("nav-bar");
	var scdlrToolbar = document.getElementById("scdlr-toolbar");
	if (!navBar ) {//If navigation bar does not exist, or toolbar already exists, return.
		return;
	}

	if( scdlrToolbar )
	{
		navBar.removeChild(scdlrToolbar);
	}

	var btn = document.createElement("toolbarbutton");
	btn.setAttribute('id', 'scdlr-toolbar');
	btn.setAttribute('tooltiptext', 'SoundCloud Downloader');
	btn.setAttribute('type', 'menu-button');
	btn.setAttribute('class', 'toolbarbutton');
	btn.setAttribute('image', data.url('img/favicon.ico')); // path is relative to data folder
	btn.setAttribute('orient', 'horizontal');
	btn.setAttribute('label', 'SoundCloud Downloader');
	btn.addEventListener('click', function() {/*
		var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		prompts.alert(null, "SoundCloud Downloader", "SoundCloud Downloader");*/
		hideProgressIcon();
		scdlrpopup = document.getElementById('scdlr-menupopup');
		scdlrpopup.openPopup(btn, "after_start", 0, 0, false, false);
	}, false);

	btn.addEventListener('dragover', function(event)
	{
		var url = event.dataTransfer.getData("text/plain");
		if( url.match(/soundcloud.com/) )
		{
			showDropitIcon();
		}
		event.preventDefault();
	}, false);

	btn.addEventListener('dragleave', function(event)
	{
		hideProgressIcon();
		event.preventDefault();
	}, false);

	btn.addEventListener('drop', function(event)
	{
		if( ! event.dataTransfer.getData("text/plain").match(/soundcloud.com/) )
		{
			return;
		}
		event.preventDefault();
		dlFile={};
		dlFile.secretToken = '';
		var url = event.dataTransfer.getData("URL");
		if( !url.length )
		{
			url = event.dataTransfer.getData("text/plain");
			var urlParts = url.split('/');
			dlFile.name = urlParts.pop()+'.mp3';
			if( dlFile.name.substr(0,2) == 's-')
			{
				dlFile.name = urlParts.pop()+'.mp3';
			}
		}
		else
		{
			var urlInfo = event.dataTransfer.getData("text/x-moz-url");
			var anchorText = urlInfo.split("\n")[1];
			dlFile.name = anchorText.replace(/[^a-z0-9-!()\[\]]/gi, ' ')+'.mp3';
		}

		dlFile.requestURL = 'https://api.soundcloud.com/resolve.json?url='+escape(url)+'&client_id='+clientId2;
		urlLast = url.split('/').pop();
		if( urlLast.substr(0,2) == 's-')//Add secret token if present.
		{
			dlFile.secretToken = urlLast;
			dlFile.requestURL = dlFile.requestURL + '&secret_token=' + dlFile.secretToken;
		}

		initDl(dlFile);
	}, false);

	var popup = document.createElement("menupopup");
	popup.setAttribute('id', 'scdlr-menupopup');
    var menuItem = document.createElement("menuitem");
    menuItem.setAttribute('id', 'populardownloads');
    menuItem.setAttribute('label', 'Most popular downloads');
    menuItem.addEventListener('command', function(event)
    {
		tabs.open("http://soundcloud-downloader.technowise.in/mostpopular.php");
    }, false);
	popup.appendChild(menuItem);

    var menuItem2 = document.createElement("menuitem");
    menuItem2.setAttribute('id', 'removetoolbar');
    menuItem2.setAttribute('label', 'Remove toolbar button');
    menuItem2.addEventListener('command', function(event)
    {
		prefSet.prefs['toolbarEnabled'] = simpleStorage.storage.toolbarEnabled = false;
		removeToolbarButton();
    }, false);

	popup.appendChild(menuItem2);
	btn.appendChild(popup );
	navBar.appendChild(btn);
}

function removeToolbarButton()
{
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var navBar = document.getElementById("nav-bar");
	var scdlrToolbar = document.getElementById("scdlr-toolbar");
	if (!scdlrToolbar ) {
		return;
	}
	else
	{
		navBar.removeChild(scdlrToolbar);
	}
}

function showDropitIcon()
{
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var scdlrToolbar = document.getElementById("scdlr-toolbar");
	if (scdlrToolbar )
	{
		scdlrToolbar.setAttribute('image', data.url('img/dropit.ico')); // path is relative to data folder
	}
}

function showProgressIcon()
{
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var scdlrToolbar = document.getElementById("scdlr-toolbar");
	if (scdlrToolbar )
	{
		scdlrToolbar.setAttribute('image', data.url('img/ajax-loader.gif')); // path is relative to data folder
	}
}

function hideProgressIcon()
{
	var document = mediator.getMostRecentWindow("navigator:browser").document;
	var scdlrToolbar = document.getElementById("scdlr-toolbar");
	if (scdlrToolbar )
	{
		scdlrToolbar.setAttribute('image', data.url('img/favicon.ico')); // path is relative to data folder
	}
}
