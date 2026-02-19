// services/agentAuthState.js
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');

/**
 * --- GESTOR DE SESIONES WHATSAPP MULTI-TENANT (MONGO DB) ---
 * VERSIÓN FINAL: CORRECCIÓN DE PUNTOS Y BATCH
 * Soluciona el error silencioso donde el segundo mensaje no se responde
 * debido a que MongoDB anida las claves que contienen puntos (.).
 */
const useMongoDBAuthState = async (collection, sessionId) => {
    
    const documentId = `session_${sessionId}`;

    // --- HELPERS DE FORMATO ---
    
    // Transforma Buffers a JSON seguro
    const toJSON = (data) => JSON.parse(JSON.stringify(data, BufferJSON.replacer));
    
    // Transforma JSON a Buffers
    const fromJSON = (data) => JSON.parse(JSON.stringify(data), BufferJSON.reviver);

    // 🔥 LA CURA DEL PROBLEMA: Reemplazar puntos prohibidos en claves de Mongo
    // WhatsApp usa IDs como '123@s.whatsapp.net'. El punto rompe Mongo.
    // Lo convertimos a '123@s_DOT_whatsapp_DOT_net'
    const makeKey = (category, id) => {
        const safeId = id.replace(/\./g, '_DOT_');
        return `${category}-${safeId}`;
    };

    // ==================================================================
    // 1. CARGA INICIAL
    // ==================================================================
    const result = await collection.findOne({ _id: documentId });
    const creds = result?.creds ? fromJSON(result.creds) : initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                // ==========================================================
                // RECUPERAR LLAVES (GET)
                // ==========================================================
                get: async (type, ids) => {
                    const data = {};
                    const doc = await collection.findOne({ _id: documentId });
                    
                    if (!doc) return data;

                    ids.forEach((id) => {
                        // Usamos la función makeKey para buscar la versión segura (sin puntos)
                        const mongoKey = makeKey(type, id);
                        const value = doc[mongoKey];
                        
                        if (value) {
                            let decoded = fromJSON(value);
                            if (type === 'app-state-sync-key') {
                                decoded = proto.Message.AppStateSyncKeyData.fromObject(decoded);
                            }
                            data[id] = decoded;
                        }
                    });
                    
                    return data;
                },

                // ==========================================================
                // GUARDAR LLAVES (SET)
                // ==========================================================
                set: async (data) => {
                    const sets = {};
                    const unsets = {};

                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            // Aquí transformamos el ID para que sea seguro guardar en Mongo
                            const mongoKey = makeKey(category, id);
                            
                            if (value) {
                                sets[mongoKey] = toJSON(value);
                            } else {
                                unsets[mongoKey] = "";
                            }
                        }
                    }

                    const updateOps = {};
                    if (Object.keys(sets).length > 0) updateOps.$set = sets;
                    if (Object.keys(unsets).length > 0) updateOps.$unset = unsets;

                    if (Object.keys(updateOps).length > 0) {
                        await collection.updateOne(
                            { _id: documentId },
                            updateOps,
                            { upsert: true }
                        );
                    }
                }
            }
        },
        saveCreds: async () => {
            await collection.updateOne(
                { _id: documentId },
                { $set: { creds: toJSON(creds) } },
                { upsert: true }
            );
        },
        clearCreds: async () => {
            await collection.deleteOne({ _id: documentId });
            console.log(`🗑️ Sesión eliminada: ${sessionId}`);
        }
    };
};

module.exports = { useMongoDBAuthState };