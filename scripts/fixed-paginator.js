// We have a dependency on jQuery for now
if(typeof jQuery === "undefined") {
	throw "Readium pagination holds jQuery as a dependency";
}

// Define a namespace for the library
if (typeof Readium === "undefined" || Readium === null) {
	Readium = {};
}


// container is the place in which to put pages. best to use body.
Readium.FixedPaginator = function(container, contentUris, options) {
		
	// private variables
	var _paginationContainer 	= $(container);
	var _pageSuffix 			= '</div></div>';
	var _pageCount 				= 0;
	var _currentPage 			= 0;
	var _$visiblePages;
	var _displayedPages			= 1;
	var _contentContainer;
	var _contentEnd;
	var _pageAddCallback;
	var _pageZeroHtml			= '<div id="page-0" class="fixed-page-wrap even invisible"><div class="fixed-page-margin"></div></div>';
	var _pageHeight;
	var _pageWidth;
	
	
	// initialization code goes here
	var init = function() {
		
		// set up the pagination content
		_contentContainer = $('#readium-content-container');
		_contentContainer.append("<div id='content-end'></div>");
		_contentEnd = $('#content-end');
		_pageAddCallback = options.pageAddCallback;
		_pageWidth = options.width || 483.6;
		_pageHeight = options.height || 624;
		setPageSize(_pageWidth, _pageHeight);
		// add all the pages
		for(var i = 0; i < contentUris.length; i++) {
			addPage(contentUris[i]);
		}		

		$('iframe').load(function() {
			var $dom = $(this.contentDocument.body);
			setZoom($dom );
			/* cleanest solution will be to propagate to parent window */
			$dom.keydown(function(e) {
				$(window.parent.document).trigger(e);	
			});
			
			if(_pageAddCallback) {
				_pageAddCallback($dom);
			}
		});
		_currentPage = 1;
		_$visiblePages = $('#page-1');
		_$visiblePages.removeClass('invisible');
		
		setZoom($("#page-wrap"));

		window.onresize = function(event) {
			var zoom = 90 * window.innerHeight / _pageHeight;
			$("#page-wrap").css("zoom", zoom + "%");
			$('iframe').contents().each(function() {$(this.body).css('zoom', zoom + "%")})
		}
	}

	var calcZoom = function() {
		return 90 * window.innerHeight / _pageHeight;
	};

	var setZoom = function($elem) {
		$elem.css("zoom", calcZoom() + "%");
	}

	var setPageSize = function(width, height) {
		var style; var css = [];
		_pageHeight = height;
		css.push(".apple-fixed-layout #spine-divider, .fixed-page-wrap, #container { height: " + height.toString() + "px; }");
		css.push(".two-up .fixed-page-wrap.even { margin-left: -" + width.toString() + "px; }");
		css.push(".fixed-page-wrap { margin-left: -" + (width / 2).toString() + "px; }");
		css.push(".fixed-page-wrap { width: " + width.toString() + "px; }");

		style = '<style type="text/css">' + css.join("\n") + "</style>";
		$("head").append(style);
	}
	
	var inTwoUpMode = function() {
		return _displayedPages === 2;
	}
	
	var toggleTwoUp = function() {
		var page;
		if( inTwoUpMode() ) {
			$('#container').removeClass('two-up');
			$('#page-0').remove();
			_displayedPages = 1;
			$('#spine-divider').hide();
			goToPage(_currentPage);
		}
		else{
			page = $(_pageZeroHtml);
			$('#container').addClass('two-up');
			$('#container').prepend(page);
			$('#spine-divider').show();
			_displayedPages = 2;
			if(_currentPage % 2 !== 0 ) {
				goToPage( _currentPage - 1);
			}
			else {
				goToPage( _currentPage );
			}
			if(_pageAddCallback) {
				_pageAddCallback(page);
			}
		}
	}
	
	var isPageNumberValid = function(pageNumber) {
		if(inTwoUpMode()) {
			return pageNumber >= 0 && pageNumber <= _pageCount;
		}
		else {
		return pageNumber >= 1 && pageNumber <= _pageCount;	
		}
		
	}
	
	var fixImgHeight = function() {
		var maxHeight = $('#page-1').height() * 0.9;
		$('img').css('max-height', maxHeight.toString() + "px");
	}
	
	var getLastPage = function() {
		var selector = '#' + getPageId(_pageCount);
		return $(selector).first();
	};

	var getPageClass = function(pageNum) {
		if(pageNum % 2 === 0) {
			return " class='fixed-page-wrap even invisible' "
		} else {
			return " class='fixed-page-wrap odd invisible' "
		}
	}

	var getPageId = function(pageNumber) {
		return "page-" + pageNumber.toString();
	}

	var getPagePrefix = function(pageNum) {
		var prefix 	= '<div id="' + getPageId(pageNum) + '" ';
		prefix += getPageClass(pageNum);
		prefix += '><div class="fixed-page-margin">';
		return prefix;
	}

	var getPageIframe = function(src) {
		var html = "<iframe scrolling='no' frameborder='0' marginwidth='0' marginheight='0' width='"
		html += _pageWidth + "px' height='" + _pageHeight + "px' src='" + src + "'/>";
		return html;
	};



	var addPage = function(url) {
		var pageNum = _pageCount + 1;
		var pageHtml = getPagePrefix(pageNum);
		pageHtml += getPageIframe(url);
		pageHtml += _pageSuffix;
		var page = $(pageHtml);
		_paginationContainer.append( page );
		if(_pageAddCallback) {
			_pageAddCallback(page);
		}
		_pageCount = pageNum;
	};

	var removePage = function() {
		// todo touch this up a bit
		//var selector = "#" + getPageId("x");
		var selector = '.page-wrap';
		$(selector).last().remove();
		_pageCount -= 1;
		if(_currentPage >= _pageCount) {
			goToPage(_pageCount);
		}
	};
	
	var goToPage = function(pageNumber) {
		var id; var page;
		
		if( !isPageNumberValid(pageNumber) ) {
			return false;
		}
		
		if(inTwoUpMode()) {
			id = '#' + getPageId(pageNumber);
			id += ', #' + getPageId(pageNumber + 1); 
		}
		else {
			id = '#' + getPageId(pageNumber); 	
		}
		page = $(id);
		
		if(page) {
			_$visiblePages.addClass('invisible');
			page.removeClass('invisible');
			_$visiblePages = page;
			_currentPage = pageNumber;
			return true;
		}
		else {
			return false;
		}	
		
	};	
	
	// call the initialization code
	init();
	
	// return the public facing interface
	return {
		
		appendContent: function(content) {
			addPage(content);
		},
		
		getPageNumber: function(element) {
			throw "getPageNumber is not implement yet";
		},
		
		pageForward: function() {	
			return goToPage( _currentPage + _displayedPages);
		},

		pageBack: function() {
			return goToPage( _currentPage - _displayedPages);
		},
		
		replaceContent: function(content) {
			$('#readium-content-container').html(content + "<div id='content-end'></div>");
			_contentEnd = $('#content-end');
		},
		
		goTolastPage: function() {
			goToPage(_pageCount);
		},
		
		goToFirstPage: function() {
			goToPage(1);
		},
		
		toggleTwoUp: toggleTwoUp,

		
			
	}
	

}
