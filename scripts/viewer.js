Readium.TocManager = function(book) {
	var callback = function() {};
	var parser = window.DOMParser;
	var dom = parser.parseFromString()
};

(function() {
	var _paginator;
	var _fsPath;
	var _urlArgs;
	var _book;
	var _fontSize = 10; // 10 => 1.0em
	
	var fireRepaginateEvent = function() {
		$('#readium-content-container').trigger("content-size-changed");
	}
	
	var openCurrentSection = function() {
		_book.getSectionText(parseBookCallback, loadErrorHandler);
			
		var doneSwapping = function() {
			_paginator.goToFirstPage();
			$("#readium-content-container").css("visibility", "visible");
			$('#readium-content-container').unbind("content-size-changed", doneSwapping);
		}
		$('#readium-content-container').bind("content-size-changed", doneSwapping);
	}

	var flipTheSection = function() {
		if(_book.goToNextSection()) {
			openCurrentSection();
		}
	}
	
	var flipThePage = function() {
		if( !_paginator.pageForward() && !_book.isFixedLayout() ) {
			flipTheSection();
		}
	}
	
	var flipBackASection = function() {
		if(_book.goToPrevSection()) {
			_paginator.replaceContent("");
			_book.getSectionText(parseBookCallback, loadErrorHandler);
			var doneSwapping = function() {
				//$("#readium-content-container").hide();
				_paginator.goTolastPage();
				$("#readium-content-container").css("visibility", "visible");
				$('#readium-content-container').unbind("content-size-changed", doneSwapping);
			}
			$('#readium-content-container').bind("content-size-changed", doneSwapping);
		}
	}
	
	var flipBackAPage = function() {
		if(!_paginator.pageBack() && !_book.isFixedLayout() ) {
			flipBackASection();
		}
	}
	
	var setFontSize = function () {
		var size = ( _fontSize / 10 ).toString(); 
		$('#readium-content-container').css("font-size", size + "em");
		fireRepaginateEvent();
	}
	
	var increaseFont = function(e) {
		// TODO should there be some limit?
		_fontSize += 1;
		setFontSize();
	}
	
	var decreaseFont = function(e) {
		if(_fontSize > 1) {
			_fontSize -= 1;
			setFontSize();	
		}
	}
	
	var addPageTurnHandlers = function(pagerObj) {
		var keydownHandler = function(e) {
			
			if(e.which == 39) {
				flipThePage();
			}
				
			if(e.which == 37) {
				flipBackAPage();
			}
				
		}

		$(document).keydown(keydownHandler);
		
		
		$('#page-fwd-button').click(function(e) {
			e.preventDefault();
			flipThePage();
		});
		$('#page-back-button').click(function(e) {
			e.preventDefault();
			flipBackAPage();
		});
		$('#increase-font-button').click(function(e) {
			e.preventDefault();
			increaseFont();
		});
		$('#decrease-font-button').click(function(e) {
			e.preventDefault();
			decreaseFont();
		});
		$('#two-up-button').click(function(e) {
			e.preventDefault();
			_paginator.toggleTwoUp();
		});
		
		
		$('#fullscreen-button').click(function(e) {
			e.preventDefault();
			if(document.webkitIsFullScreen) {
				document.webkitCancelFullScreen();
			}
			else {
				document.documentElement.webkitRequestFullScreen();					
			}
		});
		
		
		if(!_book.isFixedLayout()) {
			// just prevent wheel scrolling for now, it's too buggy
			document.onmousewheel = function(e) { 
				if(!document.getElementById('menu').contains(e.srcElement)) {
					e.preventDefault();
				}
				
			};
		}
	}

	var parseUrlArgs = function() {
		var hash;
		var args = [];
		var searchStr = window.location.search.substr(1);
		var hashes = searchStr.split('&');
		
		for(var i = 0; i < hashes.length; i++)
		{
			hash = hashes[i].split('=');
			args.push(hash[0]);
			args[hash[0]] = hash[1];
		}
		
		if(args["book"] && typeof args["book"] === "string") {
			_fsPath = args["book"].substr(0, args["book"].lastIndexOf("/") + 1);
		}

		return args;
	}

	var fixLinks = function() {
		if(_book.isFixedLayout() ) {
			$('#page-wrap a').click(linkClickHandler);
		}
		else {
			$('#readium-content-container a').click(linkClickHandler);
		}
		
	}

	var removeAddedStyleSheets = function() {
		$('.readium-dynamic-sh').remove();
	}

	var addStyleSheets = function(bookDom) {
		removeAddedStyleSheets();
		var links = bookDom.getElementsByTagName("link");
		var link; var href; var $link;
		for (var j = 0; j < links.length; j++) {
			link = links[j];
			if(typeof link.rel === "string" && link.rel.toUpperCase() === "STYLESHEET") {
				$link = $(link);
				$link.addClass('readium-dynamic-sh');
				$('head').prepend($link);
			}
		}
	}

	parseViewportTag = function(viewportTag) {
		// this is going to be ugly
		var str = viewportTag.getAttribute('content');
		str = str.replace(/\s/g, '');
		var valuePairs = str.split(',');
		var values = {};
		var pair;
		for(var i = 0; i < valuePairs.length; i++) {
			pair = valuePairs[i].split('=');
			if(pair.length === 2) {
				values[ pair[0] ] = pair[1];
			}
		}
		values['width'] = parseFloat(values['width']);
		values['height'] = parseFloat(values['height']);
		return values;
	}

	var addMetaHeadTags = function(bookDom) {
		// the desktop does not obey meta viewport tags so
		// dynamically add in some css
		var tag = bookDom.getElementsByName("viewport")[0];
		if(tag) {
			var pageSize = parseViewportTag(tag);
			document.head.appendChild(tag);
			_paginator.setPageSize(pageSize.width, pageSize.height);
		}
		
	}

	var showBook = function(bookDom) {
		
		addStyleSheets(bookDom);	
		document.title = bookDom.title;
		_book.applyBindings(bookDom);
		if(_paginator) {
			$("#readium-content-container").css("visibility", "hidden");
			_paginator.replaceContent(bookDom.body.innerHTML);
		}
		else {
			var options = {
				pageAddCallback: function($newPage) {
					$newPage.click(toggleUi);
				}
			}
			_paginator = Readium.Paginator($('#container'), bookDom.body.innerHTML, options);	
			if( shouldOpenInTwoUp() ) {
				_paginator.toggleTwoUp();
			}
			addPageTurnHandlers(_paginator);
		}
		fixLinks();
		
		// need to let the thread go for second so the css
		// is parsed before appending repaginating
		setTimeout(function() {	
			fireRepaginateEvent();
		}, 8);

	};

	var addFixedLayoutCssFlag = function() {
		// just tack a class name on to the body
		$('body').addClass('apple-fixed-layout');
	};

	var showFixedLayoutBook = function() {
		addFixedLayoutCssFlag();

		var uris = _book.getAllSectionUris();
		// need to parse one viewport tag
		window.webkitResolveLocalFileSystemURL(uris[0], function(fileEntry) {
			Readium.FileSystemApi(function(fs) {
				fs.readEntry(fileEntry, function(content) {
					var parser = new window.DOMParser();
					var dom = parser.parseFromString(content, 'text/xml');
					var options = parseViewportTag(dom.getElementsByName("viewport")[0]);
					options.pageAddCallback = function($newPage) {
						$newPage.click(toggleUi);
					};
					_paginator = Readium.FixedPaginator($('#container'), uris, options);
					_paginator.toggleTwoUp();
					fixLinks();
					addPageTurnHandlers(_paginator);

				}, function() {
					console.log('failed to load fixed layout book');
				})
			});
		});
			
		
			
	};
	
	var parseBookCallback = function(domString) {
		var parser = new window.DOMParser();
		var xmlDoc = parser.parseFromString(domString,"text/xml");
		showBook(xmlDoc);
	}

	var linkClickHandler = function(e) {
		var href = this.attributes["href"].value;
		e.preventDefault();
		if( _book.goToHref(href) ) {
			openCurrentSection();
		} else {
			console.log('failed to navigate spine to ' + href);
		}
	}

	var addToc = function() {
		$('#top-bar').append(_book.getProperties().title);
		_book.getTocText(function(res) { 
			var $tocArea = $('#menu');
			$tocArea.html(res);
			$('a', $tocArea).click(linkClickHandler);
		}, loadErrorHandler );
	};
	
	var openBook = function() {
		if(_urlArgs["book"] === undefined) {
			console.log("No book was specifiec to load");
			loadErrorHandler();
			return;
		}

		Lawnchair(function() {
			this.get(_urlArgs["book"], function(result) {
				if(result === null) {
					loadErrorHandler();
					return;
				}
				Readium.Ebook(result, function(book) {
					_book = book;
					if(_book.isFixedLayout()) {
						showFixedLayoutBook();
					}
					else {
						_book.getSectionText(parseBookCallback, loadErrorHandler);	
					}
					addToc();							
				}, function(e) {
					loadErrorHandler();
				});
			});		
		});
	}
	
	var loadErrorHandler = function(e) {
		console.log("Error could not load book");
	}
	
	var displaySettingsAtFirstLoad = function() {
		var timeout = setTimeout(toggleUi, 2000);
	}

	// temp fix me
	var pos = "-44px";
	var toggleUi = function() {
		var style = $('#top-bar')[0].style;
		
		var settings = $('#settings');
		var temp = style.top;
		style.top = pos;
		pos = temp;
		settings.toggleClass('hover-fade');
		
	};

	var initTopBar = function() {		
		$('#readium-content-container').click(toggleUi);
		$('.page-margin').click(toggleUi);
	};

	var initTocClick = function() {
		$('#show-toc-button').click(function(e) {
			$('body').toggleClass('show-toc');
			fireRepaginateEvent();
		});
	};

	// decide if should open in two up based on viewport
	// width
	var shouldOpenInTwoUp = function() {
		var width = document.documentElement.clientWidth;
		var height = document.documentElement.clientHeight;
		return width > 300 && width / height > 1.3;
	}

	$(function() {
		_urlArgs = parseUrlArgs();
		openBook();
		displaySettingsAtFirstLoad();
		initTopBar();
		initTocClick();
	});
})();
