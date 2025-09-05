import child_process from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { uploadDir } from '@/api/file-upload';
import { getUploadedFileByImportId, markVideoRendered } from '@/db';

let checkedSetup = false;

const generatorProject = 'r3talks';

export const checkSetup = async (): Promise<void> => {
    const repoPath = process.env.R3VOC_REPO_LOCATION;

    // check if it exists
    if (!repoPath || !fs.existsSync(repoPath)) {
        throw new Error('R3VOC_REPO_LOCATION does not exist or is not defined');
    }

    // make sure scripts/create_video.sh is executable
    const createVideoPath = path.join(repoPath, 'scripts', 'create_video.sh');
    if (!fs.existsSync(createVideoPath)) {
        throw new Error(
            'create_video.sh does not exist in R3VOC_REPO_LOCATION',
        );
    }
    try {
        fs.accessSync(createVideoPath, fs.constants.X_OK);
    } catch {
        throw new Error('create_video.sh is not executable');
    }

    // check if there is a directory called "intro-outro-generator" in it
    const generatorPath = path.join(repoPath, 'intro-outro-generator');
    if (!fs.existsSync(generatorPath)) {
        throw new Error(
            'intro-outro-generator directory does not exist in R3VOC_REPO_LOCATION',
        );
    }

    // it should also contain a r3talks folder
    const r3talksPath = path.join(generatorPath, generatorProject);
    if (!fs.existsSync(r3talksPath)) {
        throw new Error(
            'r3talks directory does not exist in intro-outro-generator',
        );
    }

    // try to run ./make.py --help in that directory using the venv in ./env/bin/python
    const venvPython = path.join(generatorPath, 'env', 'bin', 'python');
    if (!fs.existsSync(venvPython)) {
        throw new Error(
            'Virtual environment python does not exist, please run "virtualenv --python=$(which python3.9) env" in intro-outro-generator directory',
        );
    }

    try {
        child_process.execFileSync(venvPython, ['./make.py', '--help'], {
            cwd: generatorPath,
        });
    } catch {
        throw new Error(
            'Failed to run make.py in intro-outro-generator, please make sure the setup is correct',
        );
    }

    console.log('Setup looks good.');

    checkedSetup = true;
};

export const renderTalkAssets = async ({
    importId,
}: {
    importId: number;
}): Promise<void> => {
    // to render an intro, we use ./make.py r3talks --id <importId>. Also use --skip out in case outro.ts exists
    if (!checkedSetup) {
        await checkSetup();
    }

    const repoPath = process.env.R3VOC_REPO_LOCATION;
    if (!repoPath) {
        throw new Error('R3VOC_REPO_LOCATION is not defined');
    }
    const generatorPath = path.join(repoPath, 'intro-outro-generator');
    const venvPython = path.join(generatorPath, 'env', 'bin', 'python');

    // check if outro.ts exists in the r3talks director
    const outroPath = path.join(generatorPath, generatorProject, 'outro.ts');
    if (!fs.existsSync(outroPath)) {
        console.log('No outro.ts found, rendering it now...');
        try {
            child_process.execFileSync(
                venvPython,
                [
                    './make.py',
                    generatorProject,
                    '--skip',
                    'intro',
                    '--imagemagick',
                ],
                {
                    cwd: generatorPath,
                    stdio: 'inherit',
                },
            );
        } catch (error) {
            console.error('Failed to render outro:', error);
            throw new Error('Failed to render outro');
        }
    }

    try {
        child_process.execFileSync(
            venvPython,
            [
                './make.py',
                generatorProject,
                '--id',
                importId.toString(),
                '--skip',
                'out',
                '--imagemagick',
            ],
            {
                cwd: generatorPath,
                stdio: 'inherit',
            },
        );
    } catch (error) {
        console.error('Failed to render intro:', error);
        throw new Error('Failed to render intro');
    }

    console.log(`Rendered intro for import ID ${importId}`);
};

export const renderTalk = async ({
    importId,
}: {
    importId: number;
}): Promise<void> => {
    // to render an intro, we use ./make.py r3talks --id <importId>. Also use --skip out in case outro.ts exists
    if (!checkedSetup) {
        await checkSetup();
    }

    const repoPath = process.env.R3VOC_REPO_LOCATION;
    if (!repoPath) {
        throw new Error('R3VOC_REPO_LOCATION is not defined');
    }

    const rawVideo = await getUploadedFileByImportId(importId);

    if (!rawVideo?.path) {
        throw new Error(`No uploaded file found for import ID ${importId}`);
    }

    const absRawVideoPath = path.resolve(rawVideo.path);

    if (!fs.existsSync(absRawVideoPath)) {
        throw new Error(
            `Uploaded file does not exist at path ${absRawVideoPath}`,
        );
    }

    await renderTalkAssets({ importId });

    // now run r3voc/scripts/create_video.sh --video_file <path to video> --video_id <importId>
    const scriptsPath = path.join(repoPath, 'scripts', 'create_video.sh');
    const videoPath = path.join(repoPath, 'output', `${importId}_final.mkv`);

    try {
        child_process.execFileSync(
            scriptsPath,
            [
                '--video_file',
                absRawVideoPath,
                '--video_id',
                importId.toString(),
            ],
            {
                cwd: repoPath,
                stdio: 'inherit',
            },
        );
    } catch (error) {
        console.error('Failed to render talk:', error);
        throw new Error('Failed to render talk');
    }

    if (!fs.existsSync(videoPath)) {
        throw new Error('Rendering completed but output video not found');
    }

    await markVideoRendered(importId);

    // move the file to uploads/<guid>/final.mkv
    const finalPath = path.join(uploadDir, rawVideo.importGuid, 'final.mkv');
    fs.renameSync(videoPath, finalPath);

    console.log(`Rendered talk for import ID ${importId}`);
};
