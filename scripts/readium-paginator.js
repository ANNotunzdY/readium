// We have a dependency on jQuery for now
if(typeof jQuery === "undefined") {
	throw "Readium pagination holds jQuery as a dependency";
}

// Define a namespace for the library
if (typeof Readium === "undefined" || Readium === null) {
	Readium = {};
}


// container is the place in which to put pages. best to use body.
Readium.Paginator = function(container, content, options) {
		
	// private variables
	var _paginationContainer 	= $(container);
	var _pagePrefix 			= '<div ';
	var _pageSuffix 			= '><div class="page-margin"><div class="page"></div></div></div>';
	var _pageCount 				= 0;
	var _currentPage 			= 0;
	var _displayedPages			= 1;
	var _contentContainer;
	var _contentEnd;
	var _pageAddCallback;
	var _pageZeroHtml			= '<div id="page-0" class="page-wrap even"><div class="page-margin"></div></div>';
	
	
	// initialization code goes here
	var init = function() {
		
		// set up the pagination content
		_contentContainer = $('#readium-content-container');
		_contentContainer.append(content);
		_contentContainer.append("<div id='content-end'></div>");
		_contentContainer.css('-webkit-flow', 'foo');
		_contentContainer.css('-webkit-flow-into', 'foo');
		_contentEnd = $('#content-end');

		_pageAddCallback = options.pageAddCallback;
		
		// add the first page to kick things off
		addPage();
		_currentPage = 1;
		
		// now adjust page numbers as usual
		adjustPageNumbers();
		
		window.onresize = function(event) {
		    adjustPageNumbers();
			if(_currentPage <= _pageCount) {
				goToPage(_currentPage);
			}
			else {
				goToPage(_pageCount)
			}

		}
		
		$('#readium-content-container').bind("content-size-changed", function() {
			adjustPageNumbers();
		});
		
	}

	// performance optimiztion to minimize dom manipulation
	var guessPageNumber = function() {
		var quotient;
		quotient = $('#readium-content-container').height() / $('.page').first().height();
		if(quotient < 1) {
			return 1;
		}
		return Math.ceil(quotient);
	}

	var setNumPages = function(num) {
		var i; var html;

		if( inTwoUpMode() ) {
			html = _pageZeroHtml;
		} 
		else {
			html = "";	
		}
		
		for( i = 1; i <= num; i++) {
			html += getPageHtml(i)
		}

		_paginationContainer.html( html );
		if(_pageAddCallback) {
			_pageAddCallback($('.page-wrap'));
		}
		_pageCount = num;
	}
	
	var getPageId = function(pageNumber) {
		return "page-" + pageNumber.toString();
	}
	
	var inTwoUpMode = function() {
		return _displayedPages === 2;
	}
	
	var toggleTwoUp = function() {
		var page;
		if( inTwoUpMode() ) {
			$('#page-0').remove();
			$('#container').removeClass('two-up');
			_displayedPages = 1;
			$('#spine-divider').hide();
		}
		else{
			if(_currentPage % 2 === 0) {
				goToPage( _currentPage - 1);
			}
			$('#container').addClass('two-up');
			page = $(_pageZeroHtml);
			$('#container').prepend(page);
			if(_pageAddCallback) {
				_pageAddCallback(page);
			}
			$('#spine-divider').show();
			_displayedPages = 2;
		}
		adjustPageNumbers();
	}
	
	var isPageNumberValid = function(pageNumber) {
		return pageNumber >= 1 && pageNumber <= _pageCount;
	}
	
	var fixImgHeight = function() {
		var maxHeight = $('#page-1').height() * 0.9;
		$('img').css('max-height', maxHeight.toString() + "px");
	}
	
	var adjustPageNumbers = function() {

		// take a guess at page number
		setNumPages( guessPageNumber() );
		
		while(needPage()) {
			addPage();
		}

		while(tooManyPages()) {
			removePage(); 
		}
		
		if( inTwoUpMode() && _pageCount % 2 === 0) {
			addPage();
		}
		
		fixImgHeight();

	}
	
	var getLastPage = function() {
		var selector = '#' + getPageId(_pageCount);
		return $(selector).first();
	};

	var tooManyPages = function() {
		if(_pageCount <= 1) {
			return false;
		}
		return getContentBottom() < getLastPage().children().children().offset().top;
	};

	var needPage = function() {
		var pageEnd; var contEnd;
		if( _contentContainer.children().length === 0) {
			return false;
		}
		pageEnd = getBottomPos( getLastPage().children().children() );
		contEnd = getContentBottom();
		return pageEnd < contEnd;
	};

	var getBottomPos = function( $elem ) {
		return $elem.outerHeight(true) + $elem.offset().top;
	};
	
	var getContentBottom = function() {
		return getBottomPos( _contentEnd );
	}
	
	var getPageClass = function(pageNum) {
		if(pageNum % 2 === 0) {
			return " class='page-wrap even' "
		} else {
			return " class='page-wrap odd' "
		}
	}

	var getPageHtml = function(pageNum) {
		return _pagePrefix + 
				"id='" + getPageId( pageNum ) +  "' " +
				getPageClass( pageNum ) + 
				_pageSuffix;
	}

	var addPage = function() {
		var pageNum = _pageCount + 1;
		var pageHtml = getPageHtml(pageNum);
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
				
		id = getPageId(pageNumber); 
		page = document.getElementById(id);
		
		if(page !== undefined && page !== null) {
			page.scrollIntoView();
			_currentPage = pageNumber;
		//	document.location.hash = id;
			//updatePageCount();
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
			$('#content-end').before(content);
		//	_contentContainer.append(content);
			setNumPages( guessPageNumber() );
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
		
		toggleTwoUp: toggleTwoUp
			
	}
	

}
