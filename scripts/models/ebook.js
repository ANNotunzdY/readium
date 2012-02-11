// Define a namespace for the library
if (typeof Readium === "undefined" || Readium === null) {
	Readium = {};
}

if(typeof Readium.FileSystemApi === "undefined") {
	throw "Ebook holds Readium::FileSystemApi as a dependency";
}

if(typeof Readium.PackageDocument === "undefined") {
	throw "Ebook holds Readium::packageDocument as a dependency";
}

if(!Readium.Utils) {
	Readium.Utils = {};
}
	
Readium.Utils.setCookie = function(c_name,value,exdays) {
	var exdate=new Date();
	exdate.setDate(exdate.getDate() + exdays);
	var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
	document.cookie=c_name + "=" + c_value;
}


Readium.Utils.getCookie = function(c_name) {
	var i, x, y, ARRcookies=document.cookie.split(";");
	for (i = 0; i < ARRcookies.length; i++) {
		x = ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
		y = ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
		x = x.replace(/^\s+|\s+$/g,"");
		if ( x == c_name ) {
			return unescape(y);
		}
	}
}

// Asynchronous constructor
Readium.Ebook = function(properties, successCallback, errorCallback) {
	
	// private members
	var _properties;
	var _fsApi;
	var _packageDocUrl; // not used
	var _rootUrl;
	
	var loadBookMark = function() {
		var str = Readium.Utils.getCookie(_properties.key);
		return parseInt(str) || 0;
	}
	
	var validateProperties = function(obj) {
		var key;
		var keys = "id key lang package_doc_path updated_at created_at".split(" ")

		for(var i = 0; i < keys.length; i++) {
			key = keys[i];
			if(!obj[key]) {
				return false;
			}
		}
		_properties = obj;
		return true;
	}
	
	var save = function(callback) {
		_properties.updated_at = new Date();
		if(!_properties.key) {
			// should never get here
			throw "FATAL ERROR: cannot save record with no key";
		}
		Lawnchair(function() {
			this.save(properties, function(obj) {
				callback(obj);
			});
		});
	};
	
	// initialization code
	var init = function() {
		var initPackageDocument = function(domString, fileEntry) {
			_packageDocument = Readium.PackageDocument(domString);
			_packageDocument.setPosition( loadBookMark() );
			_packageDocUrl = fileEntry.toURL();
			
			// execute callback and pass back api for "this"
			successCallback(api);
		};
		
		if(validateProperties(properties)) {

			Readium.FileSystemApi(function(fs) {
				_fsApi = fs;
				_rootUrl = _fsApi.getFileSystem().root.toURL();
				_fsApi.readTextFile(_properties.package_doc_path, initPackageDocument, errorCallback);
			});
		}
		else if (errorCallback){
			errorCallback("invalid properties");
		}		
	};
	
	var resolvePath = function(path) {
		var suffix;
		if(path.indexOf("../") === 0) {
			suffix = path.substr(3);
		}
		else {
			suffix = path;
		}
		var ind = _properties.package_doc_path.lastIndexOf("/")
		return _properties.package_doc_path.substr(0, ind) + "/" + suffix;
	}
	
	var resolveUrl = function(path) {
		return _rootUrl + resolvePath(path);
	}
	
	var savePosition = function() {
		Readium.Utils.setCookie(_properties.key, _packageDocument.getPosition(), 365);
	}

	var buildTocHtml = function(text, callback) {
		var parser = new window.DOMParser();
		var dom = parser.parseFromString(text, 'text/xml');
		var ul = '<ol>';
		var navPoints = dom.getElementsByTagName('navPoint');
		var label; var href;

	

		for(var i = 0; i < navPoints.length; i++) {
			label = navPoints[i].getElementsByTagName('text')[0].textContent;
			href = navPoints[i].getElementsByTagName('content')[0].attributes["src"].value;
			ul += "<li><a href='" + href + "'>" + label + "</a></li>";
		}
		ul += '</ol>'

		callback(ul);

	};

	/************************* bindings handling code, move it? **********************/

	var applyBindings = function(domSpot) {
		var key;
		var bindings = jQuery.extend({}, _packageDocument.getBindingHandlers());

		// break out early if there are none <= any point to this?
		if(!bindings || Object.keys(bindings).length === 0) {
			return;
		}

		// resolve all the bindings paths to absolute urls
		for( key in bindings ) {
			bindings[key] = resolveUrl(bindings[key]);
		}

		$('object[type]', domSpot).each(function() {
			var params; var src; var frame;
			var $this = $(this);
			var type = $this.attr('type');
			if( bindings.hasOwnProperty(type) ) {
				params = parseBindingsParams($this);
				src = bindings[type] + '?' + params;
				frame = $('<iframe></iframe>');
				frame.attr('src', src);
				frame.attr('height', '100%');
				frame.attr('width', '100%');
				frame.attr('noresize', "noresize");
				frame.attr('frameborder', '0');
				frame.attr('marginwidth', '0');
				frame.attr('marginheight', '0');
				$this.html(frame);
			}
		});

	};

	var parseBindingsParams = function($obj) {
		var params = [];
		params.push("src=" + resolveUrl( $obj.attr('data') ) );
		params.push("type=" + $obj.attr('type') );
		$('param', $obj).each(function() {
			var $this = $(this);
			params.push($this.attr('name') + '=' + $this.attr('value') )
		});
		params = params.join('&');

		/* need to escape special chars as per RFC3987 */
		return encodeURI(params); 
	};

	/************************* END bindings handling code, move it? **********************/
	
	// declare api
	var api = {
		resolvePath: resolvePath,
		
		resolveUrl: resolveUrl,
		
		goToNextSection: function() {
			if(_packageDocument.hasNextSection() ) {
				_packageDocument.goToNextSection();			
				savePosition();	
				return true;
			}
			return false;
		},
		
		goToPrevSection: function() {
			if(_packageDocument.hasPrevSection() ) {
				_packageDocument.goToPrevSection();		
				savePosition();		
				return true;	
			}
			return false;
		},
		
		getSectionText: function(successCallback, failureCallback) {
			var path = _packageDocument.currentSection();
			Readium.FileSystemApi(function(fs) {
				fs.readTextFile(resolvePath(path), successCallback, failureCallback);
			});
		},

		getAllSectionTexts: function(sectionCallback, failureCallback, completeCallback) {
			var i = 0;
			var spine = _packageDocument.getSpineArray();
			var thatFs;

			var callback = function(content, fileEntry) {
				sectionCallback(content);
				i += 1;
				if(i < spine.length) {
					thatFs.readTextFile(resolvePath(spine[i]), callback, failureCallback);
				}
				else {
					completeCallback();
				}
			
			};

			Readium.FileSystemApi(function(fs) {
				thatFs = fs;
				thatFs.readTextFile(resolvePath(spine[i]), callback, failureCallback);
			});

		},

		getAllSectionUris: function() {
			var temp = _packageDocument.getSpineArray();	
			for(var i = 0; i < temp.length; i++) {
				temp[i] = resolveUrl(temp[i]);
			}
			return temp;
		},

		getTocText: function(successCallback, failureCallback) {
			var path = _packageDocument.getTocPath();
			if(!path) {
				failureCallback();
				return;
			}

			if(_packageDocument.getTocType() === _packageDocument.XHTML_MIME) {
				Readium.FileSystemApi(function(fs) {
					fs.readTextFile(resolvePath(path), function(result) { 
						var parser = new window.DOMParser();
						var dom = parser.parseFromString(result, 'text/xml');
						successCallback( $('body', dom).html() ); 
					}, failureCallback);
				});		
			}

			else if(_packageDocument.getTocType() === _packageDocument.NCX_MIME) {
				Readium.FileSystemApi(function(fs) {
					fs.readTextFile(resolvePath(path), function(result) { 
						buildTocHtml(result, successCallback) 
					}, failureCallback);
				});				
			}

			else {
				
			}



		},

		goToHref: function(href) {
			if(_packageDocument.goToHref(href)) {
				savePosition();
				return true;
			}
			return false;
		},

		getProperties: function() {
			return _properties;
		},

		isFixedLayout: function() {
			return _properties.fixed_layout;
		},

		applyBindings: applyBindings
	};
	

	init();
}
