// Define a namespace for the library
if (typeof Readium === "undefined" || Readium === null) {
	Readium = {};
}

if(typeof Readium.FileSystemApi === "undefined") {
	throw "ExtractBook holds Readium::FileSystemApi as a dependency";
}

if(typeof Readium.Utils.MD5 === "undefined" ) {
	throw "Extract holds Readium::Utils::MD5 as a dependency";
}

var displayMessage = function(message) {
	// TODO probably should remove jquery depency
	$('#loading-status').html( message );
	console.log(message);
}

// This method takes a url for an epub, unzips it and then
// writes its contents out to disk.
Readium.ExtractBook = function(url, callback) {

	// Constants
	var MIMETYPE = "mimetype";
	var CONTAINER = "META-INF/container.xml";
	var EPUB3_MIMETYPE = "application/epub+zip";
	var DISPLAY_OPTIONS = "META-INF/com.apple.ibooks.display-options.xml"
	
	// Members
	var _zip; 
	var _fsApi;
	var _urlHash = Readium.Utils.MD5(url + (new Date()).toString());
	var _progressCancelled = false;
	var _containerDom;
	var _packageDoc;
	var _packageDocPath;
	var _fixedLayout;
	var _openToSpread;
	var _rootUrl;
	
	var isDirectory = function(zipentry) {
		return zipentry.name.substr(-1) === "/";
	};
	
	var getPath = function(entry) {
		return _urlHash + "/" + entry.name;
	}

	var getUrl = function(entry) {
		return _rootUrl + "/" + entry.name;
	}
	
	// delete any changes to file system in the event of error, etc.
	var clean = function() {
		if(_fsApi) {
			_fsApi.rmdir(_urlHash);
		}
	}
	
	var parseBool = function(string) {
		return string.toLowerCase().trim() === 'true';	
	}
	
	var extractEntryByName = function(zip, name, callback) {
		var found = false;
		for (var i=0; i < zip.entries.length; i++) {
			if(zip.entries[i].name === name) {
				found = true;
				zip.entries[i].extract(callback);
				break;
			}
		}
		if(!found) {
			throw ("asked to extract non-existent zip-entry: " + name);
		}
	};

	var generateCoverImageUrl = function (metaData) {
		var root; var rootUri; var coverUri;
		if(metaData.cover_href) {
			// there is a relative url, just need to resolve it
			root = _fsApi.getFileSystem().root.toURL();
			root += metaData.package_doc_path;
			rootUri = new URI(root);
			coverUri = new URI(metaData.cover_href);
			return coverUri.resolve(rootUri).toString();
		}
		else {
			return '/images/genericBook.png';
		}
	};
	
	var saveEntry = function() {
		var metaData = _packageDoc.getMetaData();
		metaData.created_at = new Date();
		metaData.updated_at = new Date();
		metaData.key = _urlHash;
		metaData.package_doc_path = _packageDocPath;
		metaData.fixed_layout = _fixedLayout;
		metaData.open_to_spread = _openToSpread;
		metaData.cover_href = generateCoverImageUrl( metaData );
		new Lawnchair(function() {
			this.save(metaData, function() {
				unpackBook(_zip, 0);				
			});
		});
	}
	
	
	var parseContainerRoot = function(zip, rootFile, rootMime) {
		var callback = function(entry, content) {
			_packageDoc = Readium.PackageDocument(content);
			_packageDocPath = _urlHash + "/" + rootFile;
			saveEntry();
		}
		
		if(rootFile) {
			try {
				extractEntryByName(zip, rootFile, callback);				
			} catch(e) {
				displayMessage(e);
				clean();
			}

		}
		else {
			// fatal error
			displayMessage("ERROR: root file could not be found, progress stopped");
			clean();
		}
	}
	
	var parseMetaInfo = function(zip) {
		var callback = function(entry, content) {
			var rootFilePath; var rootFileMime;			
			var parser = new window.DOMParser();
			var xmlDoc = parser.parseFromString(content, "text/xml");
			var rootFiles = xmlDoc.getElementsByTagName("rootfile");

			if(rootFiles.length !== 1) {
				displayMessage("Error processing " + CONTAINER);
				displayMessage("Error: support for multiple rootfiles not implemented");
				clean();
			}
			else {
				if (rootFiles[0].hasAttribute("full-path")) {
					rootFilePath = rootFiles[0].attributes["full-path"].value;
				}
				else {
					displayMessage("Error: could not find package rootfile");
					
					// fatal error, stop processing
					clean();
					return;
				}
				
				if (rootFiles[0].hasAttribute("media-type")) {
					rootFileMime = rootFiles[0].attributes["media-type"].value;
				} else {
					// non-fatal
					displayMessage("root file missing media type, will attempt to detect automatically");
				}
				
				parseContainerRoot(zip, rootFilePath, rootFileMime);
				
			}
		}
		
		try {
			extractEntryByName(zip, CONTAINER, callback);
		} catch (e) {
			displayMessage(e);
			clean();
		}

	}
		
	var parseIbooksDisplayOptions = function(zip) {
		
		var callback = function(entry, content) {
			var parser = new window.DOMParser();
			var xmlDoc = parser.parseFromString(content, "text/xml");
			var fixedLayout = xmlDoc.getElementsByName("fixed-layout")[0];
			var openToSpread = xmlDoc.getElementsByName("open-to-spread")[0];
			_fixedLayout = fixedLayout && parseBool(fixedLayout.textContent);
			_openToSpread = openToSpread && parseBool(openToSpread.textContent);
			
			parseMetaInfo(zip);
		}
		
		if(zip.entryNames.indexOf(DISPLAY_OPTIONS) >= 0) {
			extractEntryByName(zip, DISPLAY_OPTIONS, callback);
		}
		else {
			_openToSpread = false;
			_fixedLayout = false;
			parseMetaInfo(zip);
		}
	}
	
	var checkMimetype = function(zip) {
		var validateCallback = function(entry, content) {
			if($.trim(content) === EPUB3_MIMETYPE) {
				parseIbooksDisplayOptions(zip);
			} else {
				displayMessage("Invalid mimetype discovered. Progress cancelled.");
				clean();
			}
		}
		try {
			extractEntryByName(zip, MIMETYPE, validateCallback);			
		} catch (e) {
			displayMessage(e);
			clean();
		}

	};
	
	var validateZip = function(zip) {
		// weak test, just make sure MIMETYPE and CONTAINER files are where expected
		if(zip.entryNames.indexOf(MIMETYPE) >= 0 && zip.entryNames.indexOf(CONTAINER) >= 0) {
			checkMimetype(zip);
		}
		else {
			alert("File does not appear to be a valid EPUB. Progress cancelled."); 
			clean();
		}
		
	}
	
	var unpackBook = function(zip, i) {
		var entry;
		
		var unpackFailed = function() {
			displayMessage("ERROR: durring unzipping process failed");
			clean();
		}

		var writeToDisk = function(entry, content) {

			_fsApi.writeFile(getPath(entry), content, function() {
				unpackBook(zip, i + 1);
			} , unpackFailed);
		}
		
		if( i === zip.entries.length) {
			displayMessage("Unpacking process completed successfully!");
			correctURIs(zip, 0);
			
		} 
		else {
			entry = zip.entries[i];
			if( isDirectory(entry) ) {
				unpackBook(zip, i + 1);
			}
			else {
				displayMessage("extracting: " + entry.name);
				entry.extract(writeToDisk);
			}
		}
	}

	var correctURIs = function(zip, i) {
		var entry;
		
		var monkeypatchingFailed = function() {
			displayMessage("ERROR: durring monkeypatching of URIs process failed");
			clean();
		}
		
		if( i === zip.entries.length) {
			displayMessage("Unpacking process completed successfully!");
			setTimeout(function() {
				chrome.tabs.create({url: "/views/viewer.html?book=" + _urlHash });
					window.close();
			}, 1000);
			
		} 
		else {
			entry = zip.entries[i];
			if( isDirectory(entry) ) {
				correctURIs(zip, i + 1);
			}
			else {
				displayMessage("monkey patching: " + entry.name);
				monkeyPatchUrls(getUrl(entry), function() {
						correctURIs(zip, i + 1);
					}, monkeypatchingFailed);
			}
		}
	}
	
	var beginUnpacking = function() {
		_fsApi.getFileSystem().root.getDirectory(_urlHash, {create: true}, function(dir) {
			_zip = new ZipFile(url, validateZip, 0);
			_rootUrl  = dir.toURL();
		}, function() {
			//_zip = new ZipFile(url, validateZip, 0);
			console.log("In beginUnpacking error handler. Does the root dir already exist?");
		});
	};
	
	Readium.FileSystemApi(function(fs){
		_fsApi = fs;
		beginUnpacking();
	});
};



window.onload = function() {
	var url = window.location.hash.substring(1);
	
	// sanity check (only have to be a little sane)
	if(url.length <= 0) {
		displayMessage("The book url does not apear valid");
		return;
	}
	
	Readium.ExtractBook(url, function() {});
	displayMessage("Fetching resource from: " + url);


};
