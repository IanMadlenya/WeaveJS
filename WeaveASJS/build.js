const execSync = require('child_process').execSync;
//process.env.FLEX_HOME="";
var command = '"node_modules/flexjs/js/bin/mxmlc" -remove-circulars -js-compiler-option="--compilation_level WHITESPACE_ONLY" -fb "' + __dirname + '"';
console.log(command);
execSync(command, {stdio: "inherit"});
