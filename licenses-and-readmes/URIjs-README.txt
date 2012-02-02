js-uri <http://code.google.com/p/js-uri/>
=========================================

This is a small JavaScript library for manipulating URIs. It parses,
recreates and resolves them. For example:

  var some_uri = new URI("http://www.example.com/foo/bar");

  alert(some_uri.authority); // www.example.com
  alert(some_uri);           // http://www.example.com/foo/bar

  var blah      = new URI("blah");
  var blah_full = blah.resolve(some_uri);
  alert(blah_full);         // http://www.example.com/foo/blah
  
To use this library take a copy of lib/URI.js and include it in your page.
e.g.

  <script type="text/javascript" src="URI.js"></script>

It is based around code in RFC3986, "Uniform Resource Identifier (URI):
Generic Syntax".  There is a copy in the doc directory.

If you wish to run the test suite, open "tests/index.html" in a browser. For
some reason, this appears to only work in mozilla-based browsers (firefox,
camino, etc).

If you have any queries about the library, please drop me an email:

  Dominic Mitchell <dom [at] happygiraffe.net>

@(#) $Id: README.txt 13 2007-04-26 19:53:13Z happygiraffe.net $
