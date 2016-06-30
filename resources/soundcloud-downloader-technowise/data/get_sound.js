self.on("click", function (node, data) 
{
	downloadFile={};
	downloadFile.href = node.href;
	downloadFile.name = node.getAttribute('download')+'.mp3';
	downloadFile.requestURL = node.getAttribute('data-requesturl');
	self.postMessage(downloadFile);	
});
