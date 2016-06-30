// ==UserScript==
var scdlr = {};
scdlr.JQ = null;
scdlr.c = null;//Class
scdlr.d = null;//requestURL
scdlr.e = null;//secretToken
scdlr.clientId = '02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea';

scdlr.addSoundDownloadButton = function ( sound )
{	
	if( scdlr.JQ(sound).find(".sc-button-download").length == 0 )//No download button found, lets add one.
	{
		var downloadButton = scdlr.JQ(document.createElement("button") );
		var buttonClass = 'sc-button sc-button-download sc-button-medium sc-button-responsive';//Big DL button.
		if( scdlr.JQ(sound).is(".trackList__item") )//Small DL button for track list items.
		{
			buttonClass = 'sc-button sc-button-download sc-button-small sc-button-responsive sc-button-icon';
		}
		else if( scdlr.JQ(sound).is(".streamContext") )//Medium DL button
		{
			buttonClass = 'sc-button sc-button-download sc-button-small sc-button-responsive';
		}

		var anchor = scdlr.JQ(sound).find(".soundTitle__title").eq(0);
		if( scdlr.JQ(sound).find(".trackItem__trackTitle").length )//If its a playlist/set
		{
			anchor = scdlr.JQ(sound).find(".trackItem__trackTitle").eq(0);
		}
		
		var resolveUrl = null;
		var downloadFilename = "no-name";

		if( scdlr.JQ(sound).is(".single") || scdlr.JQ(sound).is(".l-main") || scdlr.JQ(sound).is(".listenEngagement__actions"))
		{
			resolveUrl = document.location.href;
			downloadFilename = scdlr.JQ.trim( scdlr.JQ(".soundTitle__title").eq(0).text());
		}
		else
		{					
			resolveUrl = 'https://soundcloud.com'+anchor.attr("href");
			downloadFilename = scdlr.JQ.trim(anchor.text());
		}
        downloadFilename = downloadFilename.replace(/[^a-z0-9-!()\[\]]/gi, ' ');
		urlSplitArray = resolveUrl.split("/");
		lastElement = urlSplitArray.pop();
		secretToken = '';

		requestURL = 'https://api.soundcloud.com/resolve.json?url='+escape(resolveUrl)+'&client_id='+scdlr.clientId;

		if( lastElement.substr(0,2) == 's-')//Add secret token if present.
		{
			secretToken = lastElement;
			requestURL = requestURL + '&secret_token=' + secretToken;
		}
		
		downloadButton.attr({
			'title': 'Download '+downloadFilename,
			'class': buttonClass
		});

		downloadButton.data(scdlr.c, downloadFilename);
		downloadButton.data(scdlr.d, requestURL);
		downloadButton.data(scdlr.e, secretToken);

		if( resolveUrl.match(/\/sets\//) )
		{
			downloadButton.text("Download all");
		}
		else
		{
			downloadButton.text("Download");
		}

		//Below function is Firefox Addon specific. Remove it elsewhere.
		downloadButton.click( function()
		{
			downloadFile={};
			downloadFile.name = scdlr.JQ(this).data(scdlr.c)+'.mp3';
			downloadFile.requestURL = scdlr.JQ(this).data(scdlr.d);
			downloadFile.secretToken = scdlr.JQ(this).data(scdlr.e);
			self.port.emit("gotSound", downloadFile);
			return false;
		});			

		scdlr.JQ(sound).find(".soundActions .sc-button-group:first").eq(0).append(downloadButton);
	}
}

scdlr.addSoundMobileDownloadButton= function ( sound )
{
	if( scdlr.JQ(sound).find(".button.icon.download").length == 0 )//No download button found, lets add one.
	{
		var downloadButton = scdlr.JQ(document.createElement("button") );
		var resolveUrl = scdlr.JQ(sound).find(".reddit.button.icon").attr("data-permalink");
		buttonClass = 'button icon download'

		if( typeof resolveUrl == 'undefined' )
		{
			resolveUrl = document.location.href;
			resolveUrl = resolveUrl.replace("m.soundcloud", "soundcloud");
		}
		urlSplitArray = resolveUrl.split("/");
		lastElement = urlSplitArray.pop();
		secretToken = '';
		requestURL = 'https://api.soundcloud.com/resolve.json?url='+escape(resolveUrl)+'&client_id='+scdlr.clientId;

		if( lastElement.substr(0,2) == 's-')//Add secret token if present.
		{
			secretToken = lastElement;
			requestURL = requestURL + '&secret_token=' + secretToken;
		}
		downloadFilename = scdlr.JQ(sound).find("h1").text().replace(/[^a-z0-9-!()\[\]]/gi, ' ');
		downloadButton.attr({
			'title': 'Download '+downloadFilename,
			'class': buttonClass,
			'style': 'margin-left:6px'
		});

		downloadButton.data(scdlr.c, downloadFilename);
		downloadButton.data(scdlr.d, requestURL);
		downloadButton.data(scdlr.e, secretToken);

		downloadButton.text("Download");
		//Below function is Firefox Addon specific. Remove it elsewhere.
		downloadButton.click( function()
		{
			downloadFile={};
			downloadFile.name = scdlr.JQ(this).data(scdlr.c)+'.mp3';
			downloadFile.requestURL = scdlr.JQ(this).data(scdlr.d);
			downloadFile.secretToken = scdlr.JQ(this).data(scdlr.e);
			self.port.emit("gotSound", downloadFile);
			return false;
		});

		scdlr.JQ(sound).find(".track-meta .options").eq(0).append(downloadButton);
	}
}

function myMain()
{
	if( scdlr.JQ(".l-main .listenHero").length ) //.l-main is shown when the user is logged in and viewing single track.
	{		
		scdlr.addSoundDownloadButton( scdlr.JQ(".l-main") );
	}

	scdlr.JQ(".sound, .listenEngagement__actions").each( function()
	{
		scdlr.addSoundDownloadButton( this );
	});

	if( scdlr.JQ(".trackList").length > 0 )//We have a playlist, add download link to each item in the playlist.
	{
		scdlr.JQ(".trackList .trackList__item").each( function ()
		{
			scdlr.addSoundDownloadButton( this );
		});
	}

	scdlr.JQ(".sc-button-download").unbind('click.logDownload').bind('click.logDownload', function()
	{
		var resolveUrl = '';
		var trackListItem = scdlr.JQ(this).parents(".trackList__item");
		var soundContextItem = scdlr.JQ(this).parents(".streamContext");
		var single = scdlr.JQ(this).parents(".single");
		if( trackListItem.length == 1 )
		{
			anchor = scdlr.JQ(trackListItem).find(".soundTitle__title").eq(0);
			resolveUrl = 'https://soundcloud.com'+anchor.attr("href");
		}
		else if (soundContextItem.length == 1 )
		{
			anchor = scdlr.JQ(soundContextItem).find(".soundTitle__title").eq(0);
			resolveUrl = 'https://soundcloud.com'+anchor.attr("href");
		}
		else if( single.length == 1 )
		{
			resolveUrl = document.location.href;
		}
		var urlSplits = resolveUrl.split('?');//remove extra part in URL.
		self.port.emit("logDownload", urlSplits[0]);
	});
}

function GM_wait()
{
	if(typeof jQuery == 'undefined')
	{
		window.setTimeout(GM_wait,200);
	}
	else
	{
		scdlr.JQ = jQuery;
		scdlr.c = Math.random().toString(36).substring(7);
		scdlr.d = Math.random().toString(36).substring(7);
		scdlr.e = Math.random().toString(36).substring(7);
		myMain();
		setInterval(myMain, 3000);//Check for new tracks and update with download links every 3 seconds.
	}
}
GM_wait();
