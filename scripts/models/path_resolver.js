// get rid of webkit prefix
window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder; 

function PathResolver(rootPath) {
	this.baseUrl = new URI(rootPath);
};

PathResolver.prototype.resolve = function(relativePath) {
	var url = new URI(relativePath);
	return url.resolve(this.baseUrl);
};

var domToString = function(dom) {
	var x = new XMLSerializer();
	return x.serializeToString(dom);
}

var fixCssLinks = function(content, resolver) {

	var beginning = /url\s*\(\s*['"]\s*/
	var end = /['"]\s*\)/
	return content.replace(/url\s*\(\s*(['"]).+?\1\s*\)/g, function(frag) {
		frag = frag.replace(beginning, '');
		frag = frag.replace(end, '');
		return "url('" + resolver.resolve(frag) + "')";
	});

};


var fixXhtmlLinks = function(content, resolver) {
	var $obj; var path; 
	var parser = new window.DOMParser();
	var dom = parser.parseFromString(content, 'text/xml');

	var correctionHelper = function(attrName) {
		var selector = '[' + attrName + ']';
		$(selector, dom).each(function() {
			$obj = $(this);
			path = $obj.attr( attrName );
			path = resolver.resolve( path );
			$obj.attr(attrName, path);
		});
	}


	correctionHelper('src');
	correctionHelper('href');
	$('image', dom).each(function() {
		$obj = $(this);
		path = $obj.attr( 'xlink:href' );
		path = resolver.resolve( path );
		$obj.attr('xlink:href', path);
	});
	//correctionHelper('xlink:href');
	return domToString(dom);
	
};

var getLinkFixingStrategy = function(fileEntryUrl) {
	if (fileEntryUrl.substr(-4) === ".css" ) {
		return fixCssLinks;
	}
	
	if (fileEntryUrl.substr(-5) === ".html" || fileEntryUrl.substr(-6) === ".xhtml" ) {
		return fixXhtmlLinks;
	}

	if (fileEntryUrl.substr(-4) === ".xml" ) {
		// for now, I think i may need a different strategy for this
		return fixXhtmlLinks;
	}

	return null;
};


// this is the brains of the operation here
var monkeyPatchUrls = function(fileEntryUrl, win, fail) {
	var entry; 
	var resolver = new PathResolver(fileEntryUrl);
	var linkFixingStrategy = getLinkFixingStrategy(fileEntryUrl);

	// no strategy => nothing to do === win :)
	if(linkFixingStrategy === null) {
		win();
		return;
	}

	var fixLinks = function(content) {
		content = linkFixingStrategy(content, resolver);
		writeEntry(entry, content, win, fail);		
	};
	
	window.resolveLocalFileSystemURL(fileEntryUrl, function(fileEntry) {
		// capture the file entry in scope
		entry = fileEntry;
		readEntry(entry, fixLinks, fail);
	});	
};


// these are filesystem helpers really...
var readEntry = function(fileEntry, win, fail) {

    fileEntry.file(function(file) {

       var reader = new FileReader();
       reader.onloadend = function(e) {
         win(this.result);
       };
       reader.readAsText(file);

    }, fail);

};

var writeEntry = function(fileEntry, content, win, fail) {
	
	fileEntry.createWriter(function(fileWriter) {

		fileWriter.onwriteend = function(e) {
			win();
		};

		fileWriter.onerror = function(e) {
			fail(e);
		};

		var bb = new BlobBuilder(); 
		bb.append(content);
		fileWriter.write( bb.getBlob('text/plain') );

	}, fail);
};





