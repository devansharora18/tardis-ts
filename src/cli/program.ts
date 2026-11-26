import path from 'node:path'
import { Command } from 'commander'
import { buildApp } from './commands/build'
import { devApp } from './commands/dev'
import { initProject } from './commands/init'
import { runApp } from './commands/run'
import { screenshotApp } from './commands/screenshot'
import { formatBytes } from './lib/fs'

export function createProgram(): Command {
	const program = new Command()
	program.name('tardis').description('TSX-native UI framework with a Rust renderer')

	program
		.command('init')
		.description('Create a starter app in the current directory')
		.action(async () => {
			await initProject(process.cwd())
		})

	program
		.command('build [entry]')
		.description('Bundle a TSX app for the native runtime')
		.option('--out <path>', 'output bundle', 'dist/app.js')
		.option('--minify', 'minify the bundle')
		.action(async (entry: string | undefined, options: { out: string; minify?: boolean }) => {
			const result = await buildApp(process.cwd(), {
				entry,
				out: options.out,
				minify: options.minify,
			})
			console.log(
				`built ${path.relative(process.cwd(), result.outfile)} (${formatBytes(result.bytes)})`
			)
		})

	program
		.command('run [entry]')
		.description('Build and open the native window')
		.option('--width <px>', 'window width', '800')
		.option('--height <px>', 'window height', '600')
		.action(
			async (
				entry: string | undefined,
				options: { width: string; height: string }
			) => {
				const code = await runApp(process.cwd(), {
					entry,
					width: parseSize(options.width, 'width'),
					height: parseSize(options.height, 'height'),
				})
				if (code !== 0) process.exitCode = code
			}
		)

	program
		.command('screenshot [entry]')
		.description('Render one frame headlessly to a PNG')
		.option('-o, --out <path>', 'PNG output', 'screenshot.png')
		.option('--dump <path>', 'write the laid-out scene as JSON')
		.option('--width <px>', 'viewport width', '800')
		.option('--height <px>', 'viewport height', '600')
		.action(
			async (
				entry: string | undefined,
				options: {
					out: string
					dump?: string
					width: string
					height: string
				}
			) => {
				const result = await screenshotApp(process.cwd(), {
					entry,
					out: options.out,
					dump: options.dump,
					width: parseSize(options.width, 'width'),
					height: parseSize(options.height, 'height'),
				})
				console.log(`wrote ${path.relative(process.cwd(), result.png)}`)
				if (result.dump) {
					console.log(`wrote ${path.relative(process.cwd(), result.dump)}`)
				}
			}
		)

	program
		.command('dev [entry]')
		.description('Build, run, and restart on file changes')
		.option('--width <px>', 'window width', '800')
		.option('--height <px>', 'window height', '600')
		.action(
			async (
				entry: string | undefined,
				options: { width: string; height: string }
			) => {
				await devApp(process.cwd(), {
					entry,
					width: parseSize(options.width, 'width'),
					height: parseSize(options.height, 'height'),
				})
			}
		)

	return program
}

function parseSize(value: string, name: string): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`--${name} must be a positive number`)
	}
	return Math.round(parsed)
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
