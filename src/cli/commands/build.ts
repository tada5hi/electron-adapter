import { Arguments, Argv, CommandModule } from 'yargs';
import path from 'path';
import { SpawnSyncOptions } from 'child_process';
import spawn from 'cross-spawn';
import fs from 'fs-extra';
import webpack from 'webpack';
import { useElectronAdapterConfig } from '../../config';
import {
    clearRendererBuilds,
    runRendererBuildCommand,
} from '../../renderer';
import { buildEntrypointWebpackConfig } from '../../entrypoint';

export interface BuildArguments extends Arguments {
    root: string;
    flags: string[];
    config: string | 'electron-builder.yml';
}

export class BuildCommand implements CommandModule {
    command = 'build';

    describe = 'Build application for production.';

    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to your project root directory.',
            })
            .option('flags', {
                type: 'array',
                alias: 'f',
                default: [],
                describe: 'Specify platform(s) and architecture(s) to build the application for.',
                choices: ['all', 'mac', 'win', 'linux', 'ia32', 'x64', 'armv7l', 'arm64'],
            })
            .option('config', {
                alias: 'c',
                default: 'electron-builder.yml',
                describe: 'Name of the electron-builder configuration file.',
            });
    }

    async handler(raw: Arguments) {
        const args : BuildArguments = raw as BuildArguments;
        const builderArgs : string[] = [];

        // Project directory
        const rootPath = args.root || process.cwd();
        builderArgs.push(...['--project', rootPath]);

        // Config
        const config = useElectronAdapterConfig(rootPath);

        const configFileName = args.config || 'electron-builder.yml';
        builderArgs.push(...['--config', configFileName]);

        // Flags
        const flagsMapped = args.flags.map((flag) => `--${flag}`);
        builderArgs.push(...flagsMapped);

        // Clear old build data
        fs.removeSync(path.join(rootPath, config.entrypointDirectory, 'dist'));
        fs.removeSync(path.join(rootPath, config.buildDirectory));

        // Clear old renderer data
        clearRendererBuilds(config);

        // build renderer output
        runRendererBuildCommand(config);

        const spawnOptions: SpawnSyncOptions = {
            cwd: rootPath,
            stdio: 'inherit',
        };

        const compiler = webpack(buildEntrypointWebpackConfig('production', rootPath));

        await new Promise(((resolve, reject) => {
            compiler.run((err: Error, stats: webpack.Stats) => {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.error(err.stack || err);
                    reject(err);
                }
                if (stats.hasErrors()) {
                    // eslint-disable-next-line no-console
                    console.error(stats.toString());
                    reject(stats);
                }

                resolve(stats);
            });
        }));

        spawn.sync('electron-builder', builderArgs, spawnOptions);
    }
}
