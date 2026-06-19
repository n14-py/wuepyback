// Archivo: utils/r2Storage.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

class R2Storage {
    constructor(opts) {
        this.s3 = new S3Client({
            region: 'auto',
            endpoint: opts.endpoint, // Ej: https://<TU_ACCOUNT_ID>.r2.cloudflarestorage.com
            credentials: {
                accessKeyId: opts.accessKeyId,
                secretAccessKey: opts.secretAccessKey,
            }
        });
        this.bucket = opts.bucket;
        this.publicDomain = opts.publicDomain; // Ej: https://cdn.wuepy.com o tu dominio de R2
    }

    async _handleFile(req, file, cb) {
        try {
            // 1. Generar nombre único
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const filename = file.fieldname + '-' + uniqueSuffix + ext;
            
            // 2. Definir carpeta (Si no se especifica, va a 'uploads')
            const folder = req.uploadFolder || 'uploads'; 
            const fullPath = `${folder}/${filename}`;

            // 3. Convertir el stream a buffer (Multer pasa la imagen como stream)
            const chunks = [];
            for await (const chunk of file.stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // 4. Parámetros para subir a Cloudflare R2
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: fullPath,
                Body: buffer,
                ContentType: file.mimetype,
            });

            // 5. Ejecutar subida
            await this.s3.send(command);

            // 6. Construir la URL pública segura
            let baseUrl = this.publicDomain;
            if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            const publicUrl = `${baseUrl}/${fullPath}`;

            // ÉXITO: Devolvemos los datos a Multer
            cb(null, {
                path: publicUrl, 
                filename: filename,
                r2Path: fullPath // Lo guardamos en la DB por si el usuario decide borrar la imagen luego
            });
        } catch (error) {
            console.error("❌ Error subiendo a Cloudflare R2:", error);
            cb(error);
        }
    }

    async _removeFile(req, file, cb) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                // Usamos fallback a bunnyPath por si borran imágenes viejas que se subieron con el sistema anterior
                Key: file.r2Path || file.bunnyPath 
            });
            await this.s3.send(command);
            cb(null);
        } catch (error) {
            console.error("❌ Error borrando de R2:", error);
            cb(error);
        }
    }
}

module.exports = R2Storage;