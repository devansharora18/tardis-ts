import path from 'node:path'
import { Command } from 'commander'
import { buildApp, type BuildTarget } from './commands/build'
import { devApp } from './commands/dev'
import {
	createProject,
	initProject,
	type PackageManager,
	type Platform,
	type Styling,
	type Template,
} from './commands/init'
import { previewProject } from './commands/preview'
import { runApp } from './commands/run'
import { screenshotApp } from './commands/screenshot'
import { formatBytes } from './lib/fs'
import { createPrompter, isInteractive } from './lib/prompt'

export function createProgram(): Command {
	const program = new Command()
	program
		.name('tardis')
		.description('TSX-native UI framework for desktop and web')

	const scaffoldOptions = (options: {
		platform?: string
		styling?: string
		template?: string
		pm?: string
		install?: boolean
		git?: boolean
		yes?: boolean
		force?: boolean
	}) => ({
		platform: parsePlatform(options.platform),
		styling: parseStyling(options.styling),
		template: parseTemplate(options.template),
		packageManager: parsePackageManager(options.pm),
		install: options.install,
		git: options.git,
		force: options.force,
		prompt: options.yes ? false : undefined,
	})

	const withScaffoldOptions = (command: Command): Command =>
		command
			.option('--platform <platform>', 'native, web, or both')
			.option('--styling <styling>', 'default or tailwind')
			.option('--template <template>', 'counter, form, or sheet')
			.option('--pm <pm>', 'npm, pnpm, yarn, or bun')
			.option('--install', 'install dependencies')
			.option('--git', 'initialize a git repository')
			.option('--yes', 'accept defaults (no prompts)')
			.option('--force', 'write into a non-empty directory')

	withScaffoldOptions(
		program
			.command('create [dir]')
			.description('Create a new app (interactive like flutter create)')
	).action(async (dir: string | undefined, options: Parameters<typeof scaffoldOptions>[0]) => {
		let target = dir
		if (!target && isInteractive() && !options.yes) {
			const prompter = createPrompter()
			try {
				target = await prompter.text('Project directory', 'tardis-app')
			} finally {
				prompter.close()
			}
		}
		target ??= 'tardis-app'
		const result = await createProject(target, scaffoldOptions(options))
		console.log(`created ${result.files.length} files in ${result.dir}`)
		console.log('next: cd into the project and run your package manager install')
	})

	withScaffoldOptions(
		program
			.command('init [dir]')
			.description('Create a starter app in the current directory')
	).action(async (dir: string | undefined, options: Parameters<typeof scaffoldOptions>[0]) => {
		const result = await initProject(dir ? path.resolve(dir) : process.cwd(), scaffoldOptions(options))
		console.log(`created ${result.files.length} files in ${result.dir}`)
	})

	program
		.command('build [entry]')
		.description('Bundle a TSX app for a target')
		.option('--target <target>', 'native or web', 'native')
		.option('--out <path>', 'output bundle')
		.option('--minify', 'minify the bundle')
		.option('--css <path>', 'stylesheet to link from the web shell')
		.action(
			async (
				entry: string | undefined,
				options: {
					target: string
					out?: string
					minify?: boolean
					css?: string
				}
			) => {
				const target = parseTarget(options.target)
				const result = await buildApp(process.cwd(), {
					entry,
					out: options.out,
					minify: options.minify,
					target,
					css: options.css,
				})
				console.log(
					`built ${displayPath(process.cwd(), result.outfile)} (${formatBytes(result.bytes)})`
				)
				if (result.shell) {
					console.log(`wrote ${displayPath(process.cwd(), result.shell)}`)
				}
			}
		)

	program
		.command('run [entry]')
		.description('Build and open the native window')
		.option('--width <px>', 'window width', '800')
		.option('--height <px>', 'window height', '600')
		.option('--scale <factor>', 'device pixel ratio')
		.option('--backend <name>', 'softbuffer or wgpu', 'softbuffer')
		.action(
			async (
				entry: string | undefined,
				options: {
					width: string
					height: string
					scale?: string
					backend: string
				}
			) => {
				const code = await runApp(process.cwd(), {
					entry,
					width: parseSize(options.width, 'width'),
					height: parseSize(options.height, 'height'),
					scale: options.scale
						? Number.parseFloat(options.scale)
						: undefined,
					backend: options.backend,
				})
				if (code !== 0) process.exitCode = code
			}
		)

	program
		.command('screenshot [entry]')
		.description('Render one native frame headlessly to a PNG')
		.option('-o, --out <path>', 'PNG output', 'screenshot.png')
		.option('--dump <path>', 'write the laid-out scene as JSON')
		.option('--width <px>', 'viewport width', '800')
		.option('--height <px>', 'viewport height', '600')
		.option('--scale <factor>', 'device pixel ratio')
		.action(
			async (
				entry: string | undefined,
				options: {
					out: string
					dump?: string
					width: string
					height: string
					scale?: string
				}
			) => {
				const result = await screenshotApp(process.cwd(), {
					entry,
					out: options.out,
					dump: options.dump,
					width: parseSize(options.width, 'width'),
					height: parseSize(options.height, 'height'),
					scale: options.scale
						? Number.parseFloat(options.scale)
						: undefined,
				})
				console.log(`wrote ${displayPath(process.cwd(), result.png)}`)
				if (result.dump) {
					console.log(`wrote ${displayPath(process.cwd(), result.dump)}`)
				}
			}
		)

	program
		.command('dev [entry]')
		.description('Build and run, restarting on file changes')
		.option('--target <target>', 'native or web', 'native')
		.option('--width <px>', 'native window width', '800')
		.option('--height <px>', 'native window height', '600')
		.option('--port <port>', 'web dev port', '4173')
		.action(
			async (
				entry: string | undefined,
				options: {
					target: string
					width: string
					height: string
					port: string
				}
			) => {
				await devApp(process.cwd(), {
					entry,
					target: parseTarget(options.target),
					width: parseSize(options.width, 'width'),
					height: parseSize(options.height, 'height'),
					port: parseSize(options.port, 'port'),
				})
			}
		)

	program
		.command('preview')
		.description('Serve a built web app')
		.option('--dir <path>', 'directory to serve', 'dist/web')
		.option('--port <port>', 'port', '4173')
		.action(async (options: { dir: string; port: string }) => {
			await previewProject(process.cwd(), {
				dir: options.dir,
				port: parseSize(options.port, 'port'),
			})
		})

	return program
}

function parsePlatform(value: string | undefined): Platform | undefined {
	if (value === undefined) return undefined
	if (value === 'native' || value === 'web' || value === 'both') return value
	throw new Error(`unknown platform: ${value} (use native, web, or both)`)
}

function parseStyling(value: string | undefined): Styling | undefined {
	if (value === undefined) return undefined
	if (value === 'default' || value === 'tailwind') return value
	throw new Error(`unknown styling: ${value} (use default or tailwind)`)
}

function parseTemplate(value: string | undefined): Template | undefined {
	if (value === undefined) return undefined
	if (value === 'counter' || value === 'form' || value === 'sheet') return value
	throw new Error(`unknown template: ${value} (use counter, form, or sheet)`)
}

function parsePackageManager(value: string | undefined): PackageManager | undefined {
	if (value === undefined) return undefined
	if (value === 'npm' || value === 'pnpm' || value === 'yarn' || value === 'bun') return value
	throw new Error(`unknown package manager: ${value}`)
}

function parseTarget(value: string): BuildTarget {
	if (value === 'native' || value === 'web') return value
	throw new Error(`--target must be native or web, got ${value}`)
}

function parseSize(value: string, name: string): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`--${name} must be a positive number`)
	}
	return Math.round(parsed)
}

function displayPath(cwd: string, file: string): string {
	const relative = path.relative(cwd, file)
	return relative && !relative.startsWith('..') ? relative : file
}

export async function runCLI(argv = process.argv): Promise<void> {
	const program = createProgram()
	try {
		await program.parseAsync(argv)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error(message)
		process.exitCode = 1
	}
}
