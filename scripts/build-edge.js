// Build the Edge extension.

var fs = require('fs-extra')
var path = require('path')
const execSync = require('child_process').execSync
var archiver = require('archiver')

var BASE_BUILD_DIR = path.join(__dirname, '../build/')
var BUILD_DIR = path.join(BASE_BUILD_DIR, 'edge/')
var SHARED_CODE_BUILD_DIR = path.join(__dirname, '../intermediate-builds/shared/')
var SRC_DIR = path.join(__dirname, '../src/edge/')

// Get the version number.
var manifest = require(path.join(SRC_DIR, 'manifest.json'))
var version = manifest['version']
console.log('Building extension version ' + version + '...')

// Empty build target contents. This will also create the directory
// if it does not exist.
fs.emptyDirSync(BUILD_DIR)

// Create the build version of the src.
var stageDir = path.join(BUILD_DIR, 'edge-tfac')

// Filter copying source files to build. Return true if we should copy and
// false if we should not.
var filterCopiedFiles = (src, dest) => {
  if (path.basename(src) === '.DS_Store') {
    return false
  }
  return true
}
fs.copySync(SRC_DIR, stageDir, { filter: filterCopiedFiles })
fs.removeSync(path.join(stageDir, '__tests__'))

// Build the shared code and add it to the built extension.
execSync('yarn run shared:build')
fs.copySync(SHARED_CODE_BUILD_DIR, stageDir)

// Create zip file.
var zipFileName = 'edge-tfac-v' + version + '.zip'
var output = fs.createWriteStream(path.join(BUILD_DIR, zipFileName))
var archive = archiver('zip')

// Listen for all archive data to be written.
output.on('close', function () {
  console.log(archive.pointer() + ' total bytes')
  console.log('Finished building.')
})

archive.on('error', function (err) {
  throw err
})

// Pipe archive data to the file.
archive.pipe(output)

// Append all files in our src directory.
archive.directory(stageDir, '/')

// Finalize the archive (i.e. we are done appending files,
// but streams still have to finish).
archive.finalize()
