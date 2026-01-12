/**
 * Vercel Serverless Function - 上传录音文件
 * 路径: /api/upload-audio
 * 接收前端上传的录音文件，临时保存并返回文件标识
 */

export const config = {
    api: {
        bodyParser: false, // 禁用默认的 body parser，使用自定义处理
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const busboy = require('busboy');
        const chunks = [];
        let filename = '';
        let mimetype = '';

        const bb = busboy({ headers: req.headers });

        bb.on('file', (fieldname, file, info) => {
            filename = info.filename;
            mimetype = info.mimeType;
            
            file.on('data', (data) => {
                chunks.push(data);
            });
        });

        bb.on('finish', () => {
            const buffer = Buffer.concat(chunks);
            
            // 将文件转换为 base64 返回给前端
            const base64 = buffer.toString('base64');
            
            res.json({
                success: true,
                message: '录音文件上传成功',
                data: {
                    filename,
                    mimetype,
                    size: buffer.length,
                    base64 // 返回 base64 编码的文件内容
                }
            });
        });

        bb.on('error', (error) => {
            console.error('❌ 文件上传失败:', error);
            res.status(500).json({
                success: false,
                message: '文件上传失败: ' + error.message
            });
        });

        req.pipe(bb);

    } catch (error) {
        console.error('❌ 处理上传请求失败:', error);
        res.status(500).json({
            success: false,
            message: '处理上传请求失败: ' + error.message
        });
    }
}
