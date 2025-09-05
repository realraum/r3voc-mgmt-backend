import express from 'express';

import { renderTalk } from '@/intro-outro-generator-api';

const talksRouter = express.Router();

talksRouter.post('/render', async (req, res) => {
    const { importId } = req.body;

    if (!importId || typeof importId !== 'number') {
        res.status(400).json({
            success: false,
            error: 'Please provide a valid importId.',
        });
        return;
    }

    try {
        await renderTalk({ importId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error rendering talk:', error);
        res.status(500).json({
            success: false,
            error: `Failed to render talk, ${(error as Error).message}`,
        });
    }
});

export default talksRouter;
