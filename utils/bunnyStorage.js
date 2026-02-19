const https = require('https');
const path = require('path');

class BunnyStorage {
    constructor(opts) {
        this.storageZone = opts.storageZone;
        this.accessKey = opts.accessKey;
        this.pullZone = opts.pullZone;
    }

    _handleFile(req, file, cb) {
        // 1. Generar nombre único
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = file.fieldname + '-' + uniqueSuffix + ext;
        
        // 2. Definir carpeta (Si no se especifica, va a 'uploads')
        const folder = req.bunnyFolder || 'uploads'; 
        const fullPath = `${folder}/${filename}`;

        // 3. CONSTRUCCIÓN DE LA URL SEGURA (HTTPS)
        let baseUrl = this.pullZone;
        if (!baseUrl.startsWith('http')) {
            baseUrl = `https://${baseUrl}`; // Forzamos HTTPS
        }
        // Quitamos la barra final si existe para no duplicarla
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        const publicUrl = `${baseUrl}/${fullPath}`;

        // 4. Configurar Cabeceras con Seguridad
        const headers = {
            'AccessKey': this.accessKey,
            'Content-Type': 'application/octet-stream' 
        };

        // ¡CORRECCIÓN CRÍTICA!: Solo enviamos Content-Length si existe
        if (file.size) {
            headers['Content-Length'] = file.size;
        }

        const options = {
            hostname: 'br.storage.bunnycdn.com', // Tu zona regional
            path: `/${this.storageZone}/${fullPath}`,
            method: 'PUT',
            headers: headers
        };

        // 5. Realizar la subida
        const uploadRequest = https.request(options, (res) => {
            if (res.statusCode === 201 || res.statusCode === 200) {
                // ÉXITO
                cb(null, {
                    path: publicUrl, // URL pública correcta para MongoDB
                    filename: filename,
                    bunnyPath: fullPath
                });
            } else {
                console.error(`Error BunnyCDN: ${res.statusCode} - ${res.statusMessage}`);
                res.resume(); 
                cb(new Error(`Error subiendo a BunnyCDN: ${res.statusCode}`));
            }
        });

        uploadRequest.on('error', (err) => cb(err));
        
        // Enviamos el archivo
        file.stream.pipe(uploadRequest);
    }

    _removeFile(req, file, cb) {
        const options = {
            hostname: 'br.storage.bunnycdn.com',
            path: `/${this.storageZone}/${file.bunnyPath}`,
            method: 'DELETE',
            headers: { 'AccessKey': this.accessKey }
        };
        const deleteReq = https.request(options, () => cb(null));
        deleteReq.on('error', cb);
        deleteReq.end();
    }
}

module.exports = BunnyStorage;