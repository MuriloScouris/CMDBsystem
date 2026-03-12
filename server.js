const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const XLSX = require('xlsx');
const { PDFDocument: PDFLibDoc, rgb: PDFLibRGB } = require('pdf-lib');
const PDFKitDoc = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json()); // Habilita o parsing de JSON no Express
app.use(express.static('public'));

const pool = new Pool({
    user: 'cmdb_admin',
    password: 'cmdb_super_secret_password',
    host: 'localhost',
    database: 'core_cmdb',
    port: 5432,
});

const JIRA_BASE_URL = process.env.JIRA_BASE_URL; // ex: https://seu-dominio.atlassian.net
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY; // ex: IT
const JIRA_ISSUE_TYPE = process.env.JIRA_ISSUE_TYPE || "Task"; // ou "Service Request"

async function openJiraTicket(summary, description) {
    if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
        console.warn('⚠️ Credenciais do Jira ausentes (.env). Pulando criação do chamado.');
        return null;
    }

    try {
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
        const response = await axios.post(`${JIRA_BASE_URL}/rest/servicedeskapi/request`, {
            serviceDeskId: '11', // ID do Service Desk ISD
            requestTypeId: '100', // ID do Request Type "Request new hardware"
            requestFieldValues: {
                summary: summary,
                description: description
            }
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Chamado Jira criado com sucesso: ${response.data.issueKey}`);
        return { key: response.data.issueKey, ...response.data };
    } catch (error) {
        console.error('❌ Erro ao criar chamado no Jira:', error.response ? JSON.stringify(error.response.data) : error.message);
        return null;
    }
}

async function notifyJiraMovement(assetId, movementType, details, oldOwnerName = null, newOwnerName = null) {
    try {
        const assetRes = await pool.query(`
            SELECT a.asset_tag, a.model, a.manufacturer
            FROM inventory_assets a 
            WHERE a.id = $1
        `, [assetId]);

        if (assetRes.rowCount === 0) return;

        const asset = assetRes.rows[0];
        const summary = `Movimentação de Equipamento: ${asset.asset_tag} - ${movementType}`;
        
        
        const now = new Date();
        const formattedDate = now.toLocaleString('pt-BR');

        const description = `*Detalhes da Movimentação do Ativo:*\n\n` +
            `* *Data e Hora da Movimentação:* ${formattedDate}\n` +
            `* *Equipamento:* ${asset.manufacturer || 'N/A'} ${asset.model || 'N/A'} (Tag: ${asset.asset_tag})\n` +
            `* *Tipo de Movimento:* ${movementType}\n` +
            `* *Proprietário Anterior (De):* ${oldOwnerName || 'Estoque'}\n` +
            `* *Novo Proprietário (Para):* ${newOwnerName || 'Estoque / Manutenção'}\n` +
            `* *Motivo:* ${details || 'Não informado'}\n`;

        // GRAVA a intenção na Fila para o Front-end conseguir mostrar no Botão e enviar depois
        await pool.query(`
            INSERT INTO jira_queue (asset_id, summary, description)
            VALUES ($1, $2, $3)
        `, [assetId, summary, description]);
        
    } catch (err) {
        console.error('Erro ao preparar notificação do Jira:', err);
    }
}

// APIs de Leitura (GET)
app.get('/api/jira/queue', async (req, res) => {
    try {
        const result = await pool.query(`SELECT count(*) FROM jira_queue WHERE status = 'PENDING'`);
        res.json({ pendingCount: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/jira/sync', async (req, res) => {
    try {
        const queueRes = await pool.query(`SELECT id, summary, description FROM jira_queue WHERE status = 'PENDING'`);
        const pendingItems = queueRes.rows;
        let successCount = 0;

        for (const item of pendingItems) {
            // openJiraTicket usa os dados do .env e envia via POST (Axios)
            const ticketData = await openJiraTicket(item.summary, item.description);
            
            if (ticketData && ticketData.key) {
                await pool.query(
                    `UPDATE jira_queue SET status = 'CREATED', jira_ticket_key = $1 WHERE id = $2`,
                    [ticketData.key, item.id]
                );
                successCount++;
            }
        }

        res.json({ success: true, created: successCount, total_attempted: pendingItems.length });
    } catch (err) {
        console.error('Erro no sync do Jira:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const total = await pool.query("SELECT count(*) as count FROM inventory_assets WHERE status != 'Deleted'");
        const in_stock = await pool.query("SELECT count(*) as count FROM inventory_assets WHERE status IN ('In_Stock', 'Em estoque')");
        const maintenance = await pool.query("SELECT count(*) as count FROM inventory_assets WHERE status IN ('Maintenance', 'Em Manutencao')");
        const lost = await pool.query("SELECT count(*) as count FROM inventory_assets WHERE status IN ('Lost', 'Perdido', 'Furtado')");

        res.json({
            total: total.rows[0].count,
            in_stock: in_stock.rows[0].count,
            maintenance: maintenance.rows[0].count,
            lost: lost.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id, a.asset_tag, a.model, a.status, a.warranty_expiry, a.type_id,
                   u.name as current_user, u.department
            FROM inventory_assets a
            LEFT JOIN users u ON a.current_user_id = u.id
            WHERE a.status != 'Deleted'
            ORDER BY a.asset_tag ASC;
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/deleted', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id, a.asset_tag, a.model, a.manufacturer,
                   h.assigned_at AS deleted_at, h.justification
            FROM inventory_assets a
            JOIN assignment_history h ON a.id = h.asset_id 
            WHERE a.status = 'Deleted' AND h.movement_type = 'deletion'
            ORDER BY h.assigned_at DESC;
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const assetRes = await pool.query(`
            SELECT a.*, u.name as current_user_name, u.department
            FROM inventory_assets a
            LEFT JOIN users u ON a.current_user_id = u.id
            WHERE a.id = $1
        `, [id]);

        if (assetRes.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

        const historyRes = await pool.query(`
            SELECT h.*, u.name as user_name, u.department
            FROM assignment_history h
            LEFT JOIN users u ON h.user_id = u.id
            WHERE h.asset_id = $1
              AND h.movement_type NOT IN ('deletion')
            ORDER BY h.assigned_at DESC
        `, [id]);

        const maintenanceRes = await pool.query(`
            SELECT * FROM maintenance_logs
            WHERE asset_id = $1
            ORDER BY reported_date DESC
        `, [id]);

        res.json({
            asset: assetRes.rows[0],
            history: historyRes.rows,
            maintenance: maintenanceRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM users ORDER BY name ASC;`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { name, department, email, registration_number } = req.body;

        const result = await pool.query(`
            INSERT INTO users (name, department, email, registration_number)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `, [name, department, email, registration_number]);

        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // unique violation
            return res.status(400).json({ error: 'Email ou Matrícula já utilizados.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const assetsRes = await pool.query(`
            SELECT a.id, a.asset_tag, a.model, t.name as type
            FROM inventory_assets a
            LEFT JOIN asset_types t ON a.type_id = t.id
            WHERE a.current_user_id = $1 AND a.status != 'Deleted'
        `, [id]);

        res.json({
            user: userRes.rows[0],
            assets: assetsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, department, email, registration_number, status } = req.body;

        await pool.query(`
            UPDATE users 
            SET name = $1, department = $2, email = $3, registration_number = $4, status = $5
            WHERE id = $6
        `, [name, department, email, registration_number, status || 'Active', id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/asset-types', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM asset_types ORDER BY name ASC;`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/models', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM hardware_models ORDER BY manufacturer ASC, name ASC;`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------- LICENSES --------------
app.get('/api/licenses', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT sl.*, u.name as assigned_user_name 
            FROM software_licenses sl
            LEFT JOIN users u ON sl.assigned_user_id = u.id
            ORDER BY sl.name ASC;
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/licenses', async (req, res) => {
    try {
        const { name, license_key, monthly_cost, assigned_user_id, purchase_date, expiry_date } = req.body;

        let assignedId = assigned_user_id;
        if (assignedId === '') assignedId = null;

        const result = await pool.query(`
            INSERT INTO software_licenses (name, license_key, monthly_cost, assigned_user_id, purchase_date, expiry_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `, [name, license_key, monthly_cost || null, assignedId, purchase_date || null, expiry_date || null]);

        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------- REPORTS --------------

app.get('/api/reports/user-assets', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, u.name, u.department, u.email,
                COALESCE(
                    json_agg(
                        json_build_object('id', a.id, 'tag', a.asset_tag, 'model', a.model, 'type', t.name)
                    ) FILTER (WHERE a.id IS NOT NULL), 
                    '[]'
                ) as assets,
                '/api/reports/generate-term/' || u.id as generate_term_url
            FROM users u
            LEFT JOIN inventory_assets a ON u.id = a.current_user_id
            LEFT JOIN asset_types t ON a.type_id = t.id
            GROUP BY u.id, u.name, u.department, u.email
            ORDER BY u.name ASC;
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Exportação Completa para Excel
app.get('/api/reports/inventory-export', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.asset_tag as "Tag Patrimônio",
                a.serial_number as "N/S",
                t.name as "Tipo",
                a.manufacturer as "Fabricante",
                a.model as "Modelo",
                a.status as "Status",
                u.name as "Usuário Atual",
                u.department as "Departamento",
                TO_CHAR(a.purchase_date, 'DD/MM/YYYY') as "Data Compra",
                TO_CHAR(a.warranty_expiry, 'DD/MM/YYYY') as "Venc. Garantia"
            FROM inventory_assets a
            LEFT JOIN users u ON a.current_user_id = u.id
            LEFT JOIN asset_types t ON a.type_id = t.id
            WHERE a.status != 'Deleted'
            ORDER BY a.asset_tag ASC;
        `;
        const result = await pool.query(query);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, "Inventário Geral");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Inventario_Quanta_CMDB.xlsx');
        res.send(buf);

    } catch (err) {
        console.error('Erro ao exportar Excel:', err);
        res.status(500).json({ error: err.message });
    }
});

// Geração de Termo de Posse do Zero (PDFKit) - Solução Robusta e Automatizada
app.get('/api/reports/generate-term/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const userRes = await pool.query(`
            SELECT u.*, 
                   json_agg(json_build_object('tag', a.asset_tag, 'model', a.model, 'sn', a.serial_number, 'type', t.name)) as assets
            FROM users u
            LEFT JOIN inventory_assets a ON u.id = a.current_user_id
            LEFT JOIN asset_types t ON a.type_id = t.id
            WHERE u.id = $1
            GROUP BY u.id
        `, [userId]);

        if (userRes.rowCount === 0) return res.status(404).send('Usuário não encontrado');
        const user = userRes.rows[0];

        const doc = new PDFKitDoc({ size: 'A4', margin: 50 });
        const safeFileName = user.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Termo_Posse_${safeFileName}.pdf"`);
        doc.pipe(res);

        // --- CABEÇALHO ---
        doc.fillColor('#1b5f8c').fontSize(16).text('🚀 QUANTA CMDB - SISTEMA DE GESTÃO ITAM', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#333').fontSize(12).text('DECLARAÇÃO DE RECEBIMENTO E RESPONSABILIDADE', { align: 'center', underline: true });
        doc.moveDown(1.5);

        // --- TEXTO LEGAL ---
        doc.fontSize(10).fillColor('#000').text(`Declaro para os devidos fins que recebi da Quanta Previdência os equipamentos descritos abaixo, em perfeitas condições de uso, cedidos a título de empréstimo para uso exclusivo de fins de trabalho, comprometendo-me a zelarem por sua guarda e conservação.`, { align: 'justify' });
        doc.moveDown();
        doc.text(`Estou ciente das normas de segurança da informação e das políticas internas da empresa, assumindo total responsabilidade pelo uso, guarda e devolução dos mesmos.`);
        doc.moveDown(1.5);

        // --- TABELA DE EQUIPAMENTOS ---
        const tableTop = 230;
        doc.fillColor('#1b5f8c').fontSize(11).text('Item', 50, tableTop);
        doc.text('Descrição / Modelo', 100, tableTop);
        doc.text('Patrimônio', 350, tableTop);
        doc.text('Nº de Série', 450, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#ccc').stroke();

        let rowY = tableTop + 25;
        if (user.assets && Array.isArray(user.assets) && user.assets[0].tag) {
            user.assets.forEach((asset, index) => {
                doc.fillColor('#444').fontSize(10);
                doc.text(index + 1, 50, rowY);
                doc.text(`${asset.type} ${asset.model}`, 100, rowY, { width: 240 });
                doc.text(asset.tag, 350, rowY);
                doc.text(asset.sn || 'N/A', 450, rowY);
                rowY += 25;
            });
        } else {
            doc.font('Helvetica-Oblique').text('Nenhum equipamento vinculado a este usuário.', 100, rowY);
            rowY += 25;
        }

        // --- RODAPÉ / ASSINATURAS ---
        const footerY = 650;
        doc.moveTo(50, footerY).lineTo(250, footerY).stroke();
        doc.moveTo(330, footerY).lineTo(530, footerY).stroke();
        
        doc.fillColor('#000').fontSize(10);
        doc.text('Assinatura do Colaborador', 50, footerY + 5, { width: 200, align: 'center' });
        doc.text('TI / Infraestrutura (Quanta)', 330, footerY + 5, { width: 200, align: 'center' });

        doc.moveDown(4);
        doc.fillColor('#666').fontSize(9);
        doc.text(`Colaborador: ${user.name}`, 50);
        doc.text(`Departamento: ${user.department || 'TI'}`);
        doc.text(`Matrícula: ${user.registration_number || '-'}`);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`);

        doc.end();

    } catch (err) {
        console.error('Erro ao gerar Termo PDF:', err);
        res.status(500).json({ error: err.message });
    }
});

// APIs de Escrita (POST)

// 1. Criar novo Ativo (Equipamento genérico)
app.post('/api/assets', async (req, res) => {
    try {
        const { asset_tag, serial_number, type_id, manufacturer, model, purchase_date, status, current_user_id, custom_attributes } = req.body;

        const assetStatus = status || 'In_Stock';
        const userId = (assetStatus === 'Assigned' && current_user_id) ? current_user_id : null;

        const result = await pool.query(`
            INSERT INTO inventory_assets (asset_tag, serial_number, type_id, manufacturer, model, status, purchase_date, current_user_id, custom_attributes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `, [asset_tag, serial_number, type_id, manufacturer, model, assetStatus, purchase_date, userId, custom_attributes || {}]);

        const newId = result.rows[0].id;

        // Se o equipamento já nascer assinado para um usuário, registramos a movimentação inaugural
        if (assetStatus === 'Assigned' && userId) {
            await pool.query(`
                INSERT INTO assignment_history (asset_id, user_id, assigned_by, notes)
                VALUES ($1, $2, 'Admin TI / Sistema', 'Equipamento atribuído no momento do cadastro.')
            `, [newId, userId]);

            await notifyJiraMovement(newId, 'Atribuição Inicial (Cadastro)', 'O equipamento já foi cadastrado sendo atribuído a um usuário.', 'Estoque', userId);
        }

        res.json({ success: true, id: newId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1b. Editar Especificações de um Ativo
app.put('/api/assets/:id/specs', async (req, res) => {
    try {
        const { id } = req.params;
        const { manufacturer, model, serial_number, custom_attributes } = req.body;

        await pool.query(`
            UPDATE inventory_assets
            SET manufacturer = COALESCE(NULLIF($1, ''), manufacturer),
                model = COALESCE(NULLIF($2, ''), model),
                serial_number = COALESCE(NULLIF($3, ''), serial_number),
                custom_attributes = $4
            WHERE id = $5
        `, [manufacturer, model, serial_number, JSON.stringify(custom_attributes || {}), id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao atualizar specs', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Criar Nova Categoria de Equipamento
app.post('/api/asset-types', async (req, res) => {
    try {
        const { name, category } = req.body;

        const result = await pool.query(`
            INSERT INTO asset_types (name, category)
            VALUES ($1, $2)
            RETURNING id;
        `, [name, category || 'EUC']);

        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2c. Excluir Categoria de Equipamento
app.delete('/api/asset-types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verifica se há equipamentos vinculados à categoria
        const checkRes = await pool.query(`SELECT count(*) as count FROM inventory_assets WHERE type_id = $1`, [id]);
        if (checkRes.rows[0].count > 0) {
            return res.status(400).json({ error: 'Não é possível excluir esta categoria pois ela possui equipamentos vinculados. Altere os equipamentos primeiro e tente novamente.'});
        }
        
        const result = await pool.query(`DELETE FROM asset_types WHERE id = $1 RETURNING id`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada.' });
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2b. Criar Novo Modelo de Equipamento
app.post('/api/models', async (req, res) => {
    try {
        const { manufacturer, name, cpu, ram, storage } = req.body;

        const result = await pool.query(`
            INSERT INTO hardware_models (manufacturer, name, cpu, ram, storage)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `, [manufacturer, name, cpu, ram, storage]);

        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Devolver Equipamento para o Estoque (Reclaim)
app.post('/api/assets/:id/return', async (req, res) => {
    try {
        const { id } = req.params;
        const { justification } = req.body;

        // 1. Busca o usuário atual ANTES de remover (para registrar no histórico)
        const ownerRes = await pool.query(`
            SELECT a.current_user_id, u.name as owner_name
            FROM inventory_assets a
            LEFT JOIN users u ON a.current_user_id = u.id
            WHERE a.id = $1
        `, [id]);
        const oldUserId  = ownerRes.rows[0]?.current_user_id || null;
        const oldOwnerName = ownerRes.rows[0]?.owner_name || 'Estoque';

        // 2. Fecha o registro ativo do usuário anterior
        await pool.query(`
            UPDATE assignment_history
            SET returned_at = CURRENT_TIMESTAMP,
                condition_on_return = 'Devolvido para o Estoque'
            WHERE asset_id = $1 AND returned_at IS NULL
        `, [id]);

        // 3. Insere novo evento de devolução na timeline (aparece como "Movimentação ao Estoque")
        await pool.query(`
            INSERT INTO assignment_history
                (asset_id, user_id, previous_user_id, justification, movement_type, assigned_by)
            VALUES ($1, NULL, $2, $3, 'return', 'Admin TI / Sistema')
        `, [id, oldUserId, justification || 'Sem justificativa']);

        // 4. Atualiza o ativo: remove usuário e muda status para In_Stock
        await pool.query(`
            UPDATE inventory_assets
            SET current_user_id = NULL, status = 'In_Stock'
            WHERE id = $1
        `, [id]);

        await notifyJiraMovement(id, 'Devolução para Estoque', justification || 'Sem justificativa', oldOwnerName, 'Estoque');

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Transferir / Alterar Status de um ativo (movimentação formal)
app.post('/api/assets/:id/transfer', async (req, res) => {
    try {
        const { id } = req.params;
        const { new_user_id, new_status, ticket_number, justification } = req.body;

        if (!justification || justification.trim() === '') {
            return res.status(400).json({ error: 'Justificativa é obrigatória.' });
        }

        // Busca dados atuais do ativo
        const assetRes = await pool.query(`SELECT current_user_id, status FROM inventory_assets WHERE id = $1`, [id]);
        if (assetRes.rowCount === 0) {
            return res.status(404).json({ error: 'Ativo não encontrado.' });
        }
        const oldUserId = assetRes.rows[0].current_user_id;
        const oldStatus = assetRes.rows[0].status;

        // Atualiza o ativo
        await pool.query(`
            UPDATE inventory_assets
            SET current_user_id = $1, status = $2
            WHERE id = $3
        `, [new_user_id || null, new_status, id]);

        // Fecha registro ativo anterior (se existir)
        await pool.query(`
            UPDATE assignment_history
            SET returned_at = CURRENT_TIMESTAMP
            WHERE asset_id = $1 AND returned_at IS NULL
        `, [id]);

        // Insere novo registro de movimentação
        await pool.query(`
            INSERT INTO assignment_history (
                asset_id, user_id, previous_user_id, ticket_number, justification, movement_type, assigned_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 'Admin TI / Sistema'
            )
        `, [
            id,
            new_user_id || null,
            oldUserId,
            ticket_number || null,
            justification,
            (new_status === 'In_Stock' ? 'return' : 'transfer')
        ]);

        const newOwnerRes = new_user_id ? await pool.query(`SELECT name FROM users WHERE id = $1`, [new_user_id]) : null;
        const newOwnerName = newOwnerRes ? newOwnerRes.rows[0].name : 'Estoque';
        const oldOwnerRes = oldUserId ? await pool.query(`SELECT name FROM users WHERE id = $1`, [oldUserId]) : null;
        const oldOwnerName = oldOwnerRes ? oldOwnerRes.rows[0].name : 'Estoque';

        const finalReason = ticket_number ? justification + ` (Chamado Vinculado: ${ticket_number})` : justification;

        await notifyJiraMovement(id, 'Transferência de Ativo', finalReason, oldOwnerName, newOwnerName);

        res.json({ success: true });
    } catch (err) {
        console.error('Erro na transferência de ativo', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Mover ativo para manutenção e abrir chamado
app.post('/api/assets/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const { issue_type, description, ticket_number } = req.body;

        if (!description || description.trim() === '') {
            return res.status(400).json({ error: 'Descrição do problema é obrigatória.' });
        }

        const validIssueTypes = ['Hardware Failure', 'Software Issue', 'Upgrade', 'Routine Check'];
        const issueTypeToUse = validIssueTypes.includes(issue_type) ? issue_type : 'Hardware Failure';

        // Fecha registro ativo do usuário anterior (se existir) dizendo que foi para manutenção
        await pool.query(`
            UPDATE assignment_history
            SET returned_at = CURRENT_TIMESTAMP, condition_on_return = 'Enviado para Manutenção'
            WHERE asset_id = $1 AND returned_at IS NULL
        `, [id]);

        // Atualiza o ativo para Maintenance e remove proprietário (pois foi para TI)
        await pool.query(`
            UPDATE inventory_assets
            SET current_user_id = NULL, status = 'Maintenance'
            WHERE id = $1
        `, [id]);

        // Insere na tabela de manutenção
        await pool.query(`
            INSERT INTO maintenance_logs (
                asset_id, issue_type, description, resolution_notes
            ) VALUES (
                $1, $2, $3, $4
            )
        `, [id, issueTypeToUse, description, ticket_number ? `Chamado vinculado: ${ticket_number}` : null]);

        const assetRes = await pool.query(`SELECT u.name FROM inventory_assets a LEFT JOIN users u ON a.current_user_id = u.id WHERE a.id = $1`, [id]);
        const oldOwnerName = assetRes.rows[0]?.name || 'Estoque';

        await notifyJiraMovement(id, 'Envio para Manutenção', description, oldOwnerName, 'Manutenção');

        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao abrir manutenção', err);
        res.status(500).json({ error: err.message });
    }
});

// 4b. Resolver Chamado de Manutenção
app.put('/api/maintenance/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes, new_asset_status } = req.body;

        if (!resolution_notes || resolution_notes.trim() === '') {
            return res.status(400).json({ error: 'Notas de resolução são obrigatórias.' });
        }

        // Busca o asset_id ligado a este chamado
        const mRes = await pool.query(`SELECT asset_id FROM maintenance_logs WHERE id = $1`, [id]);
        if (mRes.rows.length === 0) return res.status(404).json({ error: 'Chamado não encontrado.' });
        const assetId = mRes.rows[0].asset_id;

        // Marca o chamado como resolvido
        await pool.query(`
            UPDATE maintenance_logs
            SET resolution_notes = $1, resolved_date = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [resolution_notes, id]);

        // Atualiza o status operacional do ativo
        if (new_asset_status) {
            await pool.query(`
                UPDATE inventory_assets SET status = $1 WHERE id = $2
            `, [new_asset_status, assetId]);

            // Se voltou ao estoque, remove o usuário atual
            if (new_asset_status === 'In_Stock') {
                await pool.query(`UPDATE inventory_assets SET current_user_id = NULL WHERE id = $1`, [assetId]);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao resolver manutenção', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Excluir Ativo (Soft Delete com Justificativa)
app.delete('/api/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { justification } = req.body;

        if (!justification || justification.trim() === '') {
            return res.status(400).json({ error: 'Justificativa é obrigatória para exclusão.' });
        }

        // Verifica se o ativo existe
        const assetRes = await pool.query(`SELECT current_user_id FROM inventory_assets WHERE id = $1`, [id]);
        if (assetRes.rowCount === 0) {
            return res.status(404).json({ error: 'Ativo não encontrado.' });
        }
        const oldUserId = assetRes.rows[0].current_user_id;

        // Fecha registro ativo do usuário anterior (se existir)
        await pool.query(`
            UPDATE assignment_history
            SET returned_at = CURRENT_TIMESTAMP, condition_on_return = 'Equipamento Excluído'
            WHERE asset_id = $1 AND returned_at IS NULL
        `, [id]);

        // Insere na tabela de histórico a justificativa da exclusão
        await pool.query(`
            INSERT INTO assignment_history (
                asset_id, user_id, previous_user_id, justification, movement_type, assigned_by, notes
            ) VALUES (
                $1, NULL, $2, $3, 'deletion', 'Admin TI / Sistema', 'Exclusão Lógica do Equipamento'
            )
        `, [id, oldUserId, justification]);

        // Atualiza o ativo para Deleted
        await pool.query(`
            UPDATE inventory_assets
            SET current_user_id = NULL, status = 'Deleted'
            WHERE id = $1
        `, [id]);

        const oldOwnerRes = oldUserId ? await pool.query(`SELECT name FROM users WHERE id = $1`, [oldUserId]) : null;
        const oldOwnerName = oldOwnerRes ? oldOwnerRes.rows[0].name : 'Estoque';

        await notifyJiraMovement(id, 'Exclusão Lógica / Baixa', justification, oldOwnerName, 'Baixado');

        res.json({ success: true });
    } catch (err) {
        console.error('Erro na exclusão de ativo', err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Restaurar Ativo Excluído
app.post('/api/assets/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;

        const check = await pool.query(`SELECT status, asset_tag FROM inventory_assets WHERE id = $1`, [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Equipamento não encontrado.' });
        if (check.rows[0].status !== 'Deleted') return res.status(400).json({ error: 'Este equipamento não está excluído.' });

        // Restaura o ativo para o estoque
        await pool.query(`
            UPDATE inventory_assets
            SET status = 'In_Stock', current_user_id = NULL
            WHERE id = $1
        `, [id]);

        // Registra a restauração no histórico
        await pool.query(`
            INSERT INTO assignment_history
                (asset_id, user_id, previous_user_id, justification, movement_type, assigned_by)
            VALUES ($1, NULL, NULL, 'Restaurado ao inventário pelo administrador', 'return', 'Admin TI / Sistema')
        `, [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao restaurar ativo', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n ====================================== `);
    console.log(`✅ Backend and UI Started!`);
    console.log(`🚀 Access your Custom CMDB at: http://localhost:${PORT}`);
    console.log(`======================================\n`);
});
