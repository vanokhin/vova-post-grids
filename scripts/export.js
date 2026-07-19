/* eslint-env node */

process.env.TZ = 'UTC';

const crypto = require( 'crypto' );
const fs = require( 'fs' );
const ignore = require( 'ignore' );
const os = require( 'os' );
const path = require( 'path' );
const { spawnSync } = require( 'child_process' );

const rootDir = path.resolve( __dirname, '..' );
const packagePath = path.join( rootDir, 'package.json' );
const distIgnorePath = path.join( rootDir, '.distignore' );
const packageMetadata = JSON.parse( fs.readFileSync( packagePath, 'utf8' ) );
const packageName = packageMetadata.name;
const packageVersion = packageMetadata.version;
const versionPlaceholder = [ '999', 'version' ].join( '-' );
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const defaultSourceDateEpoch = 1704067200;
const minimumZipEpoch = 315532800;

const releaseEntries = [
	'LICENSE',
	'build',
	'includes',
	'languages',
	'package-lock.json',
	'package.json',
	'readme.txt',
	'scripts',
	'src',
	'vova-posts-grid.php',
];

const requiredReleaseFiles = [
	'LICENSE',
	'build/blocks/posts-grid/block.json',
	'build/blocks/posts-grid/index.asset.php',
	'build/blocks/posts-grid/index.css',
	'build/blocks/posts-grid/index.js',
	'build/blocks/posts-grid/render.php',
	'build/blocks/posts-grid/style-index.css',
	'build/blocks/posts-grid/view.asset.php',
	'build/blocks/posts-grid/view.js',
	'includes/class-vovapg-posts-grid.php',
	'languages/vova-posts-grid.pot',
	'package-lock.json',
	'package.json',
	'readme.txt',
	'scripts/export.js',
	'scripts/remove-pot-creation-date.js',
	'src/blocks/posts-grid/block.json',
	'vova-posts-grid.php',
];

const forbiddenPatterns = [
	{
		label: 'legacy short prefix',
		value: [ 'v', 'smb' ].join( '' ),
	},
	{
		label: 'legacy plugin slug',
		value: [ 'vova', 'blocks' ].join( '-' ),
	},
	{
		label: 'external licensing SDK',
		value: [ 'free', 'mius' ].join( '' ),
	},
	{
		label: 'external licensing initializer',
		value: [ 'fs', 'dynamic', 'init' ].join( '_' ),
	},
	{
		label: 'paid-edition marker',
		value: [ 'pre', 'mium' ].join( '' ),
	},
	{
		label: 'upgrade-promotion marker',
		value: [ 'up', 'sell' ].join( '' ),
	},
	{
		label: 'unresolved version placeholder',
		value: versionPlaceholder,
	},
];

const toPosixPath = ( filePath ) => filePath.split( path.sep ).join( '/' );

const run = ( command, args, options = {} ) => {
	const result = spawnSync( command, args, {
		cwd: rootDir,
		encoding: 'utf8',
		stdio: 'inherit',
		...options,
	} );

	if ( result.error ) {
		throw result.error;
	}

	if ( result.status !== 0 ) {
		throw new Error(
			`${ command } ${ args.join( ' ' ) } exited with code ${
				result.status
			}.`
		);
	}

	return result;
};

const getSourceDate = () => {
	const rawValue = process.env.SOURCE_DATE_EPOCH;
	const epoch =
		rawValue === undefined ? defaultSourceDateEpoch : Number( rawValue );

	if ( ! Number.isInteger( epoch ) || epoch < minimumZipEpoch ) {
		throw new Error(
			'SOURCE_DATE_EPOCH must be an integer at or after 1980-01-01.'
		);
	}

	return new Date( epoch * 1000 );
};

const getHeaderValue = ( contents, field ) => {
	const escapedField = field.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const match = contents.match(
		new RegExp( `^\\s*\\*?\\s*${ escapedField }:\\s*(.+?)\\s*$`, 'mi' )
	);

	return match ? match[ 1 ].trim() : '';
};

const assertEqual = ( actual, expected, label ) => {
	if ( actual !== expected ) {
		throw new Error(
			`${ label } must be "${ expected }", received "${ actual }".`
		);
	}
};

const replaceVersionPlaceholder = ( filePath ) => {
	const contents = fs.readFileSync( filePath, 'utf8' );

	fs.writeFileSync(
		filePath,
		contents.split( versionPlaceholder ).join( packageVersion )
	);
};

const replaceVersionPlaceholders = ( pluginDirectory ) => {
	[ 'vova-posts-grid.php', 'readme.txt' ].forEach( ( relativePath ) => {
		replaceVersionPlaceholder( path.join( pluginDirectory, relativePath ) );
	} );
};

const validateReleaseMetadata = ( pluginDirectory ) => {
	assertEqual( packageName, 'vova-posts-grid', 'package.json name' );

	const pluginContents = fs.readFileSync(
		path.join( pluginDirectory, 'vova-posts-grid.php' ),
		'utf8'
	);
	const expectedPluginHeaders = {
		'Plugin Name': "Vova's Posts Grid",
		Version: packageVersion,
		'Requires at least': '6.5',
		'Requires PHP': '7.4',
		Author: 'Vova Anokhin',
		License: 'GPL-2.0-or-later',
		'Text Domain': 'vova-posts-grid',
		'Domain Path': '/languages',
	};

	Object.entries( expectedPluginHeaders ).forEach(
		( [ field, expected ] ) => {
			assertEqual(
				getHeaderValue( pluginContents, field ),
				expected,
				field
			);
		}
	);

	const readmeContents = fs.readFileSync(
		path.join( pluginDirectory, 'readme.txt' ),
		'utf8'
	);
	const expectedReadmeHeaders = {
		'Requires at least': '6.5',
		'Requires PHP': '7.4',
		'Stable tag': packageVersion,
		License: 'GPL-2.0-or-later',
	};

	Object.entries( expectedReadmeHeaders ).forEach(
		( [ field, expected ] ) => {
			assertEqual(
				getHeaderValue( readmeContents, field ),
				expected,
				field
			);
		}
	);

	[ 'src', 'build' ].forEach( ( directory ) => {
		const blockPath = path.join(
			pluginDirectory,
			directory,
			'blocks/posts-grid/block.json'
		);
		const blockMetadata = JSON.parse(
			fs.readFileSync( blockPath, 'utf8' )
		);

		assertEqual(
			blockMetadata.name,
			'vovapg/posts-grid',
			`${ directory } block name`
		);
		assertEqual(
			blockMetadata.version,
			packageVersion,
			`${ directory } block version`
		);
		assertEqual(
			blockMetadata.textdomain,
			'vova-posts-grid',
			`${ directory } block text domain`
		);
	} );

	const potContents = fs.readFileSync(
		path.join( pluginDirectory, 'languages/vova-posts-grid.pot' ),
		'utf8'
	);

	if ( ! potContents.includes( 'X-Domain: vova-posts-grid' ) ) {
		throw new Error(
			'Translation template has an unexpected text domain.'
		);
	}

	if ( potContents.includes( 'POT-Creation-Date:' ) ) {
		throw new Error(
			'Translation template contains a volatile creation date.'
		);
	}
};

if ( ! fs.existsSync( distIgnorePath ) ) {
	throw new Error( '.distignore is required to create a release archive.' );
}

const ignoredPaths = ignore().add( fs.readFileSync( distIgnorePath, 'utf8' ) );

const shouldIgnore = ( relativePath, isDirectory ) => {
	if ( ! relativePath ) {
		return false;
	}

	const normalizedPath = toPosixPath( relativePath );
	return ignoredPaths.ignores(
		isDirectory ? `${ normalizedPath }/` : normalizedPath
	);
};

const copyEntry = ( sourcePath, targetPath, relativePath ) => {
	const stats = fs.lstatSync( sourcePath );
	const isDirectory = stats.isDirectory();

	if ( shouldIgnore( relativePath, isDirectory ) ) {
		return;
	}

	if ( stats.isSymbolicLink() ) {
		throw new Error( `Symbolic links are not allowed: ${ relativePath }` );
	}

	if ( isDirectory ) {
		fs.mkdirSync( targetPath, { recursive: true, mode: 0o755 } );
		fs.readdirSync( sourcePath )
			.sort( ( left, right ) => left.localeCompare( right, 'en' ) )
			.forEach( ( entryName ) => {
				copyEntry(
					path.join( sourcePath, entryName ),
					path.join( targetPath, entryName ),
					path.join( relativePath, entryName )
				);
			} );
		return;
	}

	if ( ! stats.isFile() ) {
		throw new Error( `Unsupported filesystem entry: ${ relativePath }` );
	}

	fs.copyFileSync( sourcePath, targetPath );
	fs.chmodSync( targetPath, 0o644 );
};

const listFiles = ( directory, relativePath = '' ) => {
	const files = [];

	fs.readdirSync( directory )
		.sort( ( left, right ) => left.localeCompare( right, 'en' ) )
		.forEach( ( entryName ) => {
			const absolutePath = path.join( directory, entryName );
			const entryRelativePath = path.join( relativePath, entryName );
			const stats = fs.lstatSync( absolutePath );

			if ( stats.isDirectory() ) {
				files.push( ...listFiles( absolutePath, entryRelativePath ) );
				return;
			}

			if ( ! stats.isFile() ) {
				throw new Error(
					`Unsupported staged entry: ${ toPosixPath(
						entryRelativePath
					) }`
				);
			}

			files.push( toPosixPath( entryRelativePath ) );
		} );

	return files;
};

const normalizeTree = ( directory, timestamp ) => {
	fs.readdirSync( directory ).forEach( ( entryName ) => {
		const entryPath = path.join( directory, entryName );
		const stats = fs.lstatSync( entryPath );

		if ( stats.isDirectory() ) {
			normalizeTree( entryPath, timestamp );
			fs.chmodSync( entryPath, 0o755 );
		} else {
			fs.chmodSync( entryPath, 0o644 );
		}

		fs.utimesSync( entryPath, timestamp, timestamp );
	} );

	fs.chmodSync( directory, 0o755 );
	fs.utimesSync( directory, timestamp, timestamp );
};

const validateRequiredFiles = ( pluginDirectory ) => {
	requiredReleaseFiles.forEach( ( relativePath ) => {
		const filePath = path.join( pluginDirectory, relativePath );

		if (
			! fs.existsSync( filePath ) ||
			! fs.lstatSync( filePath ).isFile()
		) {
			throw new Error(
				`Missing required release file: ${ relativePath }`
			);
		}
	} );
};

const validateReleaseContents = ( pluginDirectory ) => {
	listFiles( pluginDirectory ).forEach( ( relativePath ) => {
		const buffer = fs.readFileSync(
			path.join( pluginDirectory, relativePath )
		);

		if ( buffer.includes( 0 ) ) {
			return;
		}

		const contents = buffer.toString( 'utf8' ).toLowerCase();
		forbiddenPatterns.forEach( ( { label, value } ) => {
			if ( contents.includes( value.toLowerCase() ) ) {
				throw new Error( `${ label } found in ${ relativePath }.` );
			}
		} );
	} );
};

const createArchive = ( stagingRoot, pluginDirectory, archivePath ) => {
	const pluginFiles = listFiles( pluginDirectory );
	const archiveEntries = pluginFiles.map( ( relativePath ) =>
		toPosixPath( path.join( packageName, relativePath ) )
	);
	const result = spawnSync( 'zip', [ '-X', '-q', archivePath, '-@' ], {
		cwd: stagingRoot,
		encoding: 'utf8',
		input: `${ archiveEntries.join( '\n' ) }\n`,
		stdio: [ 'pipe', 'inherit', 'inherit' ],
	} );

	if ( result.error ) {
		throw result.error;
	}

	if ( result.status !== 0 ) {
		throw new Error( `zip exited with code ${ result.status }.` );
	}

	return archiveEntries;
};

const verifyArchive = ( archivePath, expectedEntries ) => {
	run( 'unzip', [ '-tqq', archivePath ] );
	const manifestResult = run( 'unzip', [ '-Z1', archivePath ], {
		stdio: [ 'ignore', 'pipe', 'inherit' ],
	} );
	const archiveEntries = manifestResult.stdout
		.split( /\r?\n/ )
		.filter( Boolean );
	const expectedPrefix = `${ packageName }/`;

	archiveEntries.forEach( ( entry ) => {
		if (
			! entry.startsWith( expectedPrefix ) ||
			entry.includes( '..' ) ||
			entry.includes( '\\' )
		) {
			throw new Error( `Invalid archive entry: ${ entry }` );
		}
	} );

	assertEqual(
		JSON.stringify( archiveEntries ),
		JSON.stringify( expectedEntries ),
		'archive manifest'
	);
};

const getArchiveHash = ( archivePath ) =>
	crypto
		.createHash( 'sha256' )
		.update( fs.readFileSync( archivePath ) )
		.digest( 'hex' );

const main = () => {
	run( npmCommand, [ 'run', 'build' ] );
	replaceVersionPlaceholder(
		path.join( rootDir, 'languages/vova-posts-grid.pot' )
	);

	const distDirectory = path.join( rootDir, 'dist' );
	const archiveName = `${ packageName }-${ packageVersion }.zip`;
	const archivePath = path.join( distDirectory, archiveName );
	const stagingRoot = fs.mkdtempSync(
		path.join( os.tmpdir(), `${ packageName }-export-` )
	);
	const stagingPluginDirectory = path.join( stagingRoot, packageName );

	fs.mkdirSync( distDirectory, { recursive: true } );
	fs.rmSync( archivePath, { force: true } );
	fs.mkdirSync( stagingPluginDirectory, { recursive: true, mode: 0o755 } );

	try {
		releaseEntries.forEach( ( entry ) => {
			const sourcePath = path.join( rootDir, entry );

			if ( ! fs.existsSync( sourcePath ) ) {
				throw new Error(
					`Missing allowlisted release entry: ${ entry }`
				);
			}

			copyEntry(
				sourcePath,
				path.join( stagingPluginDirectory, entry ),
				entry
			);
		} );

		replaceVersionPlaceholders( stagingPluginDirectory );
		validateReleaseMetadata( stagingPluginDirectory );
		validateRequiredFiles( stagingPluginDirectory );
		validateReleaseContents( stagingPluginDirectory );
		normalizeTree( stagingPluginDirectory, getSourceDate() );

		const expectedEntries = createArchive(
			stagingRoot,
			stagingPluginDirectory,
			archivePath
		);
		verifyArchive( archivePath, expectedEntries );

		process.stdout.write( `Created release archive: ${ archivePath }\n` );
		process.stdout.write( `SHA-256: ${ getArchiveHash( archivePath ) }\n` );
	} finally {
		fs.rmSync( stagingRoot, { recursive: true, force: true } );
	}
};

main();
