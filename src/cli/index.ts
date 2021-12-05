#!/usr/bin/env node
import 'reflect-metadata';
import yargs from 'yargs';

import {
    BuildCommand,
    DevCommand,
} from './commands';

// eslint-disable-next-line no-unused-expressions,@typescript-eslint/no-unused-expressions
yargs
    .scriptName('typeorm-extension')
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1)
    .command(new BuildCommand())
    .command(new DevCommand())
    .strict()
    .alias('v', 'version')
    .help('h')
    .alias('h', 'help')
    .argv;
