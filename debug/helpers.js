/**
 * this file contains a couple helpers for exploring the persistent storage
 * from the console. It is intended for debugging use only.
 *
 * DO NOT INCLUDE THIS FILE IN THE PRODUCTION APP!!!
 */

var pwd;	

function nukeLawnchair() {
	new Lawnchair(function() {
		this.nuke();
	})
}

function saveObj(obj) {
	new Lawnchair(function() {
		this.save(obj), function(obj) {
			console.log(obj);
		}
	})
}

function logLawnchair() {
	new Lawnchair(function() {
		this.all(function(all) {
			for(var i =0; i < all.length; i++) {
				console.log(all[i]);
			}
		})
	})
}
	
function toArray(list) {
	return Array.prototype.slice.call(list || [], 0);
}

function listResults(entries) {
	for (var i=0; i < entries.length; i++) {
		console.log(entries[i].name)
	}
}

function rmdir(path) {
	if(pwd === null || pwd === undefined) {
		pwd = fs.root;
	}
	pwd.getDirectory(path, {}, function(dirEntry) {
	    dirEntry.removeRecursively(function() {
	      console.log('Directory removed.');
	    }, null);
	}, null);
}

function ls(path) {
	
	if(pwd === null || pwd === undefined) {
		pwd = fs.root;
	}

	var dirReader = pwd.createReader();
	var entries = [];

	// Call the reader.readEntries() until no more results are returned.
	var readEntries = function() {
		dirReader.readEntries (function(results) {
			if (!results.length) {
				listResults(entries.sort());
			} else {
				entries = entries.concat(toArray(results));
				readEntries();
			}
		}, null);
	};

	if(path) {
		fs.root.getDirectory(path, {}, function(dirEntry) {
		    dirReader = dirEntry.createReader();
			readEntries();
		  }, null);
	}
	else {
		readEntries(); // Start reading dirs.
	}
	

}


function nukeFs() {

	var dirReader = fs.root.createReader();
	var entries = [];

	dirReader.readEntries (function(results) {
		for(var i = 0; i < results.length; i++) {
			if(results[i].isFile) {
				results[i].remove();
			}
			else {
				results[i].removeRecursively();
			}
		}
	}, null);


}
/*
function nukeFs() {
		fs.root.getDirectory(path, {}, function(dirEntry) {
		    dirEntry.removeRecursively(function() {
		      console.log('Directory removed.');
		    }, fileSystemErrorHandler);
		}, fileSystemErrorHandler);
}
*/
	
