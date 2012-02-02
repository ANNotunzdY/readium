$("a[href$='.epub']").each(function() {
	this.href = chrome.extension.getURL("/views/extractbook.html") + "#" + this.href;
	this.target = "_blank";
});