#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { getDirname} from "cross-dirname";

const __dirname = getDirname();
const debug = process.argv.includes('debug') || process.argv.includes('--inspect');

async function findElectronExecutable() {
    const relativePaths = [
        'node_modules/electron/dist/electron',
        '../electron/dist/electron'
    ];
    for (const relativePath of relativePaths) {
        const fullPath = path.resolve(__dirname, relativePath);
        const executable = process.platform === 'win32' ? `${fullPath}.exe` : fullPath;
        try {
            await fs.promises.access(executable, fs.constants.F_OK);
            return executable;
        } catch (error) { }
    }
    // Check environment variable
    const environmentPath = process.env.ELECTRON_PATH;
    if (environmentPath) {
        try {
            await fs.promises.access(environmentPath, fs.constants.F_OK);
            return environmentPath;
        }
        catch (error) { }
    }
    // Check global NPM installation directory
    const npmGlobalPrefix = process.env.npm_global_prefix;
    if (npmGlobalPrefix) {
        const globalExecutable = path.resolve(npmGlobalPrefix, 'electron/electron');
        const globalExecutableWithExtension = process.platform === 'win32' ? `${globalExecutable}.exe` : globalExecutable;
        try {
            await fs.promises.access(globalExecutableWithExtension, fs.constants.F_OK);
            return globalExecutableWithExtension;
        }
        catch (error) { }
    }
    // Default return if not found
    return null;
}
findElectronExecutable().then(electronPath => {
    if (electronPath) {
        const params = []
        if(debug) {
            params.push(...[
                '--inspect',
                '--enable-logging=stderr',
                '--trace-warnings',
                '--remote-debugging-port=9222'
            ])
        }
        params.push(path.join(__dirname, 'www/nodejs/dist/main.js'));
        const opts = debug ? {} : {
            detached: true,
            stdio: 'ignore',
        };
        const child = spawn(electronPath, params, opts);
        if(debug) {                
            child.stdout.on('data', (data) => {
                process.stdout.write(data);
            });
            child.stderr.on('data', (data) => {
                process.stderr.write(data);
            });
            child.on('error', (error) => {
                console.error(error);
            });
            child.once('close', (code) => {
                console.log('exitcode: ' + code);
                process.exit(code);
            });
            return;
        } else {
            child.unref();
        }
    } else {
        console.error('Electron executable not found. Use \'npm i electron@9.1.2\' to install it.');
    }
    process.exit(0);
}).catch(console.error);
