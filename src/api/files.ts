import express from 'express';

import type { ApiResponse } from '@/api/types';
import type { DbUploadedFile } from '@/db';
import { getUploadedFiles } from '@/db';

const filesRouter = express.Router();

filesRouter.get(
    '/list',
    async (req, res: express.Response<ApiResponse<DbUploadedFile[]>>) => {
        // list all files in the uploads directory
        const files = await getUploadedFiles();
        res.json({ success: true, data: files });
    },
);

export default filesRouter;
