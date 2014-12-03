{spawn} = require 'child_process'

srcdir = 'src/coffee'
testdir = 'test/coffee'
libdir = 'lib'

runExternal = (cmd, args) ->
	child = spawn(cmd, args, stdio: 'inherit')
	child.on('error', console.error)
	child.on('close', process.exit)

task 'clean', 'Delete lib/ dir', ->
	runExternal 'rm', ['-rf', libdir]

task 'build', 'Build lib/ from src/', ->
	runExternal 'coffee', ['-c', '-o', libdir, srcdir]

task 'watch', 'Watch src/ for changes', ->
	runExternal 'coffee', ['-w', '-c', '-o', libdir, srcdir]

task 'test', 'Run tests', ->
	runExternal 'mocha', ['--compilers', 'coffee:coffee-script/register', testdir]
