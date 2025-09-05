import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

import { addUploadedFile } from '@/db';
import { getEventByGuid } from '@/schedule-cache';

export const uploadDir = 'uploads/';

const uploadRouter = express.Router();

const GIGABYTE = 1024 * 1024 * 1024;

const MAX_FILE_SIZE = 5 * GIGABYTE; // 5 GB

const upload = multer({
    dest: path.join(uploadDir, 'tmp'),
    limits: { fileSize: MAX_FILE_SIZE },
});

// there is a file field named "file" and a guid field named "guid" in the same request
uploadRouter.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({
            success: false,
            error: 'No file was uploaded.',
        });
        return;
    }

    const file = req.file as Express.Multer.File;
    const guid = req.body.guid as string | unknown;

    if (!guid || typeof guid !== 'string') {
        // delete the uploaded file
        fs.unlinkSync(file.path);
        res.status(400).json({
            success: false,
            error: 'Please provide a valid GUID.',
        });
        return;
    }

    const event = getEventByGuid(guid);

    if (!event) {
        // delete the uploaded file
        fs.unlinkSync(file.path);
        res.status(400).json({
            success: false,
            error: 'This GUID does not exist in the schedule. Please create the event first in the import tool.',
        });
        return;
    }

    const thisUploadDir = path.join(uploadDir, guid);
    const uploadPath = path.join(thisUploadDir, file.originalname);

    // make sure the resolved path is within the uploads directory
    const resolvedPath = path.resolve(uploadPath);
    const resolvedUploadsDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        // delete the uploaded file
        fs.unlinkSync(file.path);
        res.status(400).json({
            success: false,
            error: 'Invalid file path.',
        });
        return;
    }

    // make sure the target path does not already exist
    if (fs.existsSync(uploadPath)) {
        // delete the uploaded file
        fs.unlinkSync(file.path);
        res.status(400).json({
            success: false,
            error: 'File already exists.',
        });
        return;
    }

    // create the target directory if it does not exist
    fs.mkdirSync(thisUploadDir, { recursive: true });

    await addUploadedFile({
        filepath: uploadPath,
        importGuid: guid,
        // eslint-disable-next-line deprecation/deprecation
        importId: event.id,
    });

    // move the file to the target location
    fs.rename(file.path, uploadPath, err => {
        if (err) {
            console.error('File upload error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to upload file.',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                filename: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
            },
        });
    });
});

export default uploadRouter;
